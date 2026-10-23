import { AppStateStatus } from 'react-native';

export default interface AppStateLoaded {
  appStateStatus: AppStateStatus;
  scrollToTop: boolean;
  scrollToBottom: boolean;
}
