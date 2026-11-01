import React, { ReactNode, useContext, useRef } from 'react';

import {
  defaultFeedback,
  defaultSession,
  defaultSettings,
  defaultStatus,
  defaultUi,
  defaultWalletData,
  FEEDBACK_KEYS,
  SETTINGS_KEYS,
  SESSION_KEYS,
  STATUS_KEYS,
  UI_KEYS,
  WALLET_DATA_KEYS,
  FeedbackValue,
  LoadedDomains,
  SessionValue,
  SettingsValue,
  StatusValue,
  UiValue,
  WalletDataValue,
  SetupDomains,
} from './domains';

function useSlice<T extends object, K extends keyof T>(
  value: T,
  keys: K[],
): Pick<T, K> {
  const ref = useRef<Pick<T, K> | null>(null);
  const prev = ref.current;
  if (prev && keys.every(k => Object.is(prev[k], value[k]))) {
    return prev;
  }
  const next = {} as Pick<T, K>;
  keys.forEach(k => {
    next[k] = value[k];
  });
  ref.current = next;
  return next;
}

const ContextSettings = React.createContext<SettingsValue>(defaultSettings);
const ContextStatus = React.createContext<StatusValue>(defaultStatus);
const ContextFeedback = React.createContext<FeedbackValue>(defaultFeedback);
const ContextWalletData =
  React.createContext<WalletDataValue>(defaultWalletData);
const ContextUi = React.createContext<UiValue>(defaultUi);
const ContextSession = React.createContext<SessionValue>(defaultSession);

export const useSettings = () => useContext(ContextSettings);
export const useStatus = () => useContext(ContextStatus);
export const useFeedback = () => useContext(ContextFeedback);
export const useWalletData = () => useContext(ContextWalletData);
export const useUi = () => useContext(ContextUi);
export const useSession = () => useContext(ContextSession);

type DomainsProps = {
  children: ReactNode;
  value: LoadedDomains;
};

export const SessionDomainsProvider = ({ children, value }: DomainsProps) => {
  const settings = useSlice(value, SETTINGS_KEYS);
  const status = useSlice(value, STATUS_KEYS);
  const feedback = useSlice(value, FEEDBACK_KEYS);
  const walletData = useSlice(value, WALLET_DATA_KEYS);
  const ui = useSlice(value, UI_KEYS);
  const session = useSlice(value, SESSION_KEYS);
  return (
    <ContextSettings.Provider value={settings}>
      <ContextStatus.Provider value={status}>
        <ContextFeedback.Provider value={feedback}>
          <ContextWalletData.Provider value={walletData}>
            <ContextUi.Provider value={ui}>
              <ContextSession.Provider value={session}>
                {children}
              </ContextSession.Provider>
            </ContextUi.Provider>
          </ContextWalletData.Provider>
        </ContextFeedback.Provider>
      </ContextStatus.Provider>
    </ContextSettings.Provider>
  );
};

type SetupDomainsProps = {
  children: ReactNode;
  value: SetupDomains;
};

export const SetupDomainsProvider = ({
  children,
  value,
}: SetupDomainsProps) => {
  const settings = useSlice(value, SETTINGS_KEYS as (keyof SetupDomains)[]);
  const status = useSlice(value, STATUS_KEYS as (keyof SetupDomains)[]);
  const feedback = useSlice(value, FEEDBACK_KEYS as (keyof SetupDomains)[]);
  return (
    <ContextSettings.Provider value={settings as SettingsValue}>
      <ContextStatus.Provider value={status as StatusValue}>
        <ContextFeedback.Provider value={feedback as FeedbackValue}>
          {children}
        </ContextFeedback.Provider>
      </ContextStatus.Provider>
    </ContextSettings.Provider>
  );
};
