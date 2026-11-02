import { report, startReportQueue } from './report';

type RejectionTracker = {
  enablePromiseRejectionTracker?: (options: {
    allRejections: boolean;
    onUnhandled: (id: number, rejection: unknown) => void;
    onHandled: (id: number) => void;
  }) => void;
};

declare const global: {
  HermesInternal?: RejectionTracker;
};

let installed = false;

const onUnhandled = (_id: number, rejection: unknown): void => {
  report(rejection);
  if (__DEV__) {
    console.warn('Possible unhandled promise rejection', rejection);
  }
};

const trackRejections = (): void => {
  const hermes = global.HermesInternal;
  if (hermes?.enablePromiseRejectionTracker) {
    hermes.enablePromiseRejectionTracker({
      allRejections: true,
      onUnhandled,
      onHandled: () => undefined,
    });
    return;
  }
  require('promise/setimmediate/rejection-tracking').enable({
    allRejections: true,
    onUnhandled,
    onHandled: () => undefined,
  });
};

export const installReporting = (): void => {
  if (installed) {
    return;
  }
  installed = true;
  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    report(error);
    previous(error, isFatal);
  });
  trackRejections();
  startReportQueue();
};
