import { createRequire } from 'node:module';
import { readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformFileAsync } from '@babel/core';

type Level = 'error' | 'warning' | 'info' | 'success';
type Location = { line: number; column: number } | null;
type Finding = {
  file: string;
  kind: string;
  level: Level;
  rule: string;
  reason: string;
  description: string | null;
  loc: Location;
};

const require = createRequire(import.meta.url);
const { events } = require('./react-compiler.cjs') as { events: Finding[] };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const DEFAULT_ROOTS = [
  'App.tsx',
  'index.js',
  'app',
  'components',
  '__tests__',
  '__mocks__',
  '.rnstorybook',
];
const SKIP_DIRS = new Set(['node_modules']);

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const roots = args.filter(a => !a.startsWith('--'));
const showAll = flags.has('--all');
const asJson = flags.has('--json');
const failOn: 'never' | 'warning' | 'error' = flags.has('--no-fail')
  ? 'never'
  : flags.has('--fail-on-warnings')
    ? 'warning'
    : 'error';
const github = process.env.GITHUB_ACTIONS === 'true';

const collect = (target: string, out: string[]) => {
  const full = resolve(ROOT, target);
  let stats;
  try {
    stats = statSync(full);
  } catch {
    return;
  }
  if (stats.isDirectory()) {
    for (const entry of readdirSync(full)) {
      if (!SKIP_DIRS.has(entry)) {
        collect(join(full, entry), out);
      }
    }
    return;
  }
  if (EXTENSIONS.has(extname(full)) && !full.endsWith('.d.ts')) {
    out.push(full);
  }
};

const files: string[] = [];
for (const root of roots.length ? roots : DEFAULT_ROOTS) {
  collect(root, files);
}
files.sort();

for (const file of files) {
  try {
    await transformFileAsync(file, {
      cwd: ROOT,
      configFile: join(ROOT, 'babel.config.js'),
      babelrc: false,
      sourceType: 'unambiguous',
      code: false,
      caller: { name: 'react-compiler-report', supportsStaticESM: false },
    });
  } catch (error) {
    const err = error as Error & { loc?: { line: number; column: number } };
    events.push({
      file: relative(ROOT, file),
      kind: 'PipelineError',
      level: 'error',
      rule: 'babel',
      reason: err.message.split('\n')[0],
      description: null,
      loc: err.loc ? { line: err.loc.line, column: err.loc.column } : null,
    });
  }
}

const seen = new Set<string>();
const unique = events.filter(e => {
  const key = [
    e.file,
    e.level,
    e.rule,
    e.reason,
    e.loc?.line,
    e.loc?.column,
  ].join('|');
  if (seen.has(key)) {
    return false;
  }
  seen.add(key);
  return true;
});
const byLevel = (level: Level) => unique.filter(e => e.level === level);
const findings = unique.filter(e => e.level !== 'success');
const visible = showAll ? unique : findings;

const counts = {
  files: files.length,
  compiled: byLevel('success').length,
  errors: byLevel('error').length,
  warnings: byLevel('warning').length,
  info: byLevel('info').length,
};

const text = (e: Finding) =>
  e.description ? `${e.reason}. ${e.description}` : e.reason;

if (asJson) {
  console.log(JSON.stringify({ counts, events: visible }, null, 2));
} else {
  const byFile = new Map<string, Finding[]>();
  for (const e of visible) {
    const list = byFile.get(e.file) ?? [];
    list.push(e);
    byFile.set(e.file, list);
  }
  const tag: Record<Level, string> = {
    error: 'error',
    warning: 'warn ',
    info: 'info ',
    success: 'ok   ',
  };
  for (const [file, list] of byFile) {
    console.log(file);
    for (const e of list) {
      const where = e.loc ? `${e.loc.line}:${e.loc.column}` : '-';
      console.log(`  ${where.padEnd(8)} ${tag[e.level]} ${e.rule}: ${text(e)}`);
    }
    console.log('');
  }
  console.log(
    `${counts.files} files, ${counts.compiled} compiled, ` +
      `${counts.errors} errors, ${counts.warnings} warnings, ${counts.info} skipped`,
  );
}

if (github) {
  const escape = (s: string) =>
    s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  for (const e of findings) {
    const type =
      e.level === 'error'
        ? 'error'
        : e.level === 'warning'
          ? 'warning'
          : 'notice';
    const loc = e.loc ? `,line=${e.loc.line},col=${e.loc.column}` : '';
    console.log(
      `::${type} file=${e.file}${loc},title=react-compiler ${e.rule}::${escape(text(e))}`,
    );
  }
}

const failed =
  (failOn === 'error' && counts.errors > 0) ||
  (failOn === 'warning' && counts.errors + counts.warnings > 0);
process.exit(failed ? 1 : 0);
