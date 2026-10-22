import React, { ReactNode, useRef } from 'react';

import {
  AppContextLoading,
  WalletType,
  ZecPriceType,
  BackgroundType,
  NetInfoType,
  BackgroundErrorType,
  ServerType,
  SecurityType,
  LanguageEnum,
  CurrencyEnum,
  SelectServerEnum,
  SnackbarType,
} from '../AppState';
import { RPCPerformanceLevelEnum } from '../rpc/enums/RPCPerformanceLevelEnum';

export const defaultAppContextLoading: AppContextLoading = {
  netInfo: {} as NetInfoType,
  wallet: {} as WalletType,
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
  orchardPool: true,
  saplingPool: true,
  transparentPool: true,
  snackbars: [] as SnackbarType[],
  addLastSnackbar: () => {},
  removeFirstSnackbar: () => {},
  security: {} as SecurityType,
  rescanMenu: false,
  recoveryWalletInfoOnDevice: false,
  zingolibVersion: '',
  performanceLevel: RPCPerformanceLevelEnum.Medium,
  setPrivacyOption: async () => {},
};

export const ContextAppLoading = React.createContext(defaultAppContextLoading);

type ContextProviderProps = {
  children: ReactNode;
  value: AppContextLoading;
};

const KEYS = Object.keys(
  defaultAppContextLoading,
) as (keyof AppContextLoading)[];

export const ContextAppLoadingProvider = ({
  children,
  value,
}: ContextProviderProps) => {
  const ref = useRef<AppContextLoading>(value);
  const prev = ref.current;
  const stable = KEYS.every(k => Object.is(prev[k], value[k])) ? prev : value;
  ref.current = stable;
  return (
    <ContextAppLoading.Provider value={stable}>
      {children}
    </ContextAppLoading.Provider>
  );
};
