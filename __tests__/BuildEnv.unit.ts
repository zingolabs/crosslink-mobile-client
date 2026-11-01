/**
 * @format
 */

import 'react-native';
import {
  BUILD_ID,
  CRASH_TEST,
  REPORT,
  selectReportTarget,
} from '../app/config';

describe('build env', () => {
  test('build id is the short git sha', () => {
    expect(BUILD_ID).toMatch(/^[0-9a-f]{7,}$/);
  });

  test('dev bundles post to the local worker', () => {
    expect(REPORT.url).toBe('http://localhost:3000');
    expect(REPORT.token).toBe('dev-report-token');
  });

  test('crash test flag is a boolean', () => {
    expect(typeof CRASH_TEST).toBe('boolean');
  });

  test('report target: release always prod, dev local unless prod requested', () => {
    expect(selectReportTarget(false, undefined)).toBe('prod');
    expect(selectReportTarget(false, 'local')).toBe('prod');
    expect(selectReportTarget(true, undefined)).toBe('local');
    expect(selectReportTarget(true, '')).toBe('local');
    expect(selectReportTarget(true, 'prod')).toBe('prod');
  });
});

describe('release gate', () => {
  const load = (dev: boolean) => {
    const previous = (global as any).__DEV__;
    (global as any).__DEV__ = dev;
    let config: typeof import('../app/config') | undefined;
    jest.isolateModules(() => {
      config = require('../app/config');
    });
    (global as any).__DEV__ = previous;
    return config!;
  };

  test('release bundles use the baked production endpoint and token', () => {
    const { REPORT: release } = load(false);
    expect(release.url).toBe(process.env.DELEGATOR_REPORT_URL);
    expect(release.token).toBe(process.env.DELEGATOR_REPORT_TOKEN);
    expect(release.url).not.toContain('localhost');
    expect(release.token).not.toBe('dev-report-token');
  });

  test('dev bundles never carry the production token', () => {
    const { REPORT: dev } = load(true);
    expect(dev.url).toBe('http://localhost:3000');
    expect(dev.token).toBe('dev-report-token');
  });
});
