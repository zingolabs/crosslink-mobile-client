import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { GlobalConst, SnackbarType, ScreenEnum } from './AppState';

export const createAlert = async (
  setBackgroundError: (title: string, error: string) => void,
  addLastSnackbar: (snackbar: SnackbarType) => void,
  screenName: ScreenEnum[],
  title: string,
  error: string,
  toast: boolean,
) => {
  const background = await AsyncStorage.getItem(GlobalConst.background);
  if (background === GlobalConst.yes) {
    setBackgroundError(title, error);
  } else {
    if (toast) {
      setTimeout(() => {
        addLastSnackbar({ message: error, screenName: screenName });
      }, 1 * 1000);
    } else {
      Alert.alert(title, error);
    }
  }
};
