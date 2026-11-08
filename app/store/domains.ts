import TotalBalanceClass from '../AppState/classes/TotalBalanceClass';
import UnifiedAddressClass from '../AppState/classes/UnifiedAddressClass';
import TransparentAddressClass from '../AppState/classes/TransparentAddressClass';

import InfoType from '../AppState/types/InfoType';
import WalletType from '../AppState/types/WalletType';
import ZecPriceType from '../AppState/types/ZecPriceType';
import BackgroundType from '../AppState/types/BackgroundType';
import { TranslateType } from '../AppState/types/TranslateType';
import NetInfoType from '../AppState/types/NetInfoType';
import BackgroundErrorType from '../AppState/types/BackgroundErrorType';
import ServerType from '../AppState/types/ServerType';
import SnackbarType from '../AppState/types/SnackbarType';
import SecurityType from '../AppState/types/SecurityType';
import StakeType from '../AppState/types/StakeType';
import WalletBondsType from '../AppState/types/WalletBondsType';
import ScheduledActionType from '../AppState/types/ScheduledActionType';
import ValueTransferType from '../AppState/types/ValueTransferType';

import { LanguageEnum } from '../AppState/enums/LanguageEnum';
import { CurrencyEnum } from '../AppState/enums/CurrencyEnum';
import { SelectServerEnum } from '../AppState/enums/SelectServerEnum';
import { ScreenEnum } from '../AppState/enums/ScreenEnum';
import { PerformanceLevelEnum } from '../wallet/enums';
import type { SyncStatus } from '../wallet/generated/SyncStatus';

export interface SettingsValue {
  indexerServer: ServerType;
  selectIndexerServer: SelectServerEnum;
  currency: CurrencyEnum;
  language: LanguageEnum;
  sendAll: boolean;
  donation: boolean;
  privacy: boolean;
  security: SecurityType;
  rescanMenu: boolean;
  recoveryWalletInfoOnDevice: boolean;
  performanceLevel: PerformanceLevelEnum;
}

export const defaultSettings: SettingsValue = {
  indexerServer: {} as ServerType,
  selectIndexerServer: SelectServerEnum.custom,
  currency: CurrencyEnum.USDCurrency,
  language: LanguageEnum.en,
  sendAll: false,
  donation: false,
  privacy: false,
  security: {} as SecurityType,
  rescanMenu: false,
  recoveryWalletInfoOnDevice: false,
  performanceLevel: PerformanceLevelEnum.Medium,
};

export interface StatusValue {
  readOnly: boolean;
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;
  netInfo: NetInfoType;
  background: BackgroundType;
  zecPrice: ZecPriceType;
  wallet: WalletType;
  zingolibVersion: string;
}

export const defaultStatus: StatusValue = {
  readOnly: false,
  orchardPool: true,
  saplingPool: true,
  transparentPool: true,
  netInfo: {} as NetInfoType,
  background: {
    batches: 0,
    message: '',
    date: 0,
    dateEnd: 0,
  } as BackgroundType,
  zecPrice: {
    zecPrice: 0,
    date: 0,
  } as ZecPriceType,
  wallet: {} as WalletType,
  zingolibVersion: '',
};

export interface FeedbackValue {
  translate: (key: string) => TranslateType;
  snackbars: SnackbarType[];
  addLastSnackbar: (snackbar: SnackbarType) => void;
  removeFirstSnackbar: (s: ScreenEnum) => void;
  backgroundError: BackgroundErrorType;
  setBackgroundError: (title: string, error: string) => void;
  setPrivacyOption: (value: boolean) => Promise<void>;
}

export const defaultFeedback: FeedbackValue = {
  translate: () => '',
  snackbars: [],
  addLastSnackbar: () => {},
  removeFirstSnackbar: () => {},
  backgroundError: {} as BackgroundErrorType,
  setBackgroundError: () => {},
  setPrivacyOption: async () => {},
};

export interface WalletDataValue {
  totalBalance: TotalBalanceClass | null;
  staked: StakeType[];
  globalStaked: StakeType[];
  walletBonds: WalletBondsType[];
  addresses: (UnifiedAddressClass | TransparentAddressClass)[] | null;
  valueTransfers: ValueTransferType[] | null;
  valueTransfersTotal: number | null;
  info: InfoType;
  syncingStatus: SyncStatus;
  defaultUnifiedAddress: string;
  somePending: boolean;
  shieldingAmount: number;
  stakingDay: boolean;
  timeToStakingDaySeconds: number;
  timeLeftStakingDaySeconds: number;
  blocksToStakingDay: number;
  blocksLeftStakingDay: number;
  blocksTotalStakingDay: number;
  stakingDayComputedAt: number;
  scheduledActions: ScheduledActionType[];
}

export const defaultWalletData: WalletDataValue = {
  totalBalance: null,
  staked: [],
  globalStaked: [],
  walletBonds: [],
  addresses: null,
  valueTransfers: null,
  valueTransfersTotal: null,
  info: {} as InfoType,
  syncingStatus: {} as SyncStatus,
  defaultUnifiedAddress: '',
  somePending: false,
  shieldingAmount: 0,
  stakingDay: false,
  timeToStakingDaySeconds: 0,
  timeLeftStakingDaySeconds: 0,
  blocksToStakingDay: 0,
  blocksLeftStakingDay: 0,
  blocksTotalStakingDay: 0,
  stakingDayComputedAt: 0,
  scheduledActions: [],
};

export interface UiValue {
  showSwipeableIcons: boolean;
}

export const defaultUi: UiValue = {
  showSwipeableIcons: true,
};

export interface SessionValue {
  lastError: string;
  zenniesDonationAddress: string;
  getUfvk: () => Promise<string>;
  doRefresh: (s: ScreenEnum) => void;
  setZecPrice: (p: number, d: number) => void;
  requestFaucetFunds: (address: string) => Promise<string>;
  setScheduledActions: (list: ScheduledActionType[]) => void;
}

export const defaultSession: SessionValue = {
  lastError: '',
  zenniesDonationAddress: '',
  getUfvk: async () => '',
  doRefresh: () => {},
  setZecPrice: () => {},
  requestFaucetFunds: async () => '',
  setScheduledActions: () => {},
};

const keys = <T extends object>(value: T): (keyof T)[] =>
  Object.keys(value) as (keyof T)[];

export const SETTINGS_KEYS = keys(defaultSettings);
export const STATUS_KEYS = keys(defaultStatus);
export const FEEDBACK_KEYS = keys(defaultFeedback);
export const WALLET_DATA_KEYS = keys(defaultWalletData);
export const UI_KEYS = keys(defaultUi);
export const SESSION_KEYS = keys(defaultSession);

export type LoadedDomains = SettingsValue &
  StatusValue &
  FeedbackValue &
  WalletDataValue &
  UiValue &
  SessionValue;

export type SetupDomains = SettingsValue & StatusValue & FeedbackValue;

export const defaultSetupDomains: SetupDomains = {
  ...defaultSettings,
  ...defaultStatus,
  ...defaultFeedback,
};

export const defaultLoadedDomains: LoadedDomains = {
  ...defaultSettings,
  ...defaultStatus,
  ...defaultFeedback,
  ...defaultWalletData,
  ...defaultUi,
  ...defaultSession,
};
