import { Alert } from 'react-native';

import { ScreenEnum, SnackbarType } from '../AppState';
import { writeSettings } from '../storage/settingsFile';
import { patch, read } from './appStore';

export const addLastSnackbar = (snackbar: SnackbarType): void =>
  patch(prev => {
    const last = prev.snackbars[prev.snackbars.length - 1];
    if (last && last.message === snackbar.message) {
      return {};
    }
    return { snackbars: [...prev.snackbars, snackbar] };
  });

export const removeFirstSnackbar = (screen: ScreenEnum): void =>
  patch(prev => {
    const index = prev.snackbars.findIndex(s => s.screenName.includes(screen));
    if (index < 0) {
      return {};
    }
    return { snackbars: prev.snackbars.filter((_, i) => i !== index) };
  });

export const setBackgroundError = (title: string, error: string): void =>
  patch({ backgroundError: { title, error } });

export const showBackgroundErrorIfAny = (): void => {
  const { backgroundError } = read();
  if (backgroundError && (backgroundError.title || backgroundError.error)) {
    Alert.alert(backgroundError.title, backgroundError.error);
    setBackgroundError('', '');
  }
};

export const setPrivacyOption = async (value: boolean): Promise<void> => {
  await writeSettings('privacy', value);
  patch({ privacy: value });
};

export const feedbackActions = {
  addLastSnackbar,
  removeFirstSnackbar,
  setBackgroundError,
  setPrivacyOption,
};
