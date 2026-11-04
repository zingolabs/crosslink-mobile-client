import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';

import {
  defaultLoadedDomains,
  FEEDBACK_KEYS,
  FeedbackValue,
  LoadedDomains,
  SESSION_KEYS,
  SessionValue,
  SETTINGS_KEYS,
  SettingsValue,
  STATUS_KEYS,
  StatusValue,
  UI_KEYS,
  UiValue,
  WALLET_DATA_KEYS,
  WalletDataValue,
} from './domains';

export type Phase = 'none' | 'setup' | 'opening' | 'session';

export type AppStore = LoadedDomains & {
  phase: Phase;
  scrollToTop: boolean;
  scrollToBottom: boolean;
};

export const initialAppStore = (): AppStore => ({
  ...defaultLoadedDomains,
  phase: 'none',
  scrollToTop: false,
  scrollToBottom: false,
});

export const appStore = createStore<AppStore>()(initialAppStore);

export type Patch = Partial<AppStore> | ((prev: AppStore) => Partial<AppStore>);

export const read = (): AppStore => appStore.getState();

export const patch = (part: Patch): void => appStore.setState(part);

const pickSlice = <T extends object, K extends keyof T>(
  value: T,
  keys: K[],
): Pick<T, K> => {
  const next = {} as Pick<T, K>;
  keys.forEach(k => {
    next[k] = value[k];
  });
  return next;
};

const selectSettings = (s: AppStore): SettingsValue =>
  pickSlice(s, SETTINGS_KEYS);
const selectStatus = (s: AppStore): StatusValue => pickSlice(s, STATUS_KEYS);
const selectFeedback = (s: AppStore): FeedbackValue =>
  pickSlice(s, FEEDBACK_KEYS);
const selectWalletData = (s: AppStore): WalletDataValue =>
  pickSlice(s, WALLET_DATA_KEYS);
const selectUi = (s: AppStore): UiValue => pickSlice(s, UI_KEYS);
const selectSession = (s: AppStore): SessionValue =>
  pickSlice(s, SESSION_KEYS);
const selectPhase = (s: AppStore): Phase => s.phase;

export const useSettings = (): SettingsValue =>
  useStore(appStore, useShallow(selectSettings));
export const useStatus = (): StatusValue =>
  useStore(appStore, useShallow(selectStatus));
export const useFeedback = (): FeedbackValue =>
  useStore(appStore, useShallow(selectFeedback));
export const useWalletData = (): WalletDataValue =>
  useStore(appStore, useShallow(selectWalletData));
export const useUi = (): UiValue => useStore(appStore, useShallow(selectUi));
export const useSession = (): SessionValue =>
  useStore(appStore, useShallow(selectSession));
export const usePhase = (): Phase => useStore(appStore, selectPhase);
export const useAppStore = <T>(selector: (s: AppStore) => T): T =>
  useStore(appStore, selector);
