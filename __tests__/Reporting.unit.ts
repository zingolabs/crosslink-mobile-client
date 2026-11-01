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
  normalizeStack,
} from '../app/reporting';
import { BUILD_ID, REPORT } from '../app/config';

describe('reporting', () => {
  beforeEach(() => clearBreadcrumbs());

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

  test('report posts fire-and-forget with the token header', () => {
    const fetchMock = jest.fn(() => Promise.reject(new Error('offline')));
    (global as any).fetch = fetchMock;
    expect(() => report(new Error('x'))).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
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
});
