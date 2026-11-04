import { NavigatorScreenParams } from '@react-navigation/native';
import type { IndexerReport } from '../indexers';
import {
  IndexerNetworkEnum,
  RouteEnum,
  ScheduledActionType,
  SeedActionEnum,
  SendPageState,
  ToAddr,
  ValueTransferType,
} from '../AppState';

export type SetupStackParamList = {
  [RouteEnum.StartMenu]: undefined;
  [RouteEnum.ChooseIndexer]: undefined;
  [RouteEnum.ListedIndexers]:
    | { report?: IndexerReport; network?: IndexerNetworkEnum }
    | undefined;
  [RouteEnum.CustomIndexer]: undefined;
  [RouteEnum.Import]: undefined;
};

export type SendNavigationState = {
  toaddr: ToAddr;
};

export type MainTabParamList = {
  [RouteEnum.History]: undefined;
  [RouteEnum.StakingHome]: StakingHomeNavigationState | undefined;
};

export type SessionStackParamList = {
  [RouteEnum.MainTabs]: NavigatorScreenParams<MainTabParamList> | undefined;

  [RouteEnum.Send]: SendNavigationState | undefined;
  [RouteEnum.Receive]: undefined;
  [RouteEnum.Faucet]: undefined;
  [RouteEnum.Distribution]: undefined;
  [RouteEnum.SyncReport]: undefined;
  [RouteEnum.SettingsStack]:
    | NavigatorScreenParams<SettingsStackParamList>
    | undefined;

  [RouteEnum.ScannerAddress]: ScannerAddressNavigationState | undefined;
  [RouteEnum.ValueTransferDetail]:
    | ValueTransferDetailNavigationState
    | undefined;
  [RouteEnum.Computing]: ComputingNavigationState | undefined;
  [RouteEnum.ComputingOK]: ComputingOKNavigationState | undefined;
  [RouteEnum.ComputingError]: ComputingErrorNavigationState | undefined;
  [RouteEnum.Finalizers]: FinalizersNavigationState | undefined;
  [RouteEnum.FinalizerDetail]: FinalizerDetailNavigationState | undefined;
  [RouteEnum.Stake]: StakeNavigationState | undefined;
  [RouteEnum.Unstake]: UnstakeNavigationState | undefined;
  [RouteEnum.Redelegate]: RedelegateNavigationState | undefined;
  [RouteEnum.ScheduledActionDetail]:
    | ScheduledActionDetailNavigationState
    | undefined;
};

export type SettingsStackParamList = {
  [RouteEnum.SettingsMenu]: undefined;
  [RouteEnum.Seed]: SeedNavigationState | undefined;
  [RouteEnum.SettingsServers]: undefined;
  [RouteEnum.DebugInfo]: undefined;
  [RouteEnum.Notes]: undefined;
};

export type ScannerAddressNavigationState = {
  setAddress: (a: string) => void;
  active: boolean;
};

export type ValueTransferDetailNavigationState = {
  vt: ValueTransferType;
  totalLength: number;
};

export type FinalizersNavigationState = {
  setFinalizer: (f: string, s: number) => void;
  scope: 'my' | 'network';
  exclude: string;
  goBackRoute: RouteEnum;
};

export type FinalizerDetailNavigationState = {
  finalizer: string;
  lifehash: string;
};

export type StakeNavigationState = {};

export type StakingHomeNavigationState = {
  tab: 'scheduled' | 'active' | 'my';
};

export type UnstakeNavigationState = {
  finalizer: string;
  txid: string;
  staked: number;
};

export type RedelegateNavigationState = {
  finalizer: string;
  txid: string;
  staked: number;
};

export type ScheduledActionDetailNavigationState = {
  item: ScheduledActionType;
};

export type SeedNavigationState = {
  action: SeedActionEnum;
};

export type ComputingNavigationState = {
  sendPageStatePar: SendPageState;
};

export type ComputingOKNavigationState = {
  txid: string;
};

export type ComputingErrorNavigationState = {
  error: string;
};
