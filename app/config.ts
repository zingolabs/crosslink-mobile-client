import { Platform } from 'react-native';

export type ReportConfig = {
  url: string;
  token: string;
};

export type ReportTarget = 'local' | 'prod';

const DEV_HOST = Platform.select({ android: '10.0.2.2', default: 'localhost' });

const LOCAL_REPORT: ReportConfig = {
  url: `http://${DEV_HOST}:3000`,
  token: 'dev-report-token',
};

const PROD_REPORT: ReportConfig = {
  url: (process.env.DELEGATOR_REPORT_URL ?? '').replace(/\/+$/, ''),
  token: process.env.DELEGATOR_REPORT_TOKEN ?? '',
};

export const selectReportTarget = (
  dev: boolean,
  requested: string | undefined,
): ReportTarget => {
  if (!dev || requested === 'prod') {
    return 'prod';
  }
  return 'local';
};

export const REPORT_TARGET: ReportTarget = selectReportTarget(
  __DEV__,
  process.env.DELEGATOR_REPORT_TARGET,
);

export const REPORT: ReportConfig =
  REPORT_TARGET === 'prod' ? PROD_REPORT : LOCAL_REPORT;

export const DEV_BUNDLE: boolean = __DEV__;

export const BUILD_ID: string = process.env.DELEGATOR_BUILD_ID || 'unknown';

export const CRASH_TEST: boolean = process.env.DELEGATOR_CRASH_TEST === '1';

export const FAKE_RPC: boolean = process.env.DELEGATOR_FAKE_RPC === '1';
