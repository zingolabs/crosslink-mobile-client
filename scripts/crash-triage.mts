import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

type Config = { url: string; readToken: string; writeToken: string };
type QueueRow = {
  fingerprint: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  buildId: string;
  stackClean: string;
  platforms: Record<string, number>;
  versions: Record<string, number>;
  triagedAt: number | null;
  prUrl: string | null;
};
type ViewRow = QueueRow & {
  message: string;
  firstSample: unknown;
  latestSample: unknown;
  note: string | null;
};
type CacheEntry = { etag: string; body: string };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STATE_DIR = join(ROOT, '.crash-triage');
const CONFIG_FILE = join(STATE_DIR, 'config.json');
const CACHE_FILE = join(STATE_DIR, 'cache.json');
const MAX_LIMIT = 500;

const readJson = <T,>(file: string, fallback: T): T => {
  if (!existsSync(file)) {
    return fallback;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (file: string, value: unknown): void => {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

const loadConfig = (): Config => {
  const stored = readJson<Partial<Config>>(CONFIG_FILE, {});
  const url = (process.env.REPORT_URL ?? stored.url ?? '').replace(/\/+$/, '');
  const readToken = process.env.READ_TOKEN ?? stored.readToken ?? '';
  const writeToken = process.env.WRITE_TOKEN ?? stored.writeToken ?? '';
  if (!url) {
    fail('no REPORT_URL; run `crash-triage config` or set REPORT_URL');
  }
  return { url, readToken, writeToken };
};

function fail(message: string, code = 1): never {
  process.stderr.write(`crash-triage: ${message}\n`);
  process.exit(code);
}

const serverMessage = async (res: Response): Promise<string> => {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as { error?: string };
    return parsed.error ?? text;
  } catch {
    return text || res.statusText;
  }
};

const getJson = async <T,>(
  path: string,
  params: Record<string, string>,
): Promise<T> => {
  const cfg = loadConfig();
  if (!cfg.readToken) {
    fail('no READ_TOKEN; run `crash-triage config` or set READ_TOKEN');
  }
  const search = new URLSearchParams({ key: cfg.readToken, ...params });
  const url = `${cfg.url}${path}?${search}`;
  const cache = readJson<Record<string, CacheEntry>>(CACHE_FILE, {});
  const cached = cache[url];
  const headers: Record<string, string> = {};
  if (cached) {
    headers['if-none-match'] = cached.etag;
  }
  const res = await fetch(url, { headers });
  if (res.status === 304 && cached) {
    return JSON.parse(cached.body) as T;
  }
  if (!res.ok) {
    fail(
      `${res.status} ${await serverMessage(res)}`,
      res.status === 403 ? 3 : 2,
    );
  }
  const body = await res.text();
  const etag = res.headers.get('etag');
  if (etag) {
    cache[url] = { etag, body };
    writeJson(CACHE_FILE, cache);
  }
  return JSON.parse(body) as T;
};

const parseArgs = (
  argv: string[],
): { positional: string[]; flags: Record<string, string | true> } => {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[name] = next;
      i += 1;
    } else {
      flags[name] = true;
    }
  }
  return { positional, flags };
};

