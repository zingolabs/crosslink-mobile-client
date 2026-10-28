import React, { ReactNode, useContext, useRef } from 'react';

import {
  InfoType,
  WalletType,
  ZecPriceType,
  BackgroundType,
  SendPageStateClass,
  ToAddrClass,
  NetInfoType,
  BackgroundErrorType,
  ServerType,
  SecurityType,
  LanguageEnum,
  CurrencyEnum,
  SelectServerEnum,
  SnackbarType,
  AppContextLoaded,
  ScheduledActionType,
} from '../AppState';

import { RPCSyncStatusType } from '../wallet/types/RPCSyncStatusType';
import { RPCPerformanceLevelEnum } from '../wallet/enums/RPCPerformanceLevelEnum';

export const defaultAppContextLoaded: AppContextLoaded = {
  netInfo: {} as NetInfoType,
  syncingStatus: {} as RPCSyncStatusType,
  totalBalance: null,
  staked: [],
  globalStaked: [],
  walletBonds: [],
  addresses: null,
  valueTransfers: null,
  valueTransfersTotal: null,
  messages: null,
  messagesTotal: null,
  sendPageState: new SendPageStateClass(new ToAddrClass(0)),
  setSendPageState: () => {},
  info: {} as InfoType,
  wallet: {} as WalletType,
  defaultUnifiedAddress: '',
  indexerServer: {} as ServerType,
  selectIndexerServer: SelectServerEnum.custom,
  currency: CurrencyEnum.USDCurrency,
  language: LanguageEnum.en,
  zecPrice: {
    zecPrice: 0,
    date: 0,
  } as ZecPriceType,
  sendAll: false,
  donation: false,
  background: {
    batches: 0,
    message: '',
    date: 0,
    dateEnd: 0,
  } as BackgroundType,
  translate: () => '',
  backgroundError: {} as BackgroundErrorType,
  setBackgroundError: () => {},
  privacy: false,
  readOnly: false,
  lastError: '',
  orchardPool: true,
  saplingPool: true,
  transparentPool: true,
  snackbars: [] as SnackbarType[],
  addLastSnackbar: () => {},
  removeFirstSnackbar: () => {},
  somePending: false,
  security: {} as SecurityType,
  rescanMenu: false,
  recoveryWalletInfoOnDevice: false,
  shieldingAmount: 0,
  showSwipeableIcons: true,
  doRefresh: () => {},
  setZecPrice: () => {},
  zenniesDonationAddress: '',
  zingolibVersion: '',
  performanceLevel: RPCPerformanceLevelEnum.Medium,
  setPrivacyOption: async () => {},
  requestFaucetFunds: async () => '',
  stakingDay: false,
  timeToStakingDaySeconds: 0,
  timeLeftStakingDaySeconds: 0,
  blocksToStakingDay: 0,
  blocksLeftStakingDay: 0,
  blocksTotalStakingDay: 0,
  scheduledActions: {} as ScheduledActionType[],
  setScheduledActions: () => {},
  getUfvk: async () => '',
};

export type AppLoadedActions = Pick<
  AppContextLoaded,
  | 'translate'
  | 'setSendPageState'
  | 'getUfvk'
  | 'setBackgroundError'
  | 'addLastSnackbar'
  | 'removeFirstSnackbar'
  | 'doRefresh'
  | 'setZecPrice'
  | 'setPrivacyOption'
  | 'requestFaucetFunds'
  | 'setScheduledActions'
>;

export type AppLoadedSettings = Pick<
  AppContextLoaded,
  | 'indexerServer'
  | 'selectIndexerServer'
  | 'currency'
  | 'language'
  | 'sendAll'
  | 'donation'
  | 'privacy'
  | 'security'
  | 'rescanMenu'
  | 'recoveryWalletInfoOnDevice'
  | 'performanceLevel'
  | 'readOnly'
  | 'orchardPool'
  | 'saplingPool'
  | 'transparentPool'
  | 'zenniesDonationAddress'
  | 'zingolibVersion'
  | 'wallet'
>;

export type AppLoadedWallet = Pick<
  AppContextLoaded,
  | 'netInfo'
  | 'totalBalance'
  | 'staked'
  | 'globalStaked'
  | 'walletBonds'
  | 'addresses'
  | 'valueTransfers'
  | 'valueTransfersTotal'
  | 'messages'
  | 'messagesTotal'
  | 'info'
  | 'syncingStatus'
  | 'defaultUnifiedAddress'
  | 'zecPrice'
  | 'background'
  | 'lastError'
  | 'somePending'
  | 'shieldingAmount'
  | 'stakingDay'
  | 'timeToStakingDaySeconds'
  | 'timeLeftStakingDaySeconds'
  | 'blocksToStakingDay'
  | 'blocksLeftStakingDay'
  | 'blocksTotalStakingDay'
  | 'scheduledActions'
