/**
 * @format
 */

import 'react-native';
import {
  breadcrumb,
  breadcrumbs,
  clearBreadcrumbs,
  buildPayload,
  report,
  resetReportState,
  normalizeStack,
} from '../app/reporting';
import { BUILD_ID, REPORT } from '../app/config';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.AppState = {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  return RN;
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
}));

const QUEUE_LIMIT = 50;
const MAX_PER_MINUTE = 10;
const DEDUPE_WINDOW_MS = 10 * 60_000;

describe('reporting', () => {
  let now: number;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    resetReportState();
    clearBreadcrumbs();
    jest.clearAllMocks();
    now = 1_000_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    fetchMock = jest.fn(() => Promise.resolve({ ok: true, status: 204 }));
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    resetReportState();
    jest.restoreAllMocks();
  });

  test('breadcrumb ring keeps the last 50 actions in order', () => {
    for (let i = 0; i < 60; i += 1) {
      breadcrumb(`a${i}`);
    }
    const out = breadcrumbs();
    expect(out).toHaveLength(50);
    expect(out[0]).toBe('a10');
    expect(out[49]).toBe('a59');
  });

  test('build id is baked in at transform time', () => {
    expect(BUILD_ID).toMatch(/^[0-9a-f]{7,}$/);
  });

  test('payload carries stack, message and breadcrumbs', () => {
    breadcrumb('navigate Home');
    const payload = buildPayload(new Error('boom'));
    expect(payload.buildId).toBe(BUILD_ID);
    expect(payload.message).toBe('[DEV] boom');
    expect(payload.version).toMatch(/ DEV$/);
    expect(payload.stack).toContain('boom');
    expect(payload.breadcrumbs).toEqual(['navigate Home']);
    expect(payload.platform).toMatch(/^(ios|android) /);
  });

  test('non-error rejections still produce a stack', () => {
    const payload = buildPayload({ code: 7 });
    expect(payload.message).toBe('[DEV] {"code":7}');
    expect(payload.stack).toBe('{"code":7}');
  });

  test('bundle paths are stripped so fingerprints match across installs', () => {
    const release =
      'at trigger (/private/var/containers/Bundle/Application/3F2A-9C1D/ZingoDelegator.app/main.jsbundle:74001:31)';
    const dev =
      'at anonymous (http://localhost:8081/index.bundle//&platform=ios&dev=true&app=org.ZingoLabs.ZingoDelegator:282239:78)';
    expect(normalizeStack(release)).toBe('at trigger (main.jsbundle:74001:31)');
    expect(normalizeStack(dev)).toBe('at anonymous (index.bundle:282239:78)');
  });

  test('report posts fire-and-forget with the token header', async () => {
    const failingFetch = jest.fn(() => Promise.reject(new Error('offline')));
    (global as any).fetch = failingFetch;
    await expect(report(new Error('x'))).resolves.toBeUndefined();
    expect(failingFetch).toHaveBeenCalledTimes(1);
    const [url, init] = failingFetch.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${REPORT.url}/report`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-report-token']).toBe(
      REPORT.token,
    );
    expect(JSON.parse(init.body as string).buildId).toBe(BUILD_ID);
  });

  test('drops duplicate messages within the dedupe window', async () => {
    await report(new Error('same failure'));
    await report(new Error('same failure'));
    await report(new Error('same failure'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    now += DEDUPE_WINDOW_MS + 1;
    await report(new Error('same failure'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('keeps a report queued when the send fails and sends it later', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await report(new Error('queued failure'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    now += 1000;
    await report(new Error('second failure'));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const queued = JSON.parse(fetchMock.mock.calls[1][1].body);
    const second = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(queued.message).toBe('[DEV] queued failure');
    expect(second.message).toBe('[DEV] second failure');
  });

  test('rate limits sends per minute and drains the queue later', async () => {
    for (let i = 0; i < 12; i += 1) {
      await report(new Error(`failure ${i}`));
    }
    expect(fetchMock).toHaveBeenCalledTimes(MAX_PER_MINUTE);

    now += 61_000;
    await report(new Error('failure 12'));
    expect(fetchMock).toHaveBeenCalledTimes(MAX_PER_MINUTE + 3);
  });

  test('queue never grows past the limit', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    // every send fails, so every report stays queued until the limit holds
    for (let i = 0; i < QUEUE_LIMIT + 20; i += 1) {
      now += 61_000;
      await report(new Error(`overflow ${i}`));
    }
    // the flush after each report makes one attempt and stops on failure
    expect(fetchMock).toHaveBeenCalledTimes(QUEUE_LIMIT + 20);
  });
});