const text = (value: string | true | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const print = (value: unknown): void => {
  stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

const pageUrl = (fingerprint: string): string => {
  const cfg = loadConfig();
  return `${cfg.url}/r/${fingerprint}?key=${cfg.readToken}`;
};

const assertFingerprint = (value: string | undefined): string => {
  if (!value || !/^[0-9a-f]{64}$/i.test(value)) {
    fail('fingerprint must be a 64-char hex sha-256');
  }
  return value.toLowerCase();
};

const queue = async (flags: Record<string, string | true>): Promise<void> => {
  const params: Record<string, string> = { untriaged: flags.all ? '0' : '1' };
  const since = text(flags.since);
  const build = text(flags.build);
  if (since) {
    params.since = since;
  }
  if (build) {
    params.buildId = build;
  }
  print(await getJson<QueueRow[]>('/queue', params));
};

const findRow = async <T extends QueueRow>(
  path: string,
  fingerprint: string,
): Promise<T> => {
  const rows = await getJson<T[]>(path, {
    untriaged: '0',
    limit: String(MAX_LIMIT),
  });
  const row = rows.find(r => r.fingerprint === fingerprint);
  if (!row) {
    fail(`404 unknown fingerprint ${fingerprint}`, 2);
  }
  return row;
};

const show = async (
  positional: string[],
  flags: Record<string, string | true>,
): Promise<void> => {
  const fingerprint = assertFingerprint(positional[0]);
  const row = await findRow<QueueRow>('/queue', fingerprint);
  print({ ...row, pageUrl: pageUrl(fingerprint) });
  if (!flags.unsafe) {
    return;
  }
  const full = await findRow<ViewRow>('/view', fingerprint);
  const untrusted = {
    message: full.message,
    note: full.note,
    firstSample: full.firstSample,
    latestSample: full.latestSample,
  };
  stdout.write('\n```UNTRUSTED\n');
  stdout.write(`${JSON.stringify(untrusted, null, 2)}\n`);
  stdout.write('```\n');
};

const triage = async (
  positional: string[],
  flags: Record<string, string | true>,
): Promise<void> => {
  const fingerprint = assertFingerprint(positional[0]);
  const actor = text(flags.actor);
  if (!actor) {
    fail('--actor <name> is required');
  }
  const cfg = loadConfig();
  if (!cfg.writeToken) {
    fail('no WRITE_TOKEN; run `crash-triage config` or set WRITE_TOKEN');
  }
  const body: Record<string, unknown> = { fingerprint, actor };
  const pr = text(flags.pr);
  const note = text(flags.note);
  if (pr) {
    body.prUrl = pr;
  }
  if (note) {
    body.note = note;
  }
  if (flags.reset) {
    body.reset = true;
  }
  const res = await fetch(
    `${cfg.url}/triage?key=${encodeURIComponent(cfg.writeToken)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    fail(
      `${res.status} ${await serverMessage(res)}`,
      res.status === 403 ? 3 : 2,
    );
  }
  print({
    ok: true,
    fingerprint,
    actor,
    prUrl: pr ?? null,
    reset: Boolean(flags.reset),
  });
};

const config = async (): Promise<void> => {
  const stored = readJson<Partial<Config>>(CONFIG_FILE, {});
  const rl = createInterface({ input: stdin, output: stdout });
  const ask = async (
    label: string,
    current: string | undefined,
  ): Promise<string> => {
    const hint = current ? ` [${current}]` : '';
    const answer = (await rl.question(`${label}${hint}: `)).trim();
    return answer || current || '';
  };
  const next: Config = {
    url: (await ask('REPORT_URL', stored.url)).replace(/\/+$/, ''),
    readToken: await ask('READ_TOKEN', stored.readToken),
    writeToken: await ask('WRITE_TOKEN', stored.writeToken),
  };
  rl.close();
  writeJson(CONFIG_FILE, next);
  stdout.write(`saved ${CONFIG_FILE}\n`);
};

const usage = (): never => {
  stdout.write(`usage:
  crash-triage queue [--since <ms>] [--build <sha>] [--all]
  crash-triage show <fingerprint> [--unsafe]
  crash-triage triage <fingerprint> --actor <name> [--pr <url>] [--note <text>] [--reset]
  crash-triage config

env REPORT_URL, READ_TOKEN, WRITE_TOKEN override .crash-triage/config.json
`);
  process.exit(1);
};

const main = async (): Promise<void> => {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [command, ...rest] = positional;
  switch (command) {
    case 'queue':
      return queue(flags);
    case 'show':
      return show(rest, flags);
    case 'triage':
      return triage(rest, flags);
    case 'config':
      return config();
    default:
      return usage();
  }
};

main().catch((err: unknown) =>
  fail(err instanceof Error ? err.message : String(err)),
);
