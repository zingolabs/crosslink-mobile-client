import React, { useRef, useState, useEffect } from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  Linking,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { isEqual } from 'lodash';
import NetInfo, {
  NetInfoState,
} from '@react-native-community/netinfo/src/index';
import {
  activateKeepAwake,
  deactivateKeepAwake,
} from '@sayem314/react-native-keep-awake';

import WalletService from '../wallet';
import RPCModule from '../RPCModule';
import { StakingDayActivitySync } from '../StakingDayActivity';
import {
  AppStateLoaded,
  TotalBalanceClass,
  SendPageState,
  emptyToAddr,
  InfoType,
  ZecPriceType,
  BackgroundType,
  TranslateType,
  ServerType,
  SecurityType,
  LanguageEnum,
  CurrencyEnum,
  SelectServerEnum,
  ChainNameEnum,
  RouteEnum,
  SnackbarType,
  AppStateStatusEnum,
  GlobalConst,
  EventListenerEnum,
  NetInfoType,
  WalletType,
  BackgroundErrorType,
  ValueTransferType,
  ValueTransferKindEnum,
  CurrencyNameEnum,
  UnifiedAddressClass,
  TransparentAddressClass,
  AddressKindEnum,
  ScreenEnum,
  LaunchingModeEnum,
  StakeType,
  StakingActionType,
  WalletBondsType,
  ScheduledActionType,
  StakingActionKindEnum,
} from '../AppState';
import Utils from '../utils';
import { readSettings, writeSettings } from '../storage/settingsFile';
import { LoadedDomains, SessionDomainsProvider } from '../context';
import { parseZcashURI } from '../uris';
import { readBackground } from '../storage/backgroundFile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '../createAlert';
import Snackbars from '../../components/Components/Snackbars';
import { RPCSeedType } from '../wallet/types/RPCSeedType';
import { Launching, useLifecycle } from '../lifecycle';
import simpleBiometrics from '../simpleBiometrics';
import ShowAddressAlertAsync from '../../components/Send/components/ShowAddressAlertAsync';
import {
  createUpdateRecoveryWalletInfo,
  removeRecoveryWalletInfo,
} from '../recoveryWalletInfov10';
import notifee, { EventType } from '@notifee/react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from 'react-native-toastier';
import { RPCSyncStatusType } from '../wallet/types/RPCSyncStatusType';
import { RPCUfvkType } from '../wallet/types/RPCUfvkType';
import { RPCPerformanceLevelEnum } from '../wallet/enums/RPCPerformanceLevelEnum';
import { SessionStackParamList } from '../types';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Send from '../../components/Send';
import Receive from '../../components/Receive';
import Faucet from '../../components/Faucet';
import { MainTabs } from './components/MainTabs';
import Computing from './components/Computing';
import ValueTransferDetail from '../../components/History/components/ValueTransferDetail';
import ScannerAddress from '../../components/Send/components/ScannerAddress';
import ComputingOK from './components/ComputingOK';
import ComputingError from './components/ComputingError';
import { AddStakeScreen, Unstake } from '../../components/Staking';
import { StakeJsonToTypeType } from '../AppState/types/ValueTransferType';
import Distribution from '../../components/Distribution';
import SyncReport from '../../components/SyncReport';
import Redelegate from '../../components/Staking/components/Redelegate';
import Finalizers from '../../components/Finalizers/Finalizers';
import { reverseHex32Bytes } from '../utils/hex';
import SettingsNavigator from '../../components/Settings/SettingsNavigator';
import {
  readScheduledActions,
  removeScheduledAction,
  resetScheduledActions,
} from '../storage/scheduledActionsFile';
import ScheduledActionDetail from '../../components/ScheduledActions/ScheduledActionDetail';
import { FinalizerDetail } from '../../components/Staking/Finalizers/FinalizerDetail';
import { scheduleReminder } from '../../components/Staking/components/scheduleReminder';
import { report, reportFailure } from '../reporting';
import { BootstrappedSettings } from '../settingsBootstrap';
import { BootInfo, OpenRequest, SessionHandle } from '../lifecycle/phase';
import type { LifecycleActions } from '../lifecycle/LifecycleProvider';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';

const SessionStack = createNativeStackNavigator<SessionStackParamList>();

const navigationRef = createNavigationContainerRef<SessionStackParamList>();

type SessionClassProps = {
  boot: BootInfo;
  settings: BootstrappedSettings;
  session: SessionHandle;
  gated: boolean;
  translate: (key: string) => TranslateType;
  actions: LifecycleActions;
  zenniesDonationAddress: string;
};

type SessionState = AppStateLoaded & LoadedDomains;

const buildInitialState = (
  props: SessionClassProps,
  callbacks: Pick<
    SessionState,
    | 'getUfvk'
    | 'setBackgroundError'
    | 'addLastSnackbar'
    | 'removeFirstSnackbar'
    | 'doRefresh'
    | 'setZecPrice'
    | 'setPrivacyOption'
    | 'requestFaucetFunds'
    | 'setScheduledActions'
  >,
): SessionState => ({
  //context
  netInfo: {} as NetInfoType,
  totalBalance: null,
  staked: [],
  globalStaked: [],
  walletBonds: [],
  addresses: null,
  valueTransfers: null,
  valueTransfersTotal: null,
  messages: null,
  messagesTotal: null,
  getUfvk: callbacks.getUfvk,
  info: {
    currencyName:
      props.settings.indexerServer.chainName === ChainNameEnum.mainChainName
        ? CurrencyNameEnum.ZEC
        : CurrencyNameEnum.cTAZ,
    chainName: props.settings.indexerServer.chainName,
    serverUri: props.settings.indexerServer.uri,
  } as InfoType,
  syncingStatus: {} as RPCSyncStatusType,
  wallet: {} as WalletType,
  defaultUnifiedAddress: '',
  zecPrice: {
    zecPrice: 0,
    date: 0,
  } as ZecPriceType,
  background: {
    batches: 0,
    message: '',
    date: 0,
    dateEnd: 0,
  } as BackgroundType,
  translate: props.translate,
  backgroundError: {} as BackgroundErrorType,
  setBackgroundError: callbacks.setBackgroundError,
  readOnly: props.session.walletKind.readOnly,
  lastError: '',
  orchardPool: props.session.walletKind.orchardPool,
  saplingPool: props.session.walletKind.saplingPool,
  transparentPool: props.session.walletKind.transparentPool,
  snackbars: [] as SnackbarType[],
  addLastSnackbar: callbacks.addLastSnackbar,
  removeFirstSnackbar: callbacks.removeFirstSnackbar,
  somePending: false,
  shieldingAmount: 0,
  showSwipeableIcons: true,
  doRefresh: callbacks.doRefresh,
  setZecPrice: callbacks.setZecPrice,
  zenniesDonationAddress: props.zenniesDonationAddress,
  zingolibVersion: '',
  setPrivacyOption: callbacks.setPrivacyOption,
  requestFaucetFunds: callbacks.requestFaucetFunds,
  stakingDay: false,
  timeToStakingDaySeconds: 0,
  timeLeftStakingDaySeconds: 0,
  blocksToStakingDay: 0,
  blocksLeftStakingDay: 0,
  blocksTotalStakingDay: 0,
  scheduledActions: {} as ScheduledActionType[],
  setScheduledActions: callbacks.setScheduledActions,

  // context settings
  ...props.settings,

  // state
  appStateStatus:
    Platform.OS === GlobalConst.platformOSios
      ? AppStateStatusEnum.active
      : AppState.currentState,
  scrollToTop: false,
  scrollToBottom: false,
});

