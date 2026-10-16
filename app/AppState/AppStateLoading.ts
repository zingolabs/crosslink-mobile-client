import { AppStateStatus } from 'react-native';
import { LaunchingModeEnum } from './enums/LaunchingModeEnum';
import { LoadingAppEntryEnum } from './enums/LoadingAppEntryEnum';

export default interface AppStateLoading {
  appStateStatus: AppStateStatus;
  entry: LoadingAppEntryEnum;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  biometricsFailed: boolean;
  startingApp: boolean;
  serverErrorTries: number;
  firstLaunchingMessage: LaunchingModeEnum;
  hasRecoveryWalletInfoSaved: boolean;
  walletSeed: string;
  walletBirthday: number;
}