>;

export type AppLoadedUi = Pick<
  AppContextLoaded,
  'sendPageState' | 'backgroundError' | 'snackbars' | 'showSwipeableIcons'
>;

const ACTION_KEYS: (keyof AppLoadedActions)[] = [
  'translate',
  'setSendPageState',
  'getUfvk',
  'setBackgroundError',
  'addLastSnackbar',
  'removeFirstSnackbar',
  'doRefresh',
  'setZecPrice',
  'setPrivacyOption',
  'requestFaucetFunds',
  'setScheduledActions',
];

const SETTINGS_KEYS: (keyof AppLoadedSettings)[] = [
  'indexerServer',
  'selectIndexerServer',
  'currency',
  'language',
  'sendAll',
  'donation',
  'privacy',
  'security',
  'rescanMenu',
  'recoveryWalletInfoOnDevice',
  'performanceLevel',
  'readOnly',
  'orchardPool',
  'saplingPool',
  'transparentPool',
  'zenniesDonationAddress',
  'zingolibVersion',
  'wallet',
];

const WALLET_KEYS: (keyof AppLoadedWallet)[] = [
  'netInfo',
  'totalBalance',
  'staked',
  'globalStaked',
  'walletBonds',
  'addresses',
  'valueTransfers',
  'valueTransfersTotal',
  'messages',
  'messagesTotal',
  'info',
  'syncingStatus',
  'defaultUnifiedAddress',
  'zecPrice',
  'background',
  'lastError',
  'somePending',
  'shieldingAmount',
  'stakingDay',
  'timeToStakingDaySeconds',
  'timeLeftStakingDaySeconds',
  'blocksToStakingDay',
  'blocksLeftStakingDay',
  'blocksTotalStakingDay',
  'scheduledActions',
];

const UI_KEYS: (keyof AppLoadedUi)[] = [
  'sendPageState',
  'backgroundError',
  'snackbars',
  'showSwipeableIcons',
];

function pick<K extends keyof AppContextLoaded>(
  value: AppContextLoaded,
  keys: K[],
): Pick<AppContextLoaded, K> {
  const out = {} as Pick<AppContextLoaded, K>;
  keys.forEach(k => {
    out[k] = value[k];
  });
  return out;
}

function useSlice<K extends keyof AppContextLoaded>(
  value: AppContextLoaded,
  keys: K[],
): Pick<AppContextLoaded, K> {
  const ref = useRef<Pick<AppContextLoaded, K> | null>(null);
  const prev = ref.current;
  if (prev && keys.every(k => Object.is(prev[k], value[k]))) {
    return prev;
  }
  const next = pick(value, keys);
  ref.current = next;
  return next;
}

const ContextAppLoadedActions = React.createContext<AppLoadedActions>(
  pick(defaultAppContextLoaded, ACTION_KEYS),
);
const ContextAppLoadedSettings = React.createContext<AppLoadedSettings>(
  pick(defaultAppContextLoaded, SETTINGS_KEYS),
);
const ContextAppLoadedWallet = React.createContext<AppLoadedWallet>(
  pick(defaultAppContextLoaded, WALLET_KEYS),
);
const ContextAppLoadedUi = React.createContext<AppLoadedUi>(
  pick(defaultAppContextLoaded, UI_KEYS),
);

export const useAppLoadedActions = () => useContext(ContextAppLoadedActions);
export const useAppLoadedSettings = () => useContext(ContextAppLoadedSettings);
export const useAppLoadedWallet = () => useContext(ContextAppLoadedWallet);
export const useAppLoadedUi = () => useContext(ContextAppLoadedUi);

type ContextProviderProps = {
  children: ReactNode;
  value: AppContextLoaded;
};

export const ContextAppLoadedProvider = ({
  children,
  value,
}: ContextProviderProps) => {
  const actions = useSlice(value, ACTION_KEYS);
  const settings = useSlice(value, SETTINGS_KEYS);
  const wallet = useSlice(value, WALLET_KEYS);
  const ui = useSlice(value, UI_KEYS);
  return (
    <ContextAppLoadedActions.Provider value={actions}>
      <ContextAppLoadedSettings.Provider value={settings}>
        <ContextAppLoadedWallet.Provider value={wallet}>
          <ContextAppLoadedUi.Provider value={ui}>
            {children}
          </ContextAppLoadedUi.Provider>
        </ContextAppLoadedWallet.Provider>
      </ContextAppLoadedSettings.Provider>
    </ContextAppLoadedActions.Provider>
  );
};