let initialUrlConsumed = false;

export default function Session() {
  const { lifecycle, translate, actions } = useLifecycle();
  const [gateFailed, setGateFailed] = useState<boolean>(false);
  const [gateAttempt, setGateAttempt] = useState<number>(0);
  const [zenniesDonationAddress, setZenniesDonationAddress] =
    useState<string>('');

  useEffect(() => {
    (async () => {
      if (lifecycle.phase !== 'active' && lifecycle.phase !== 'locked') {
        return;
      }
      await writeSettings('firstInstall', false);
      await writeSettings('version', translate('version') as string);
      const zenniesAddress = await Utils.getZenniesDonationAddress(
        lifecycle.boot.settings.indexerServer.chainName,
      );
      setZenniesDonationAddress(zenniesAddress);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gated = lifecycle.phase === 'locked';

  useEffect(() => {
    if (!gated) {
      return;
    }
    let cancelled = false;
    (async () => {
      const passed = (await simpleBiometrics({ translate })) !== false;
      if (cancelled) {
        return;
      }
      if (passed) {
        actions.unlockGate();
      } else {
        setGateFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gated, gateAttempt]);

  if (lifecycle.phase !== 'active' && lifecycle.phase !== 'locked') {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <SessionClass
        boot={lifecycle.boot}
        settings={lifecycle.boot.settings}
        session={lifecycle.session}
        gated={gated}
        translate={translate}
        actions={actions}
        zenniesDonationAddress={zenniesDonationAddress}
      />
      {gated && (
        <View style={StyleSheet.absoluteFill}>
          <Launching
            empty={true}
            translate={translate}
            firstLaunchingMessage={lifecycle.session.launching}
            biometricsFailed={gateFailed}
            tryAgain={() => {
              setGateFailed(false);
              setGateAttempt(n => n + 1);
            }}
          />
        </View>
      )}
    </View>
  );
}

export const SessionClass: React.FC<SessionClassProps> = props => {
  const screenName = ScreenEnum.Session;

  const subscriptionsRef = useRef<(() => void)[]>([]);
  const blockTimesRef = useRef<number[]>([
    props.session &&
    props.settings.indexerServer.chainName === ChainNameEnum.regtestChainName
      ? 10
      : 30,
  ]);
  const lastBlockTimestampRef = useRef<number | null>(null);
  const lastKnownBlockRef = useRef<number | null>(null);
  const prevLatestBlockRef = useRef<number | undefined>(undefined);
  const prevGatedRef = useRef(props.gated);
  const mountedRef = useRef(false);

  // The callbacks stored in the initial state must be declared before the
  // lazy state initializer below captures them.

  const getUfvk = async (): Promise<string> => {
    let wallet = await WalletService.rpcFetchWallet(true);
    return wallet.ufvk || '';
  };

  const setBackgroundError = (title: string, error: string) => {
    patchState({ backgroundError: { title, error } });
  };

  const addLastSnackbar = (snackbar: SnackbarType) => {
    setState(prev => {
      const last = prev.snackbars[prev.snackbars.length - 1];
      if (last && last.message === snackbar.message) {
        return prev;
      }
      return { ...prev, snackbars: [...prev.snackbars, snackbar] };
    });
  };

  const removeFirstSnackbar = (screen: ScreenEnum) => {
    patchState(({ snackbars }) => ({
      snackbars: snackbars
        .filter((s: SnackbarType) => s.screenName.includes(screen))
        .slice(1),
    }));
  };

  const doRefresh = (screen: ScreenEnum) => {
    //console.log('================== MANUAL REFRESH ================== ', screen);
    if (screen === ScreenEnum.History || screen === ScreenEnum.ContactList) {
      // Value Transfers
      walletService.fetchTandZandOValueTransfers();
    } else {
      // Messeges
      walletService.fetchTandZandOMessages();
    }
  };

  const setZecPrice = (newZecPrice: number, newDate: number) => {
    //console.log(this.state.zecPrice, newZecPrice);
    const zecPrice = {
      zecPrice: newZecPrice,
      date: newDate,
    } as ZecPriceType;
    if (!isEqual(stateRef.current.zecPrice, zecPrice)) {
      //console.log('fetch zec price');
      patchState({ zecPrice });
    }
  };

  const setPrivacyOption = async (value: boolean): Promise<void> => {
    await writeSettings('privacy', value);
    patchState({
      privacy: value as boolean,
    });
  };

  const requestFaucetFunds = async (address: string): Promise<string> => {
    try {
      const resp = await walletService.requestFaucetFunds(address);
      return resp;
    } catch (err) {
      console.log(`Error: ${err}`);
      return `Error: ${err}`;
    }
  };

  const setScheduledActions = (scheduledActions: ScheduledActionType[]) => {
    patchState({
      scheduledActions,
    });
  };

  const [state, setState] = useState<SessionState>(() =>
    buildInitialState(props, {
      getUfvk,
      setBackgroundError,
      addLastSnackbar,
      removeFirstSnackbar,
      doRefresh,
      setZecPrice,
      setPrivacyOption,
      requestFaucetFunds,
      setScheduledActions,
    }),
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const patchState = (
    part:
      | Partial<SessionState>
      | ((prev: SessionState) => Partial<SessionState>),
  ) => {
    setState(prev => ({
      ...prev,
      ...(typeof part === 'function' ? part(prev) : part),
    }));
  };

  useEffect(() => {
    startSession();
    subscribe();
    handleInitialUrl();
    handleInitialNotification();
    return () => {
      unsubscribe();
      keepAwake(false);
      walletService.clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatSeconds = (totalSeconds: number): string => {
    const safeSeconds = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${minutes}min ${seconds}sec`;
  };

  const getAverageBlockTime = (): number => {
    if (blockTimesRef.current.length === 0) {
      return 0;
    }

    const sum = blockTimesRef.current.reduce((acc, value) => acc + value, 0);
    return sum / blockTimesRef.current.length;
  };

  const stakingDayCalculation = async () => {
    const latest = stateRef.current.info.latestBlock ?? 0;

    const cycle = 150;
    const activeWindow = 70;

    const mod = latest % cycle;
    const isStakingDay = mod < activeWindow;
    const remaining = isStakingDay ? 0 : cycle - mod;
    const left = isStakingDay ? activeWindow - mod : 0;

    console.log('BLOCKS', remaining, left);

    const avgBlockTime = getAverageBlockTime();

    const newSeconds = remaining * avgBlockTime;

    // delete any redelegation action if needed
    let actions = await readScheduledActions();
    if (
      actions.filter(sa => sa.kind === StakingActionKindEnum.Move).length > 0
    ) {
      actions
        .filter(sa => sa.kind === StakingActionKindEnum.Move)
        .forEach(async sa => {
          await removeScheduledAction(sa.id);
        });
      actions = await readScheduledActions();
    }

    // when the Staking day begins, the App re-schedule
    // the existent notification for the next Staking Day.
    // And do this in every new block.
    if (newSeconds > 0) {
      const numberActions = actions.length;
      if (numberActions > 0) {
        await scheduleReminder({
          seconds: newSeconds,
          numberActions: numberActions,
        });
      }
    }

    patchState({
      stakingDay: isStakingDay,
      timeToStakingDaySeconds: remaining * avgBlockTime,
      timeLeftStakingDaySeconds: left * avgBlockTime,
      blocksToStakingDay: remaining,
      blocksLeftStakingDay: left,
      blocksTotalStakingDay: cycle - activeWindow,
    });
  };

  const navigateTo = <RouteName extends keyof SessionStackParamList>(
    screen: RouteName,
    params?: SessionStackParamList[RouteName],
  ) => {
    (navigationRef.navigate as (...args: unknown[]) => void)(screen, params);
  };

  const openScheduledTab = () => {
    navigateTo(RouteEnum.MainTabs, {
      screen: RouteEnum.StakingHome,
      params: { tab: 'scheduled' },
    });
  };

  const startSession = async () => {
    await stakingDayCalculation();

    setScheduledActions(await readScheduledActions());

    const netInfoState = await NetInfo.fetch();
    patchState({
      netInfo: {
        isConnected: netInfoState.isConnected,
        type: netInfoState.type,
        isConnectionExpensive:
          netInfoState.details && netInfoState.details.isConnectionExpensive,
      },
    });

    // not for fresh installing
    if (props.session.launching !== LaunchingModeEnum.installing) {
      // migration from Z1 to Z2. Wallet version 32 (first of Z2).
      const version = await walletService.getWalletVersion();
      if (version && version < 32) {
        Alert.alert(
          `${stateRef.current.translate('loadedapp.migration-title')} v:${version}`,
          stateRef.current.translate('loadedapp.migration-body') as string,
        );
      }
    }

    //console.log('DID MOUNT APPLOADED...');

    // Configure the wallet service to start doing refreshes
    await walletService.clearTimers();
    await walletService.configure();
  };

  const subscribe = () => {
    const appState = AppState.addEventListener(
      EventListenerEnum.change,
      handleAppStateChange,
    );
    const linking = Linking.addEventListener(EventListenerEnum.url, ({ url }) =>
      handleUrl(url),
    );
    const netInfo = NetInfo.addEventListener(handleNetInfoChange);
    const notifee_ = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        handleNotificationDeeplink(detail.notification?.data?.deeplink);
      }
    });
    subscriptionsRef.current = [
      () => appState?.remove?.(),
      () => linking?.remove?.(),
      netInfo,
      notifee_,
    ];
  };

  const unsubscribe = () => {
    subscriptionsRef.current.forEach(off => typeof off === 'function' && off());
    subscriptionsRef.current = [];
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const priorAppState = stateRef.current.appStateStatus;
    if (Platform.OS === GlobalConst.platformOSios) {
      if (
        (priorAppState === AppStateStatusEnum.inactive &&
          nextAppState === AppStateStatusEnum.active) ||
        (priorAppState === AppStateStatusEnum.active &&
          nextAppState === AppStateStatusEnum.inactive)
      ) {
        //console.log('LOADED SAVED IOS do nothing', nextAppState);
        patchState({ appStateStatus: nextAppState });
        return;
      }
      if (
        priorAppState === AppStateStatusEnum.inactive &&
        nextAppState === AppStateStatusEnum.background
      ) {
        console.log('App LOADED IOS is gone to the background!');
        patchState({ appStateStatus: nextAppState });
        // setting value for background task Android
        await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
        //console.log('&&&&& background yes in storage &&&&&');
        await walletService.clearTimers();
        //console.log('clear timers IOS');
        setSyncingStatus({} as RPCSyncStatusType);
        //console.log('clear sync status state');
        //console.log('LOADED SAVED IOS background', nextAppState);
        // We need to save the wallet file here because
        // sometimes the App can lose the last synced chunk
        await RPCModule.doSave();
        return;
      }
    }
    if (Platform.OS === GlobalConst.platformOSandroid) {
      if (priorAppState !== nextAppState) {
        //console.log('LOADED SAVED Android', nextAppState);
        patchState({ appStateStatus: nextAppState });
      }
    }
    if (
      (priorAppState === AppStateStatusEnum.inactive ||
        priorAppState === AppStateStatusEnum.background) &&
      nextAppState === AppStateStatusEnum.active
    ) {
      //console.log('App LOADED Android & IOS has come to the foreground!');
      if (Platform.OS === GlobalConst.platformOSios) {
        //console.log('LOADED SAVED IOS foreground', nextAppState);
        patchState({ appStateStatus: nextAppState });
      }
      // (PIN or TouchID or FaceID) — gate the session, the wrapper runs the
      // challenge and unlocks on success.
      if (stateRef.current.security.foregroundApp) {
        props.actions.lockGate();
        return;
      }
      // reading background task info
      await fetchBackgroundSyncing();
      // setting value for background task Android
      await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
      // needs this because when the App go from back to fore
      // it have to re-launch all the tasks.
      await walletService.clearTimers();
      await walletService.configure();
      if (
        stateRef.current.backgroundError &&
        (stateRef.current.backgroundError.title ||
          stateRef.current.backgroundError.error)
      ) {
        Alert.alert(
          stateRef.current.backgroundError.title,
          stateRef.current.backgroundError.error,
        );
        setBackgroundError('', '');
      }
    } else if (
      priorAppState === AppStateStatusEnum.active &&
      (nextAppState === AppStateStatusEnum.inactive ||
        nextAppState === AppStateStatusEnum.background)
    ) {
      console.log('App LOADED is gone to the background!');
      // setting value for background task Android
      await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
      //console.log('&&&&& background yes in storage &&&&&');
      await walletService.clearTimers();
      //console.log('clear timers');
      setSyncingStatus({} as RPCSyncStatusType);
      //console.log('clear sync status state');
      // We need to save the wallet file here because
      // sometimes the App can lose the last synced chunk
      await RPCModule.doSave();
      if (Platform.OS === GlobalConst.platformOSios) {
        //console.log('LOADED SAVED IOS background', nextAppState);
        patchState({ appStateStatus: nextAppState });
      }
    } else {
      if (Platform.OS === GlobalConst.platformOSios) {
        if (priorAppState !== nextAppState) {
          //console.log('LOADED SAVED IOS', nextAppState);
          patchState({ appStateStatus: nextAppState });
        }
      }
    }
  };

  const handleInitialUrl = async () => {
    if (initialUrlConsumed) {
      return;
    }
    initialUrlConsumed = true;
    const initialUrl = await Linking.getInitialURL();
    await handleUrl(initialUrl);
  };

  const handleUrl = async (url: string | null) => {
    if (!url) {
      return;
    }
    const filled = await readUrl(url);
    if (filled) {
      navigateTo(RouteEnum.Send);
    }
  };

  const handleNetInfoChange = async (netInfoState: NetInfoState) => {
    const { isConnected, type, isConnectionExpensive } =
      stateRef.current.netInfo;
    if (
      isConnected !== netInfoState.isConnected ||
      type !== netInfoState.type ||
      isConnectionExpensive !== netInfoState.details?.isConnectionExpensive
    ) {
      //console.log('fetch net info');
      patchState({
        netInfo: {
          isConnected: netInfoState.isConnected,
          type: netInfoState.type,
          isConnectionExpensive:
            netInfoState.details && netInfoState.details.isConnectionExpensive,
        },
      });
      if (isConnected !== netInfoState.isConnected) {
        if (!netInfoState.isConnected) {
          //console.log('EVENT Loaded: No internet connection.');
        } else {
          //console.log('EVENT Loaded: YES internet connection.');
          // restart the interval process again...
          await walletService.clearTimers();
          await walletService.configure();
        }
      }
    }
  };

  const handleInitialNotification = async () => {
    const initialNotification = await notifee.getInitialNotification();
    handleNotificationDeeplink(
      initialNotification?.notification.data?.deeplink,
    );
  };

  const handleNotificationDeeplink = (deeplink: unknown) => {
    if (deeplink === 'delegator://reminder-opened') {
      openScheduledTab();
    }
  };

  useEffect(() => {
    const prevGated = prevGatedRef.current;
    prevGatedRef.current = props.gated;
    (async () => {
      if (prevGated !== props.gated) {
        if (props.gated) {
          await walletService.clearTimers();
          setSyncingStatus({} as RPCSyncStatusType);
        } else {
          await fetchBackgroundSyncing();
          await walletService.clearTimers();
          await walletService.configure();
          if (
            stateRef.current.backgroundError &&
            (stateRef.current.backgroundError.title ||
              stateRef.current.backgroundError.error)
          ) {
            Alert.alert(
              stateRef.current.backgroundError.title,
              stateRef.current.backgroundError.error,
            );
            setBackgroundError('', '');
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.gated]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevLatestBlockRef.current = state.info.latestBlock;
      return;
    }
    const prevBlock = prevLatestBlockRef.current;
    const currentBlock = state.info.latestBlock;
    prevLatestBlockRef.current = currentBlock;
    if (prevBlock !== currentBlock) {
      const now = Date.now();

      if (
        lastBlockTimestampRef.current !== null &&
        lastKnownBlockRef.current !== null &&
        currentBlock !== undefined &&
        currentBlock > lastKnownBlockRef.current
      ) {
        const elapsedSeconds = (now - lastBlockTimestampRef.current) / 1000;
        const blockDiff = currentBlock - lastKnownBlockRef.current;
        const secondsPerBlock = elapsedSeconds / blockDiff;

        blockTimesRef.current.push(secondsPerBlock);

        if (blockTimesRef.current.length > 100) {
          blockTimesRef.current.shift();
        }
      }

      console.log(blockTimesRef.current);

      if (currentBlock !== undefined) {
        lastBlockTimestampRef.current = now;
        lastKnownBlockRef.current = currentBlock;
      }

      stakingDayCalculation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.info.latestBlock]);

  const keepAwake = (keep: boolean): void => {
    if (keep) {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
    }
  };

  const readUrl = async (url: string): Promise<boolean> => {
    let filled = false;
    if (
      url &&
      url.startsWith(GlobalConst.zcash) &&
      !stateRef.current.readOnly
    ) {
      const { error, target } = await parseZcashURI(
        url,
        stateRef.current.translate,
        stateRef.current.indexerServer,
      );
      //console.log(targets);

      if (target) {
        let update = false;
        const currentRoute = navigationRef.getCurrentRoute();
        const draftTo =
          currentRoute?.name === RouteEnum.Send
            ? currentRoute.params?.toaddr.to
            : '';
        if (draftTo && target.address && draftTo !== target.address) {
          await ShowAddressAlertAsync(stateRef.current.translate)
            .then(async () => {
              // fill the fields in the screen with the donation data
              update = true;
            })
            .catch(() => {});
        } else if (target.address) {
          // fill the fields in the screen with the donation data
          update = true;
        }
        if (update) {
          // redo the to addresses
          const to = emptyToAddr();

          to.to = target.address || '';
          to.amount = target.amount
            ? Utils.parseNumberFloatToStringLocale(target.amount, 8)
            : '';
          to.memo = target.memoString || '';

          navigateTo(RouteEnum.Send, { toaddr: to });
          filled = true;
        }
      }
      if (error) {
        addLastSnackbar({ message: error, screenName: [screenName] });
      }
    }
    return filled;
  };

  const fetchBackgroundSyncing = async () => {
    const backgroundJson: BackgroundType = await readBackground();
    if (!isEqual(stateRef.current.background, backgroundJson)) {
      if (
        backgroundJson.error &&
        backgroundJson.error !== stateRef.current.background.error
      ) {
        reportFailure('Background Sync Error', backgroundJson.error);
      }
      //console.log('fetch background sync info');
      patchState({ background: backgroundJson });
    }
  };

  const setShieldingAmount = (value: number) => {
    //const start = Date.now();
    patchState({ shieldingAmount: value });
    //console.log('=========================================== > SH AMOUNT STORED SETSTATE - ', Date.now() - start);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setShowSwipeableIcons = (value: boolean) => {
    patchState({ showSwipeableIcons: value });
  };

  const setTotalBalance = (totalBalance: TotalBalanceClass) => {
    if (!isEqual(stateRef.current.totalBalance, totalBalance)) {
      //console.log('fetch total balance');
      //const start = Date.now();
      patchState({ totalBalance });
      //console.log('=========================================== > BALANCE STORED SETSTATE - ', Date.now() - start);
    }
  };

  const setStaked = (staked: StakeType[]) => {
    if (!isEqual(stateRef.current.staked, staked)) {
      //console.log('fetch staked');
      //const start = Date.now();
      patchState({ staked });
      //console.log('=========================================== > STAKED STORED SETSTATE - ', Date.now() - start);
    }
  };

  const setGlobalStaked = (globalStaked: StakeType[]) => {
    if (!isEqual(stateRef.current.globalStaked, globalStaked)) {
      //console.log('fetch global staked');
      //const start = Date.now();
      patchState({ globalStaked });
      //console.log('=========================================== > GLOBAL STAKED STORED SETSTATE - ', Date.now() - start);
    }
  };

  const setWalletBonds = (walletBonds: WalletBondsType[]) => {
    if (!isEqual(stateRef.current.walletBonds, walletBonds)) {
      //console.log('fetch wallet bonds');
      //const start = Date.now();
      patchState({ walletBonds });
      //console.log('=========================================== > WALLET BONDS STORED SETSTATE - ', Date.now() - start);
    }
  };

  const setSyncingStatus = (syncingStatus: RPCSyncStatusType) => {
    // here is a good place to fetch the background task info
    fetchBackgroundSyncing();
    if (!isEqual(stateRef.current.syncingStatus, syncingStatus)) {
      //console.log('fetch syncing status report');
      //const start = Date.now();
      patchState({ syncingStatus });
      //console.log('=========================================== > SYNC STATUS STORED SETSTATE - ', Date.now() - start);
    }
  };

  const setValueTransfersList = async (
    valueTransfers: ValueTransferType[],
    valueTransfersTotal: number,
  ) => {
    //console.log('VALUE TRANSFERS', valueTransfers);
    const basicFirstViewSeed = (await readSettings()).basicFirstViewSeed;

    if (!basicFirstViewSeed) {
      await writeSettings('basicFirstViewSeed', true);
    }
    if (
      !isEqual(stateRef.current.valueTransfers, valueTransfers) ||
      stateRef.current.valueTransfersTotal !== valueTransfersTotal
    ) {
      // set somePending as well here when I know there is something new in ValueTransfers
      const pending: number =
        valueTransfersTotal > 0
          ? valueTransfers.filter(
              (vt: ValueTransferType) =>
                vt.confirmations >= 0 &&
                vt.confirmations < GlobalConst.minConfirmations,
            ).length
          : 0;
      // if a ValueTransfer go from 3 confirmations to > 3 -> Show a message about a ValueTransfer is confirmed
      stateRef.current.valueTransfers &&
        stateRef.current.valueTransfersTotal !== null &&
        stateRef.current.valueTransfersTotal > 0 &&
        stateRef.current.valueTransfers
          .filter((vtOld: ValueTransferType) => vtOld.confirmations === 0) // not confirmed
          .forEach(async (vtOld: ValueTransferType) => {
            const vtNew = valueTransfers.filter(
              (vt: ValueTransferType) =>
                vt.txid === vtOld.txid &&
                vt.address === vtOld.address &&
                vt.poolType === vtOld.poolType,
            );
            //console.log('old', vtOld);
            //console.log('new', vtNew);
            // the ValueTransfer is confirmed when the confirmations are > 0
            if (vtNew.length > 0 && vtNew[0].confirmations > 0) {
              let message: string = '';
              let title: string = '';
              if (
                (vtNew[0].kind === ValueTransferKindEnum.Received ||
                  vtNew[0].kind === ValueTransferKindEnum.WithdrawBond) &&
                vtNew[0].amount > 0
              ) {
                message =
                  (stateRef.current.translate(
                    'loadedapp.incoming-funds',
                  ) as string) +
                  (stateRef.current.translate('history.received') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  stateRef.current.info.currencyName;
                title = stateRef.current.translate(
                  'loadedapp.receive-menu',
                ) as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.MemoToSelf &&
                vtNew[0].fee &&
                vtNew[0].fee > 0
              ) {
                message =
                  (stateRef.current.translate(
                    'loadedapp.valuetransfer-confirmed',
                  ) as string) +
                  (stateRef.current.translate('history.memotoself') as string) +
                  (vtNew[0].fee
                    ? ((' ' +
                        stateRef.current.translate('send.fee')) as string) +
                      ' ' +
                      Utils.parseNumberFloatToStringLocale(vtNew[0].fee, 8) +
                      ' ' +
                      stateRef.current.info.currencyName
                    : '');
                title = stateRef.current.translate(
                  'loadedapp.send-menu',
                ) as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.SendToSelf &&
                vtNew[0].fee &&
                vtNew[0].fee > 0
              ) {
                message =
                  (stateRef.current.translate(
                    'loadedapp.valuetransfer-confirmed',
                  ) as string) +
                  (stateRef.current.translate('history.sendtoself') as string) +
                  (vtNew[0].fee
                    ? ((' ' +
                        stateRef.current.translate('send.fee')) as string) +
                      ' ' +
                      Utils.parseNumberFloatToStringLocale(vtNew[0].fee, 8) +
                      ' ' +
                      stateRef.current.info.currencyName
                    : '');
                title = stateRef.current.translate(
                  'loadedapp.send-menu',
                ) as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.Rejection &&
                vtNew[0].amount > 0
              ) {
                // not so sure about this `kind`...
                // I guess the wallet is receiving some refund from a TEX sent.
                message =
                  (stateRef.current.translate(
                    'loadedapp.incoming-funds',
                  ) as string) +
                  (stateRef.current.translate('history.received') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  stateRef.current.info.currencyName;
                title = stateRef.current.translate(
                  'loadedapp.receive-menu',
                ) as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.Shield &&
                vtNew[0].amount > 0
              ) {
                message =
                  (stateRef.current.translate(
                    'loadedapp.incoming-funds',
                  ) as string) +
                  (stateRef.current.translate('history.shield') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  stateRef.current.info.currencyName;
                title = stateRef.current.translate(
                  'loadedapp.receive-menu',
                ) as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.Sent &&
                vtNew[0].amount > 0
              ) {
                message =
                  (stateRef.current.translate(
                    'loadedapp.payment-made',
                  ) as string) +
                  (stateRef.current.translate('history.sent') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  stateRef.current.info.currencyName;
                title = stateRef.current.translate(
                  'loadedapp.send-menu',
                ) as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.CreateBond &&
                vtNew[0].amount > 0
              ) {
                message =
                  (stateRef.current.translate(
                    'loadedapp.payment-made',
                  ) as string) +
                  'Staked' +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  stateRef.current.info.currencyName;
                title = stateRef.current.translate(
                  'loadedapp.send-menu',
                ) as string;
              }
              if (message && title) {
                createAlert(
                  setBackgroundError,
                  addLastSnackbar,
                  [screenName],
                  title,
                  message,
                  true,
                );
              }
              // here I know a new transaction is confirmed
              // lets check the scheduled actions & remove it
              if (
                stateRef.current.scheduledActions.filter(
                  sa => sa.txid === vtNew[0].txid,
                ).length > 0
              ) {
                const list = await removeScheduledAction(
                  stateRef.current.scheduledActions.filter(
                    sa => sa.txid === vtNew[0].txid,
                  )[0].id,
                );
                setScheduledActions(list);
                if (list.length === 0) {
                  await notifee.cancelAllNotifications();
                }
              }
            }
            // the ValueTransfer is gone -> Likely Reverted by the server
            // this is really confusing...
            //if (vtNew.length === 0) {
            //  createAlert(
            //    this.setBackgroundError,
            //    this.addLastSnackbar,
            //    [this.screenName],
            //    this.state.translate('loadedapp.send-menu') as string,
            //    this.state.translate('loadedapp.valuetransfer-reverted') as string,
            //    true,
            //    this.state.translate,
            //  );
            //}
          });
      // if some tx is confirmed the UI needs some time to
      // acomodate the bottom tabs.
      //const start = Date.now();
      setTimeout(
        () => {
          patchState({
            valueTransfers,
            somePending: pending > 0,
            valueTransfersTotal,
          });
        },
        pending === 0 ? 250 : 0,
      );
      //console.log(
      //  '=========================================== > VALUE TRANSFERS STORED SETSTATE - ',
      //  Date.now() - start,
      //);
    }
  };

  const setMessagesList = (
    messages: ValueTransferType[],
    messagesTotal: number,
  ) => {
    if (
      !isEqual(stateRef.current.messages, messages) ||
      stateRef.current.messagesTotal !== messagesTotal
    ) {
      //console.log('fetch messages');
      //const start = Date.now();
      patchState({ messages, messagesTotal });
      //console.log('=========================================== > MESSAGES STORED SETSTATE - ', Date.now() - start);
    }
  };

  const setAllAddresses = (
    addresses: (UnifiedAddressClass | TransparentAddressClass)[],
  ) => {
    if (!isEqual(stateRef.current.addresses, addresses)) {
      //console.log('fetch addresses');
      //const start = Date.now();
      patchState({ addresses });
      //console.log('=========================================== > ADDRESSES STORED SETSTATE - ', Date.now() - start);
    }
    if (addresses.length > 0) {
      // the last Unified Address created.
      const defaultUAArray = addresses.filter(
        (a: UnifiedAddressClass | TransparentAddressClass) =>
          a.addressKind === AddressKindEnum.u,
      );
      const defaultUA: string =
        defaultUAArray[defaultUAArray.length - 1].address;
      if (stateRef.current.defaultUnifiedAddress !== defaultUA) {
        patchState({ defaultUnifiedAddress: defaultUA });
      }
    } else {
      patchState({ defaultUnifiedAddress: '' });
    }
  };

  const setInfo = (newInfo: InfoType) => {
    if (!isEqual(stateRef.current.info, newInfo)) {
      // if currencyName is empty,
      // I need to rescue the last value from the state,
      // or rescue the value from server.chainName.
      if (!newInfo.currencyName) {
        if (stateRef.current.info.currencyName) {
          newInfo.currencyName = stateRef.current.info.currencyName;
        } else {
          newInfo.currencyName =
            stateRef.current.indexerServer.chainName ===
            ChainNameEnum.mainChainName
              ? CurrencyNameEnum.ZEC
              : CurrencyNameEnum.cTAZ;
        }
      }
      if (!newInfo.chainName) {
        newInfo.chainName = stateRef.current.indexerServer.chainName;
      }
      if (!newInfo.serverUri) {
        newInfo.serverUri = stateRef.current.indexerServer.uri;
      }
      patchState({ info: newInfo });
    }
  };

  const setZingolibVersion = (newZingolibVersion: string) => {
    if (!stateRef.current.zingolibVersion) {
      patchState({ zingolibVersion: newZingolibVersion });
    }
  };

  const sendTransaction = async (
    sendPageState: SendPageState,
  ): Promise<String> => {
    try {
      // Construct a sendJson from the sendPage state
      const { indexerServer, donation, defaultUnifiedAddress } =
        stateRef.current;
      const sendJson = await Utils.getSendManyJSON(
        sendPageState,
        defaultUnifiedAddress,
        indexerServer,
        donation,
      );
      //const start = Date.now();
      const txid = await walletService.sendTransaction(sendJson);
      //console.log('&&&&&&&&&&&&&& send tx', Date.now() - start);

      return txid;
    } catch (err) {
      //console.log('route sendtx error', err);
      throw err;
    }
  };

  // Send a staking transaction using the send page state + staking action
  const stakeTransaction = async (
    sendPageState: SendPageState,
    stakingAction: StakingActionType,
  ): Promise<string> => {
    try {
      const stakeJson: StakeJsonToTypeType = {
        stakingAction,
        receivers: [],
      };

      const txid = await walletService.sendStakingTransaction(stakeJson);
      return txid;
    } catch (err) {
      throw err;
    }
  };

  const beginUnstakeTransaction = async (
    createBondTxid: string,
  ): Promise<string> => {
    try {
      const txid = await walletService.sendBeginUnstakingTx(createBondTxid);
      return txid;
    } catch (err) {
      throw err;
    }
  };

  const withdrawBondTransaction = async (
    createBondTxid: string,
  ): Promise<string> => {
    try {
      const txid = await walletService.sendWithdrawBondTx(createBondTxid);
      return txid;
    } catch (err) {
      throw err;
    }
  };

  const redelegateTransaction = async (
    bondKey: string,
    finalizer: string,
  ): Promise<string> => {
    try {
      const txid = await walletService.sendRetargetBondTx(
        bondKey,
        reverseHex32Bytes(finalizer),
      );
      return txid;
    } catch (err) {
      throw err;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const doRescan = async () => {
    // in the rescan case if the shield button is visible
    // we need to hide it fast.
    setShieldingAmount(0);
    await walletService.refreshSync(true);
  };

  const setWallet = async (wallet: WalletType) => {
    //console.log(wallet, this.state.readOnly);
    if (!isEqual(stateRef.current.wallet, wallet)) {
      //const start = Date.now();
      patchState({ wallet });
      //console.log('=========================================== > WALLET STORED SETSTATE - ', Date.now() - start);
    }
  };

  const setServerOption = async (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ): Promise<void> => {
    // here I know the server was changed, clean all the tasks before anything.
    await walletService.clearTimers();
    setSyncingStatus({} as RPCSyncStatusType);
    keepAwake(false);
    // First we need to check the `chainName` between servers, if this is different
    // we cannot try to open the current wallet, because make not sense.
    let error = false;
    if (!sameServerChainName) {
      error = true;
    } else {
      // when I try to open the wallet in the new server:
      // - the seed doesn't exists (the type of sever is different `main` / `test` / `regtest` ...).
      //   The App have to go to the initial screen
      // - the seed exists and the App can open the wallet in the new server.
      //   But I have to restart the sync if needed.
      let result: string = await RPCModule.loadExistingWallet(
        value.uri,
        // 'regtest',
        value.chainName,
        stateRef.current.performanceLevel,
        GlobalConst.minConfirmations.toString(),
      );
      //console.log('load existing wallet', result);
      if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
        try {
          // here result can have an `error` field for watch-only which is actually OK.
          const resultJson: RPCSeedType & RPCUfvkType =
            await JSON.parse(result);
          if (!resultJson.error) {
            // Load the wallet and navigate to the ValueTransfers screen
            //console.log(`wallet loaded ok ${value.uri}`);
            if (toast && selectServer !== SelectServerEnum.offline) {
              addLastSnackbar({
                message: `${stateRef.current.translate('loadedapp.readingwallet')} ${value.uri}`,
                screenName: [screenName],
              });
            }
            await writeSettings('indexerServer', value);
            await writeSettings('selectIndexerServer', selectServer);
            await writeSettings('indexerServerPinned', true);
            patchState({
              indexerServer: value,
              selectIndexerServer: selectServer,
            });
            // the server is changed, the App needs to restart the timeout tasks from the beginning
            await walletService.clearTimers();
            await walletService.configure();
            // creating tor cliente if needed
            // we have two buttons to fetch -> we need tor client Just in case.
            if (
              stateRef.current.currency === CurrencyEnum.USDTORCurrency ||
              stateRef.current.currency === CurrencyEnum.USDCurrency
            ) {
              const resp: string = await RPCModule.createTorClientProcess();
              if (resp && resp.toLowerCase().startsWith(GlobalConst.error)) {
                setLastError(`Create tor client error: ${resp}`);
              }
            }
            return;
          } else {
            error = true;
          }
        } catch (e) {
          error = true;
        }
      } else {
        error = true;
      }
    }

    // if the chainName is different between server or we cannot open the wallet...
    if (error) {
      if (toast) {
        addLastSnackbar({
          message: `${stateRef.current.translate('loadedapp.readingwallet-error')} ${value.uri}`,
          screenName: [screenName],
        });
      }

      // we need to restore the old server because the new one doesn't have the seed of the current wallet.
      const oldSettings = await readSettings();
      if (oldSettings.indexerServer && oldSettings.selectIndexerServer) {
        await RPCModule.changeServerProcess(oldSettings.indexerServer.uri);
        patchState({
          indexerServer: oldSettings.indexerServer,
          selectIndexerServer: oldSettings.selectIndexerServer,
        });
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setCurrencyOption = async (value: CurrencyEnum): Promise<void> => {
    await writeSettings('currency', value);
    patchState({
      currency: value as CurrencyEnum,
    });

    if (
      value === CurrencyEnum.USDTORCurrency ||
      value === CurrencyEnum.USDCurrency
    ) {
      // when the user select USD
      // the App have to create a Tor Client
      //console.log('before CREATE ------------------- TOR CLIENT');
      const result = await RPCModule.createTorClientProcess();
      //console.log('after CREATE ------------------- TOR CLIENT', result);
      if (result && result.toLowerCase().startsWith(GlobalConst.error)) {
        setLastError(`Create tor client error: ${result}`);
      }
    } else {
      //console.log('before REMOVE ------------------- TOR CLIENT');
      const result = await RPCModule.removeTorClientProcess();
      //console.log('after REMOVE ------------------- TOR CLIENT', result);
      if (result && result.toLowerCase().startsWith(GlobalConst.error)) {
        setLastError(`Remove tor client error: ${result}`);
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setLanguageOption = async (
    value: string,
    reset: boolean,
  ): Promise<void> => {
    await writeSettings('language', value as LanguageEnum);
    patchState({
      language: value as LanguageEnum,
    });
    if (reset) {
      restartSession({ kind: 'open' });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setSendAllOption = async (value: boolean): Promise<void> => {
    await writeSettings('sendAll', value);
    patchState({
      sendAll: value as boolean,
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setDonationOption = async (value: boolean): Promise<void> => {
    await writeSettings('donation', value);
    patchState({
      donation: value as boolean,
    });
  };

  const setSecurityOption = async (value: SecurityType): Promise<void> => {
    await writeSettings('security', value);
    patchState({
      security: value as SecurityType,
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setSelectServerOption = async (value: string): Promise<void> => {
    await writeSettings('selectIndexerServer', value as SelectServerEnum);
    patchState({
      selectIndexerServer: value as SelectServerEnum,
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setRescanMenuOption = async (value: boolean): Promise<void> => {
    await writeSettings('rescanMenu', value);
    patchState({
      rescanMenu: value as boolean,
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setRecoveryWalletInfoOnDeviceOption = async (
    value: boolean,
  ): Promise<void> => {
    await writeSettings('recoveryWalletInfoOnDevice', value);
    patchState({
      recoveryWalletInfoOnDevice: value as boolean,
    });

    if (!value) {
      await removeRecoveryWalletInfo();
    } else {
      const wallet: WalletType = await WalletService.rpcFetchWallet(
        stateRef.current.readOnly,
      );
      await createUpdateRecoveryWalletInfo(wallet);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setPerformanceLevelOption = async (
    value: RPCPerformanceLevelEnum,
  ): Promise<void> => {
    await writeSettings('performanceLevel', value);
    patchState({
      performanceLevel: value as RPCPerformanceLevelEnum,
    });

    // change it in zingolib as well.
    const setConfigWallet = await RPCModule.setConfigWalletToProdProcess(
      stateRef.current.performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );
    console.log(
      '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ SET CONFIG WALLET',
      setConfigWallet,
    );
    if (
      setConfigWallet &&
      setConfigWallet.toLowerCase().startsWith(GlobalConst.error)
    ) {
      setLastError(`Set performance level error: ${setConfigWallet}`);
    }
  };

  const restartSession = async (request?: OpenRequest) => {
    await walletService.clearTimers();
    props.actions.leaveSession(request);
  };

  const recoverWalletFromSeed = async (
    walletSeed: string,
    walletBirthday: number,
  ) => {
    await onClickOKChangeWallet({
      kind: 'restore',
      seed: walletSeed,
      birthday: walletBirthday,
    });
  };

  const onClickOKChangeWallet = async (request?: OpenRequest) => {
    const { indexerServer } = stateRef.current;

    // if the App is working with a test server
    // no need to do backups of the wallets.
    let resultStr = '';
    if (indexerServer.chainName === ChainNameEnum.mainChainName) {
      // backup
      resultStr = (await walletService.changeWallet()) as string;
    } else {
      // no backup
      resultStr = (await walletService.changeWalletNoBackup()) as string;
    }

    //console.log("jc change", resultStr);
    if (resultStr && resultStr.toLowerCase().startsWith(GlobalConst.error)) {
      //console.log(`Error change wallet. ${resultStr}`);
      reportFailure(
        stateRef.current.translate('loadedapp.changingwallet-label') as string,
        resultStr,
      );
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        [screenName],
        stateRef.current.translate('loadedapp.changingwallet-label') as string,
        resultStr,
        false,
      );
      return;
    }

    await resetScheduledActions();
    setScheduledActions([]);
    await notifee.cancelAllNotifications();

    keepAwake(false);
    restartSession(request);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onClickOKRestoreBackup = async () => {
    const resultStr = (await walletService.restoreBackup()) as string;

    //console.log("jc restore", resultStr);
    if (resultStr && resultStr.toLowerCase().startsWith(GlobalConst.error)) {
      //console.log(`Error restore backup wallet. ${resultStr}`);
      reportFailure(
        stateRef.current.translate('loadedapp.restoringwallet-label') as string,
        resultStr,
      );
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        [screenName],
        stateRef.current.translate('loadedapp.restoringwallet-label') as string,
        resultStr,
        false,
      );
      return;
    }

    await resetScheduledActions();
    setScheduledActions([]);
    await notifee.cancelAllNotifications();

    keepAwake(false);
    restartSession({ kind: 'open' });
  };

  const setLastError = (error: string) => {
    if (error === stateRef.current.lastError) {
      return;
    }
    report(new Error(error));
    patchState({ lastError: error });
  };

  const setScrollToTop = (value: boolean) => {
    patchState({
      scrollToTop: value,
    });
  };

  const setScrollToBottom = (value: boolean) => {
    patchState({
      scrollToBottom: value,
    });
  };

  const walletServiceRef = useRef<WalletService | null>(null);
  if (walletServiceRef.current === null) {
    walletServiceRef.current = new WalletService(
      setTotalBalance,
      setStaked,
      setGlobalStaked,
      setWalletBonds,
      setValueTransfersList,
      setMessagesList,
      setAllAddresses,
      setInfo,
      setSyncingStatus,
      props.translate,
      keepAwake,
      setZingolibVersion,
      setWallet,
      setLastError,
      recoverWalletFromSeed,
      props.session.walletKind.readOnly,
      props.settings.indexerServer,
      props.settings.performanceLevel,
    );
  }
  const walletService = walletServiceRef.current;

  const { snackbars, scrollToTop } = state;

  const context = {
    //context
    netInfo: state.netInfo,
    wallet: state.wallet,
    totalBalance: state.totalBalance,
    staked: state.staked,
    globalStaked: state.globalStaked,
    walletBonds: state.walletBonds,
    addresses: state.addresses,
    valueTransfers: state.valueTransfers,
    valueTransfersTotal: state.valueTransfersTotal,
    messages: state.messages,
    messagesTotal: state.messagesTotal,
    syncingStatus: state.syncingStatus,
    info: state.info,
    zecPrice: state.zecPrice,
    defaultUnifiedAddress: state.defaultUnifiedAddress,
    background: state.background,
    translate: state.translate,
    backgroundError: state.backgroundError,
    setBackgroundError: state.setBackgroundError,
    readOnly: state.readOnly,
    lastError: state.lastError,
    orchardPool: state.orchardPool,
    saplingPool: state.saplingPool,
    transparentPool: state.transparentPool,
    snackbars: state.snackbars,
    addLastSnackbar: state.addLastSnackbar,
    removeFirstSnackbar: state.removeFirstSnackbar,
    shieldingAmount: state.shieldingAmount,
    somePending: state.somePending,
    showSwipeableIcons: state.showSwipeableIcons,
    doRefresh: state.doRefresh,
    setZecPrice: state.setZecPrice,
    zenniesDonationAddress: state.zenniesDonationAddress,
    zingolibVersion: state.zingolibVersion,
    setPrivacyOption,
    requestFaucetFunds,
    stakingDay: state.stakingDay,
    timeToStakingDaySeconds: state.timeToStakingDaySeconds,
    timeLeftStakingDaySeconds: state.timeLeftStakingDaySeconds,
    blocksToStakingDay: state.blocksToStakingDay,
    blocksLeftStakingDay: state.blocksLeftStakingDay,
    blocksTotalStakingDay: state.blocksTotalStakingDay,
    scheduledActions: state.scheduledActions,
    setScheduledActions: state.setScheduledActions,
    getUfvk,

    // context settings
    indexerServer: state.indexerServer,
    selectIndexerServer: state.selectIndexerServer,
    currency: state.currency,
    language: state.language,
    sendAll: state.sendAll,
    donation: state.donation,
    privacy: state.privacy,
    security: state.security,
    rescanMenu: state.rescanMenu,
    recoveryWalletInfoOnDevice: state.recoveryWalletInfoOnDevice,
    performanceLevel: state.performanceLevel,
  };

  //console.log('render LoadedApp');

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <SessionDomainsProvider value={context}>
        <StakingDayActivitySync />
        <GestureHandlerRootView>
          <NavigationContainer ref={navigationRef}>
            <SessionStack.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'simple_push',
              }}
            >
              <SessionStack.Screen name={RouteEnum.MainTabs}>
                {() => (
                  <MainTabs
                    scrollToTop={scrollToTop}
                    setScrollToTop={setScrollToTop}
                    setScrollToBottom={setScrollToBottom}
                    setShieldingAmount={setShieldingAmount}
                  />
                )}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.Send}>
                {stackProps => (
                  <Send
                    setShieldingAmount={setShieldingAmount}
                    setScrollToTop={setScrollToTop}
                    setScrollToBottom={setScrollToBottom}
                    setServerOption={setServerOption}
                    setSecurityOption={setSecurityOption}
                    {...stackProps}
                    sendTransaction={sendTransaction}
                  />
                )}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.Receive}>
                {stackProps => (
                  <Receive
                    setSecurityOption={setSecurityOption}
                    {...stackProps}
                  />
                )}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.Distribution}>
                {stackProps => <Distribution {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.SyncReport}>
                {stackProps => <SyncReport {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen
                name={RouteEnum.Finalizers}
                options={{ presentation: 'modal' }}
              >
                {stackProps => <Finalizers {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.Faucet}>
                {stackProps => <Faucet {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.Computing}>
                {stackProps => <Computing {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.ComputingOK}>
                {stackProps => <ComputingOK {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.ComputingError}>
                {stackProps => <ComputingError {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.ValueTransferDetail}>
                {stackProps => <ValueTransferDetail {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.FinalizerDetail}>
                {stackProps => <FinalizerDetail {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.ScannerAddress}>
                {stackProps => <ScannerAddress {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.SettingsStack}>
                {stackProps => (
                  <SettingsNavigator
                    {...stackProps}
                    onClickOKChangeWallet={() => onClickOKChangeWallet()}
                    leaveSession={() => restartSession()}
                  />
                )}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.Stake}>
                {stackProps => <AddStakeScreen {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.Unstake}>
                {stackProps => <Unstake {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.Redelegate}>
                {stackProps => <Redelegate {...stackProps} />}
              </SessionStack.Screen>

              <SessionStack.Screen name={RouteEnum.ScheduledActionDetail}>
                {stackProps => (
                  <ScheduledActionDetail
                    {...stackProps}
                    beginUnstakeTransaction={beginUnstakeTransaction}
                    withdrawBondTransaction={withdrawBondTransaction}
                    stakeTransaction={stakeTransaction}
                    redelegateTransaction={redelegateTransaction}
                  />
                )}
              </SessionStack.Screen>
            </SessionStack.Navigator>
          </NavigationContainer>
        </GestureHandlerRootView>
      </SessionDomainsProvider>
    </ToastProvider>
  );
};
