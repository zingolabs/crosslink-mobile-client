import { Platform } from 'react-native';
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

export const report = (error: unknown): void => {
  if (!REPORT.url || !REPORT.token) {
    return;
  }
  try {
    const body = JSON.stringify(buildPayload(error));
    fetch(`${REPORT.url}/report`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-report-token': REPORT.token,
      },
      body,
    }).catch(() => undefined);
  } catch {
    return;
  }
};
