import { ScreenEnum, SnackbarType } from '../../app/AppState';

export const mockSnackbars: SnackbarType[] = [
  {
    message: 'snackbar 1',
    screenName: [ScreenEnum.About],
  },
  {
    message: 'snackbar 2',
    screenName: [ScreenEnum.Session],
  },
  {
    message: 'snackbar 3',
    screenName: [ScreenEnum.About],
  },
];
