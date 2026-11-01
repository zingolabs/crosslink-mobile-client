import { Linking } from 'react-native';
import { CRASH_TEST } from '../config';

const TRIGGER = 'crash-test';

const trigger = (url: string | null): void => {
  if (url && url.includes(TRIGGER)) {
    Promise.reject(new Error('crash test'));
  }
};

export const installCrashTest = (): void => {
  if (!CRASH_TEST) {
    return;
  }
  Linking.addEventListener('url', event => trigger(event.url));
  Linking.getInitialURL()
    .then(trigger)
    .catch(() => undefined);
};
