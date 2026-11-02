import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { BUILD_ID, DEV_BUNDLE, REPORT } from '../config';
import { breadcrumbs } from './breadcrumbs';

export type ReportPayload = {
  buildId: string;
  version: string;
  platform: string;
  stack: string;
  message: string;
  breadcrumbs: string[];
};

export const normalizeStack = (stack: string): string =>
  stack
    .replace(/[^\s(]*\/main\.jsbundle/g, 'main.jsbundle')
    .replace(/https?:\/\/[^\s)]*index\.bundle[^\s):]*/g, 'index.bundle');

const describe = (error: unknown): { message: string; stack: string } => {
  if (error instanceof Error) {
    const message = error.message || error.name;
    const stack = error.stack || `${error.name}: ${message}`;
    return { message, stack: normalizeStack(stack) };
  }
  let message: string;
  try {
    message = typeof error === 'string' ? error : JSON.stringify(error);
  } catch {
    message = String(error);
  }
  const stack =
    typeof (error as { stack?: unknown })?.stack === 'string'
      ? normalizeStack((error as { stack: string }).stack)
      : message;
  return { message, stack };
};

export const DEV_MARK = '[DEV] ';

export const buildPayload = (error: unknown): ReportPayload => {
  const { message, stack } = describe(error);
  const version = `${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})`;
  return {
    buildId: BUILD_ID,
    version: DEV_BUNDLE ? `${version} DEV` : version,
    platform: `${Platform.OS} ${Platform.Version}`,
    stack,
    message: DEV_BUNDLE ? `${DEV_MARK}${message}` : message,
    breadcrumbs: breadcrumbs(),
  };
};

export const reportFailure = (title: string, message: string): void => {
  const failure = new Error(message);
  failure.name = title;
  report(failure);
};

// A failing server makes the wallet report the same errors on every poll
// cycle. Without these limits one unreachable server produces hundreds of
// identical reports per minute, both wasting the network and flooding the
// report queue.
const MAX_PER_MINUTE = 10;
const MAX_PER_SESSION = 100;
const QUEUE_KEY = 'reporting.queue.v1';
const QUEUE_LIMIT = 50;
const FLUSH_INTERVAL_MS = 60_000;
const DEDUPE_WINDOW_MS = 10 * 60_000;

const state = {
  queue: [] as ReportPayload[],
  queueLoaded: false,
  sending: false,
  sessionCount: 0,
  minuteWindowStart: 0,
  minuteCount: 0,
  flushTimer: null as ReturnType<typeof setInterval> | null,
  appStateSubscription: null as { remove: () => void } | null,
};

const recentFingerprints = new Map<string, number>();

const fingerprint = (payload: ReportPayload): string => payload.message;

const forgetOldFingerprints = (now: number): void => {
  recentFingerprints.forEach((seen, key) => {
    if (now - seen > DEDUPE_WINDOW_MS) {
      recentFingerprints.delete(key);
    }
  });
};

const underRateLimit = (now: number): boolean => {
  if (now - state.minuteWindowStart >= 60_000) {
    state.minuteWindowStart = now;
    state.minuteCount = 0;
  }
  return (
    state.minuteCount < MAX_PER_MINUTE && state.sessionCount < MAX_PER_SESSION
  );
};

const countReport = (): void => {
  state.minuteCount += 1;
  state.sessionCount += 1;
};

const loadQueue = async (): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        state.queue = parsed.filter(
          (item): item is ReportPayload =>
            !!item && typeof item.message === 'string',
        );
      }
    }
  } catch {
    state.queue = [];
  }
  state.queueLoaded = true;
};

const persistQueue = (): void => {
  const result = AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(state.queue));
  if (result && typeof result.catch === 'function') {
    result.catch(() => undefined);
  }
};

const send = async (payload: ReportPayload): Promise<boolean> => {
  try {
    const response = await fetch(`${REPORT.url}/report`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-report-token': REPORT.token,
      },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
};

/** Sends queued reports until one fails, the queue empties, or the rate limit is hit. */
const flush = async (): Promise<void> => {
  if (state.sending) {
    return;
  }
  state.sending = true;
  try {
    while (state.queue.length > 0 && underRateLimit(Date.now())) {
      const payload = state.queue[0];
      const ok = await send(payload);
      if (!ok) {
        // The endpoint is unreachable; keep the report and stop here
        // instead of retrying in a tight loop.
        break;
      }
      state.queue.shift();
      countReport();
      persistQueue();
    }
  } finally {
    state.sending = false;
  }
};

export const report = (error: unknown): Promise<void> => {
  if (!REPORT.url || !REPORT.token) {
    return Promise.resolve();
  }
  try {
    const payload = buildPayload(error);
    const now = Date.now();
    forgetOldFingerprints(now);

    const key = fingerprint(payload);
    const seen = recentFingerprints.get(key);
    if (seen !== undefined) {
      return Promise.resolve();
    }
    recentFingerprints.set(key, now);

    if (state.queue.length >= QUEUE_LIMIT) {
      state.queue.shift();
    }
    state.queue.push(payload);
    if (state.queueLoaded) {
      persistQueue();
    }
    if (underRateLimit(now)) {
      return flush();
    }
    return Promise.resolve();
  } catch {
    return Promise.resolve();
  }
};

/** Loads any persisted reports and starts the periodic flush. Idempotent. */
export const startReportQueue = (): void => {
  if (state.flushTimer) {
    return;
  }
  state.flushTimer = setInterval(() => flush(), FLUSH_INTERVAL_MS);
  state.appStateSubscription = AppState.addEventListener('change', next => {
    if (next === 'active') {
      flush();
    }
  });
  loadQueue().then(() => flush());
};

/** Clears all reporting state. Used by tests. */
export const resetReportState = (): void => {
  state.queue = [];
  state.queueLoaded = false;
  state.sending = false;
  state.sessionCount = 0;
  state.minuteWindowStart = 0;
  state.minuteCount = 0;
  recentFingerprints.clear();
  if (state.flushTimer) {
    clearInterval(state.flushTimer);
    state.flushTimer = null;
  }
  if (state.appStateSubscription) {
    state.appStateSubscription.remove();
    state.appStateSubscription = null;
  }
};
