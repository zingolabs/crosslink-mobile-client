import { AppStateStatus } from 'react-native';
import { IndexerNetworkEnum } from './enums/IndexerNetworkEnum';
import { LaunchingModeEnum } from './enums/LaunchingModeEnum';
import { LoadingAppEntryEnum } from './enums/LoadingAppEntryEnum';

export default interface AppStateLoading {
  appStateStatus: AppStateStatus;
  entry: LoadingAppEntryEnum;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  openWalletFailed: boolean;
  biometricsFailed: boolean;
  startingApp: boolean;
  serverErrorTries: number;
  firstLaunchingMessage: LaunchingModeEnum;
  hasRecoveryWalletInfoSaved: boolean;
  walletSeed: string;
  walletBirthday: number;
  indexerNetwork: IndexerNetworkEnum;
  indexerServerPinned: boolean;
}
