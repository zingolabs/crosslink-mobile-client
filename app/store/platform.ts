import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, {
  NetInfoState,
} from '@react-native-community/netinfo/src/index';
import isEqual from 'lodash/isEqual';

import {
  AppStateStatusEnum,
  BackgroundType,
  EventListenerEnum,
  GlobalConst,
} from '../AppState';
import { readBackground } from '../storage/backgroundFile';
import { reportFailure } from '../reporting';
import { patch, read } from './appStore';

export const setNetInfo = (state: NetInfoState): boolean => {
  const { isConnected, type, isConnectionExpensive } = read().netInfo;
  const expensive = state.details && state.details.isConnectionExpensive;
  if (
    isConnected === state.isConnected &&
    type === state.type &&
    isConnectionExpensive === expensive
  ) {
    return false;
  }
  patch({
    netInfo: {
      isConnected: state.isConnected,
      type: state.type,
      isConnectionExpensive: expensive,
    },
  });
  return true;
};

export const fetchNetInfo = async (): Promise<void> => {
  setNetInfo(await NetInfo.fetch());
};

export const watchNetInfo = (
  onChange?: (state: NetInfoState, previousConnected: boolean | null) => void,
): (() => void) => {
  const unsubscribe = NetInfo.addEventListener(state => {
    const previousConnected = read().netInfo.isConnected ?? null;
    if (setNetInfo(state)) {
      onChange?.(state, previousConnected);
    }
  });
  return () => unsubscribe?.();
};

export const markBackground = (inBackground: boolean): Promise<void> =>
  AsyncStorage.setItem(
    GlobalConst.background,
    inBackground ? GlobalConst.yes : GlobalConst.no,
  );

export const fetchBackgroundSyncing = async (): Promise<void> => {
  const background: BackgroundType = await readBackground();
  const current = read().background;
  if (isEqual(current, background)) {
    return;
  }
  if (background.error && background.error !== current.error) {
    reportFailure('Background Sync Error', background.error);
  }
  patch({ background });
};

export const isForeground = (status: AppStateStatus): boolean =>
  status === AppStateStatusEnum.active;

export const isResting = (status: AppStateStatus): boolean =>
  status === AppStateStatusEnum.inactive ||
  status === AppStateStatusEnum.background;

export const watchAppState = (
  onChange: (next: AppStateStatus, prior: AppStateStatus) => void,
  initial: AppStateStatus = AppState.currentState,
): (() => void) => {
  let prior: AppStateStatus = initial;
  const subscription = AppState.addEventListener(
    EventListenerEnum.change,
    next => {
      const before = prior;
      prior = next;
      onChange(next, before);
    },
  );
  return () => subscription?.remove?.();
};

export const watchBackgroundFlag = (onForeground?: () => void): (() => void) =>
  watchAppState(async (next, prior) => {
    if (isResting(prior) && isForeground(next)) {
      await markBackground(false);
      onForeground?.();
    } else if (isForeground(prior) && isResting(next)) {
      await markBackground(true);
    }
  });
