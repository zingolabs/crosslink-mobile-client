import React, { Component, useState, useEffect } from 'react';
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
  emptySendPageState,
  InfoType,
  ToAddr,
  emptyToAddr,
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
import BackgroundFileImpl from '../../components/Background';
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
import ScheduledActionsFileImpl from '../../components/ScheduledActions/ScheduledActionsFileImpl';
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

export class SessionClass extends Component<SessionClassProps, SessionState> {
  walletService: WalletService;
  subscriptions: (() => void)[] = [];
  screenName = ScreenEnum.Session;

  private lastBlockTimestamp: number | null = null;
  private lastKnownBlock: number | null = null;
  // 10 seconds by default for regtest
  // 30 seconds by default for testnet, who knows.
  private blockTimes: number[] = [
    this.props.session &&
    this.props.settings.indexerServer.chainName ===
      ChainNameEnum.regtestChainName
      ? 10
      : 30,
  ];

  constructor(props: SessionClassProps) {
    super(props);

    this.state = {
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
      sendPageState: emptySendPageState(),
      setSendPageState: this.setSendPageState,
      getUfvk: this.getUfvk,
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
      setBackgroundError: this.setBackgroundError,
      readOnly: props.session.walletKind.readOnly,
      lastError: '',
      orchardPool: props.session.walletKind.orchardPool,
      saplingPool: props.session.walletKind.saplingPool,
      transparentPool: props.session.walletKind.transparentPool,
      snackbars: [] as SnackbarType[],
      addLastSnackbar: this.addLastSnackbar,
      removeFirstSnackbar: this.removeFirstSnackbar,
      somePending: false,
      shieldingAmount: 0,
      showSwipeableIcons: true,
      doRefresh: this.doRefresh,
      setZecPrice: this.setZecPrice,
      zenniesDonationAddress: props.zenniesDonationAddress,
      zingolibVersion: '',
      setPrivacyOption: this.setPrivacyOption,
      requestFaucetFunds: this.requestFaucetFunds,
      stakingDay: false,
      timeToStakingDaySeconds: 0,
      timeLeftStakingDaySeconds: 0,
      blocksToStakingDay: 0,
      blocksLeftStakingDay: 0,
      blocksTotalStakingDay: 0,
      scheduledActions: {} as ScheduledActionType[],
      setScheduledActions: this.setScheduledActions,

      // context settings
      ...props.settings,

      // state
      appStateStatus:
        Platform.OS === GlobalConst.platformOSios
          ? AppStateStatusEnum.active
          : AppState.currentState,
      scrollToTop: false,
      scrollToBottom: false,
    };

    this.walletService = new WalletService(
      this.setTotalBalance,
      this.setStaked,
      this.setGlobalStaked,
      this.setWalletBonds,
      this.setValueTransfersList,
      this.setMessagesList,
      this.setAllAddresses,
      this.setInfo,
      this.setSyncingStatus,
      props.translate,
      this.keepAwake,
      this.setZingolibVersion,
      this.setWallet,
      this.setLastError,
      this.recoverWalletFromSeed,
      props.session.walletKind.readOnly,
      props.settings.indexerServer,
      props.settings.performanceLevel,
    );
  }

  private formatSeconds = (totalSeconds: number): string => {
    const safeSeconds = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${minutes}min ${seconds}sec`;
  };

  private getAverageBlockTime = (): number => {
    if (this.blockTimes.length === 0) {
      return 0;
    }

    const sum = this.blockTimes.reduce((acc, value) => acc + value, 0);
    return sum / this.blockTimes.length;
  };

  stakingDayCalculation = async () => {
    const latest = this.state.info.latestBlock ?? 0;

    const cycle = 150;
    const activeWindow = 70;

    const mod = latest % cycle;
    const isStakingDay = mod < activeWindow;
    const remaining = isStakingDay ? 0 : cycle - mod;
    const left = isStakingDay ? activeWindow - mod : 0;

    console.log('BLOCKS', remaining, left);

    const avgBlockTime = this.getAverageBlockTime();

    const newSeconds = remaining * avgBlockTime;

    // delete any redelegation action if needed
    let actions = await ScheduledActionsFileImpl.listActions();
    if (
      actions.filter(sa => sa.kind === StakingActionKindEnum.Move).length > 0
    ) {
      actions
        .filter(sa => sa.kind === StakingActionKindEnum.Move)
        .forEach(async sa => {
          await ScheduledActionsFileImpl.removeAction(sa.id);
        });
      actions = await ScheduledActionsFileImpl.listActions();
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

    this.setState({
      stakingDay: isStakingDay,
      timeToStakingDaySeconds: remaining * avgBlockTime,
      timeLeftStakingDaySeconds: left * avgBlockTime,
      blocksToStakingDay: remaining,
      blocksLeftStakingDay: left,
      blocksTotalStakingDay: cycle - activeWindow,
    });
  };

  navigateTo = <RouteName extends keyof SessionStackParamList>(
    screen: RouteName,
    params?: SessionStackParamList[RouteName],
  ) => {
    (navigationRef.navigate as (...args: unknown[]) => void)(screen, params);
  };

  openScheduledTab = () => {
    this.navigateTo(RouteEnum.MainTabs, {
      screen: RouteEnum.StakingHome,
      params: { tab: 'scheduled' },
    });
  };

  componentDidMount = async () => {
    await this.startSession();
    this.subscribe();
    await this.handleInitialUrl();
    await this.handleInitialNotification();
  };

  startSession = async () => {
    await this.stakingDayCalculation();

    this.setScheduledActions(await ScheduledActionsFileImpl.listActions());

    const netInfoState = await NetInfo.fetch();
    this.setState({
      netInfo: {
        isConnected: netInfoState.isConnected,
        type: netInfoState.type,
        isConnectionExpensive:
          netInfoState.details && netInfoState.details.isConnectionExpensive,
      },
    });

    // not for fresh installing
    if (this.props.session.launching !== LaunchingModeEnum.installing) {
      // migration from Z1 to Z2. Wallet version 32 (first of Z2).
      const version = await this.walletService.getWalletVersion();
      if (version && version < 32) {
        Alert.alert(
          `${this.state.translate('loadedapp.migration-title')} v:${version}`,
          this.state.translate('loadedapp.migration-body') as string,
        );
      }
    }

    //console.log('DID MOUNT APPLOADED...');

    // Configure the wallet service to start doing refreshes
    await this.walletService.clearTimers();
    await this.walletService.configure();

    this.clearToAddr();
  };

  subscribe = () => {
    const appState = AppState.addEventListener(
      EventListenerEnum.change,
      this.handleAppStateChange,
    );
    const linking = Linking.addEventListener(EventListenerEnum.url, ({ url }) =>
      this.handleUrl(url),
    );
    const netInfo = NetInfo.addEventListener(this.handleNetInfoChange);
    const notifee_ = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        this.handleNotificationDeeplink(detail.notification?.data?.deeplink);
      }
    });
    this.subscriptions = [
      () => appState?.remove?.(),
      () => linking?.remove?.(),
      netInfo,
      notifee_,
    ];
  };

  unsubscribe = () => {
    this.subscriptions.forEach(off => typeof off === 'function' && off());
    this.subscriptions = [];
  };

  handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const priorAppState = this.state.appStateStatus;
    if (Platform.OS === GlobalConst.platformOSios) {
      if (
        (priorAppState === AppStateStatusEnum.inactive &&
          nextAppState === AppStateStatusEnum.active) ||
        (priorAppState === AppStateStatusEnum.active &&
          nextAppState === AppStateStatusEnum.inactive)
      ) {
        //console.log('LOADED SAVED IOS do nothing', nextAppState);
        this.setState({ appStateStatus: nextAppState });
        return;
      }
      if (
        priorAppState === AppStateStatusEnum.inactive &&
        nextAppState === AppStateStatusEnum.background
      ) {
        console.log('App LOADED IOS is gone to the background!');
        this.setState({ appStateStatus: nextAppState });
        // setting value for background task Android
        await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
        //console.log('&&&&& background yes in storage &&&&&');
        await this.walletService.clearTimers();
        //console.log('clear timers IOS');
        this.setSyncingStatus({} as RPCSyncStatusType);
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
        this.setState({ appStateStatus: nextAppState });
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
        this.setState({ appStateStatus: nextAppState });
      }
      // (PIN or TouchID or FaceID) — gate the session, the wrapper runs the
      // challenge and unlocks on success.
      if (this.state.security.foregroundApp) {
        this.props.actions.lockGate();
        return;
      }
      // reading background task info
      await this.fetchBackgroundSyncing();
      // setting value for background task Android
      await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
      // needs this because when the App go from back to fore
      // it have to re-launch all the tasks.
      await this.walletService.clearTimers();
      await this.walletService.configure();
      if (
        this.state.backgroundError &&
        (this.state.backgroundError.title || this.state.backgroundError.error)
      ) {
        Alert.alert(
          this.state.backgroundError.title,
          this.state.backgroundError.error,
        );
        this.setBackgroundError('', '');
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
      await this.walletService.clearTimers();
      //console.log('clear timers');
      this.setSyncingStatus({} as RPCSyncStatusType);
      //console.log('clear sync status state');
      // We need to save the wallet file here because
      // sometimes the App can lose the last synced chunk
      await RPCModule.doSave();
      if (Platform.OS === GlobalConst.platformOSios) {
        //console.log('LOADED SAVED IOS background', nextAppState);
        this.setState({ appStateStatus: nextAppState });
      }
    } else {
      if (Platform.OS === GlobalConst.platformOSios) {
        if (priorAppState !== nextAppState) {
          //console.log('LOADED SAVED IOS', nextAppState);
          this.setState({ appStateStatus: nextAppState });
        }
      }
    }
  };

  handleInitialUrl = async () => {
    if (initialUrlConsumed) {
      return;
    }
    initialUrlConsumed = true;
    const initialUrl = await Linking.getInitialURL();
    await this.handleUrl(initialUrl);
  };

  handleUrl = async (url: string | null) => {
    if (!url) {
      return;
    }
    const filled = await this.readUrl(url);
    if (filled) {
      this.navigateTo(RouteEnum.Send);
    }
  };

  handleNetInfoChange = async (state: NetInfoState) => {
    const { isConnected, type, isConnectionExpensive } = this.state.netInfo;
    if (
      isConnected !== state.isConnected ||
      type !== state.type ||
      isConnectionExpensive !== state.details?.isConnectionExpensive
    ) {
      //console.log('fetch net info');
      this.setState({
        netInfo: {
          isConnected: state.isConnected,
          type: state.type,
          isConnectionExpensive:
            state.details && state.details.isConnectionExpensive,
        },
      });
      if (isConnected !== state.isConnected) {
        if (!state.isConnected) {
          //console.log('EVENT Loaded: No internet connection.');
        } else {
          //console.log('EVENT Loaded: YES internet connection.');
          // restart the interval process again...
          await this.walletService.clearTimers();
          await this.walletService.configure();
        }
      }
    }
  };

  handleInitialNotification = async () => {
    const initialNotification = await notifee.getInitialNotification();
    this.handleNotificationDeeplink(
      initialNotification?.notification.data?.deeplink,
    );
  };

  handleNotificationDeeplink = (deeplink: unknown) => {
    if (deeplink === 'delegator://reminder-opened') {
      this.openScheduledTab();
    }
  };

  componentDidUpdate = async (
    prevProps: Readonly<SessionClassProps>,
    prevState: Readonly<SessionState>,
  ) => {
    if (prevProps.gated !== this.props.gated) {
      if (this.props.gated) {
        await this.walletService.clearTimers();
        this.setSyncingStatus({} as RPCSyncStatusType);
      } else {
        await this.fetchBackgroundSyncing();
        await this.walletService.clearTimers();
        await this.walletService.configure();
        if (
          this.state.backgroundError &&
          (this.state.backgroundError.title || this.state.backgroundError.error)
        ) {
          Alert.alert(
            this.state.backgroundError.title,
            this.state.backgroundError.error,
          );
          this.setBackgroundError('', '');
        }
      }
    }

    const prevBlock = prevState.info.latestBlock;
    const currentBlock = this.state.info.latestBlock;

    if (prevBlock !== currentBlock) {
      const now = Date.now();

      if (
        this.lastBlockTimestamp !== null &&
        this.lastKnownBlock !== null &&
        currentBlock !== undefined &&
        currentBlock > this.lastKnownBlock
      ) {
        const elapsedSeconds = (now - this.lastBlockTimestamp) / 1000;
        const blockDiff = currentBlock - this.lastKnownBlock;
        const secondsPerBlock = elapsedSeconds / blockDiff;

        this.blockTimes.push(secondsPerBlock);

        if (this.blockTimes.length > 100) {
          this.blockTimes.shift();
        }
      }

      console.log(this.blockTimes);

      if (currentBlock !== undefined) {
        this.lastBlockTimestamp = now;
        this.lastKnownBlock = currentBlock;
      }

      await this.stakingDayCalculation();
    }
  };

  componentWillUnmount = async () => {
    this.unsubscribe();
    this.keepAwake(false);
    await this.walletService.clearTimers();
  };

  keepAwake = (keep: boolean): void => {
    if (keep) {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
    }
  };

  readUrl = async (url: string): Promise<boolean> => {
    let filled = false;
    if (url && url.startsWith(GlobalConst.zcash) && !this.state.readOnly) {
      const { error, target } = await parseZcashURI(
        url,
        this.state.translate,
        this.state.indexerServer,
      );
      //console.log(targets);

      if (target) {
        let update = false;
        if (
          this.state.sendPageState.toaddr.to &&
          target.address &&
          this.state.sendPageState.toaddr.to !== target.address
        ) {
          await ShowAddressAlertAsync(this.state.translate)
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
          const newSendPageState = emptySendPageState();
          let uriToAddr: ToAddr = emptyToAddr();
          [target].forEach(tgt => {
            const to = emptyToAddr();

            to.to = tgt.address || '';
            to.amount = tgt.amount
              ? Utils.parseNumberFloatToStringLocale(tgt.amount, 8)
              : '';
            to.memo = tgt.memoString || '';

            uriToAddr = to;
          });

          newSendPageState.toaddr = uriToAddr;

          this.setSendPageState(newSendPageState);
          filled = true;
        }
      }
      if (error) {
        this.addLastSnackbar({ message: error, screenName: [this.screenName] });
      }
    }
    return filled;
  };

  fetchBackgroundSyncing = async () => {
    const backgroundJson: BackgroundType =
      await BackgroundFileImpl.readBackground();
    if (!isEqual(this.state.background, backgroundJson)) {
      if (
        backgroundJson.error &&
        backgroundJson.error !== this.state.background.error
      ) {
        reportFailure('Background Sync Error', backgroundJson.error);
      }
      //console.log('fetch background sync info');
      this.setState({ background: backgroundJson });
    }
  };

  setShieldingAmount = (value: number) => {
    //const start = Date.now();
    this.setState({ shieldingAmount: value });
    //console.log('=========================================== > SH AMOUNT STORED SETSTATE - ', Date.now() - start);
  };

  setShowSwipeableIcons = (value: boolean) => {
    this.setState({ showSwipeableIcons: value });
  };

  setTotalBalance = (totalBalance: TotalBalanceClass) => {
    if (!isEqual(this.state.totalBalance, totalBalance)) {
      //console.log('fetch total balance');
      //const start = Date.now();
      this.setState({ totalBalance });
      //console.log('=========================================== > BALANCE STORED SETSTATE - ', Date.now() - start);
    }
  };

  setStaked = (staked: StakeType[]) => {
    if (!isEqual(this.state.staked, staked)) {
      //console.log('fetch staked');
      //const start = Date.now();
      this.setState({ staked });
      //console.log('=========================================== > STAKED STORED SETSTATE - ', Date.now() - start);
    }
  };

  setGlobalStaked = (globalStaked: StakeType[]) => {
    if (!isEqual(this.state.globalStaked, globalStaked)) {
      //console.log('fetch global staked');
      //const start = Date.now();
      this.setState({ globalStaked });
      //console.log('=========================================== > GLOBAL STAKED STORED SETSTATE - ', Date.now() - start);
    }
  };

  setWalletBonds = (walletBonds: WalletBondsType[]) => {
    if (!isEqual(this.state.walletBonds, walletBonds)) {
      //console.log('fetch wallet bonds');
      //const start = Date.now();
      this.setState({ walletBonds });
      //console.log('=========================================== > WALLET BONDS STORED SETSTATE - ', Date.now() - start);
    }
  };

  setSyncingStatus = (syncingStatus: RPCSyncStatusType) => {
    // here is a good place to fetch the background task info
    this.fetchBackgroundSyncing();
    if (!isEqual(this.state.syncingStatus, syncingStatus)) {
      //console.log('fetch syncing status report');
      //const start = Date.now();
      this.setState({ syncingStatus });
      //console.log('=========================================== > SYNC STATUS STORED SETSTATE - ', Date.now() - start);
    }
  };

  setValueTransfersList = async (
    valueTransfers: ValueTransferType[],
    valueTransfersTotal: number,
  ) => {
    //console.log('VALUE TRANSFERS', valueTransfers);
    const basicFirstViewSeed = (await readSettings()).basicFirstViewSeed;

    if (!basicFirstViewSeed) {
      await writeSettings('basicFirstViewSeed', true);
    }
    if (
      !isEqual(this.state.valueTransfers, valueTransfers) ||
      this.state.valueTransfersTotal !== valueTransfersTotal
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
      this.state.valueTransfers &&
        this.state.valueTransfersTotal !== null &&
        this.state.valueTransfersTotal > 0 &&
        this.state.valueTransfers
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
                  (this.state.translate('loadedapp.incoming-funds') as string) +
                  (this.state.translate('history.received') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.state.translate(
                  'loadedapp.receive-menu',
                ) as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.MemoToSelf &&
                vtNew[0].fee &&
                vtNew[0].fee > 0
              ) {
                message =
                  (this.state.translate(
                    'loadedapp.valuetransfer-confirmed',
                  ) as string) +
                  (this.state.translate('history.memotoself') as string) +
                  (vtNew[0].fee
                    ? ((' ' + this.state.translate('send.fee')) as string) +
                      ' ' +
                      Utils.parseNumberFloatToStringLocale(vtNew[0].fee, 8) +
                      ' ' +
                      this.state.info.currencyName
                    : '');
                title = this.state.translate('loadedapp.send-menu') as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.SendToSelf &&
                vtNew[0].fee &&
                vtNew[0].fee > 0
              ) {
                message =
                  (this.state.translate(
                    'loadedapp.valuetransfer-confirmed',
                  ) as string) +
                  (this.state.translate('history.sendtoself') as string) +
                  (vtNew[0].fee
                    ? ((' ' + this.state.translate('send.fee')) as string) +
                      ' ' +
                      Utils.parseNumberFloatToStringLocale(vtNew[0].fee, 8) +
                      ' ' +
                      this.state.info.currencyName
                    : '');
                title = this.state.translate('loadedapp.send-menu') as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.Rejection &&
                vtNew[0].amount > 0
              ) {
                // not so sure about this `kind`...
                // I guess the wallet is receiving some refund from a TEX sent.
                message =
                  (this.state.translate('loadedapp.incoming-funds') as string) +
                  (this.state.translate('history.received') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.state.translate(
                  'loadedapp.receive-menu',
                ) as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.Shield &&
                vtNew[0].amount > 0
              ) {
                message =
                  (this.state.translate('loadedapp.incoming-funds') as string) +
                  (this.state.translate('history.shield') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.state.translate(
                  'loadedapp.receive-menu',
                ) as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.Sent &&
                vtNew[0].amount > 0
              ) {
                message =
                  (this.state.translate('loadedapp.payment-made') as string) +
                  (this.state.translate('history.sent') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.state.translate('loadedapp.send-menu') as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.CreateBond &&
                vtNew[0].amount > 0
              ) {
                message =
                  (this.state.translate('loadedapp.payment-made') as string) +
                  'Staked' +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.state.translate('loadedapp.send-menu') as string;
              }
              if (message && title) {
                createAlert(
                  this.setBackgroundError,
                  this.addLastSnackbar,
                  [this.screenName],
                  title,
                  message,
                  true,
                );
              }
              // here I know a new transaction is confirmed
              // lets check the scheduled actions & remove it
              if (
                this.state.scheduledActions.filter(
                  sa => sa.txid === vtNew[0].txid,
                ).length > 0
              ) {
                const list = await ScheduledActionsFileImpl.removeAction(
                  this.state.scheduledActions.filter(
                    sa => sa.txid === vtNew[0].txid,
                  )[0].id,
                );
                this.setScheduledActions(list);
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
          this.setState({
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

  setMessagesList = (messages: ValueTransferType[], messagesTotal: number) => {
    if (
      !isEqual(this.state.messages, messages) ||
      this.state.messagesTotal !== messagesTotal
    ) {
      //console.log('fetch messages');
      //const start = Date.now();
      this.setState({ messages, messagesTotal });
      //console.log('=========================================== > MESSAGES STORED SETSTATE - ', Date.now() - start);
    }
  };

  setAllAddresses = (
    addresses: (UnifiedAddressClass | TransparentAddressClass)[],
  ) => {
    if (!isEqual(this.state.addresses, addresses)) {
      //console.log('fetch addresses');
      //const start = Date.now();
      this.setState({ addresses });
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
      if (this.state.defaultUnifiedAddress !== defaultUA) {
        this.setState({ defaultUnifiedAddress: defaultUA });
      }
    } else {
      this.setState({ defaultUnifiedAddress: '' });
    }
  };

  setSendPageState = (sendPageState: SendPageState) => {
    //console.log('fetch send page state');
    //const start = Date.now();
    this.setState({ sendPageState });
    //console.log('=========================================== > SEND PAGE STORED SETSTATE - ', Date.now() - start);
  };

  clearToAddr = () => {
    const newToAddr = emptyToAddr();

    // Create the new state object
    const newState = emptySendPageState();
    newState.toaddr = newToAddr;

    this.setSendPageState(newState);
  };

  setZecPrice = (newZecPrice: number, newDate: number) => {
    //console.log(this.state.zecPrice, newZecPrice);
    const zecPrice = {
      zecPrice: newZecPrice,
      date: newDate,
    } as ZecPriceType;
    if (!isEqual(this.state.zecPrice, zecPrice)) {
      //console.log('fetch zec price');
      this.setState({ zecPrice });
    }
  };

  setInfo = (newInfo: InfoType) => {
    if (!isEqual(this.state.info, newInfo)) {
      // if currencyName is empty,
      // I need to rescue the last value from the state,
      // or rescue the value from server.chainName.
      if (!newInfo.currencyName) {
        if (this.state.info.currencyName) {
          newInfo.currencyName = this.state.info.currencyName;
        } else {
          newInfo.currencyName =
            this.state.indexerServer.chainName === ChainNameEnum.mainChainName
              ? CurrencyNameEnum.ZEC
              : CurrencyNameEnum.cTAZ;
        }
      }
      if (!newInfo.chainName) {
        newInfo.chainName = this.state.indexerServer.chainName;
      }
      if (!newInfo.serverUri) {
        newInfo.serverUri = this.state.indexerServer.uri;
      }
      this.setState({ info: newInfo });
    }
  };

  setZingolibVersion = (newZingolibVersion: string) => {
    if (!this.state.zingolibVersion) {
      this.setState({ zingolibVersion: newZingolibVersion });
    }
  };

  sendTransaction = async (
    sendPageState: SendPageState,
  ): Promise<String> => {
    try {
      // Construct a sendJson from the sendPage state
      const { indexerServer, donation, defaultUnifiedAddress } = this.state;
      const sendJson = await Utils.getSendManyJSON(
        sendPageState,
        defaultUnifiedAddress,
        indexerServer,
        donation,
      );
      //const start = Date.now();
      const txid = await this.walletService.sendTransaction(sendJson);
      //console.log('&&&&&&&&&&&&&& send tx', Date.now() - start);

      return txid;
    } catch (err) {
      //console.log('route sendtx error', err);
      throw err;
    }
  };

  // Send a staking transaction using the send page state + staking action
  stakeTransaction = async (
    sendPageState: SendPageState,
    stakingAction: StakingActionType,
  ): Promise<string> => {
    try {
      const stakeJson: StakeJsonToTypeType = {
        stakingAction,
        receivers: [],
      };

      const txid = await this.walletService.sendStakingTransaction(stakeJson);
      return txid;
    } catch (err) {
      throw err;
    }
  };

  beginUnstakeTransaction = async (createBondTxid: string): Promise<string> => {
    try {
      const txid =
        await this.walletService.sendBeginUnstakingTx(createBondTxid);
      return txid;
    } catch (err) {
      throw err;
    }
  };

  withdrawBondTransaction = async (createBondTxid: string): Promise<string> => {
    try {
      const txid = await this.walletService.sendWithdrawBondTx(createBondTxid);
      return txid;
    } catch (err) {
      throw err;
    }
  };

  redelegateTransaction = async (
    bondKey: string,
    finalizer: string,
  ): Promise<string> => {
    try {
      const txid = await this.walletService.sendRetargetBondTx(
        bondKey,
        reverseHex32Bytes(finalizer),
      );
      return txid;
    } catch (err) {
      throw err;
    }
  };

  requestFaucetFunds = async (address: string): Promise<string> => {
    try {
      const resp = await this.walletService.requestFaucetFunds(address);
      return resp;
    } catch (err) {
      console.log(`Error: ${err}`);
      return `Error: ${err}`;
    }
  };

  doRefresh = (screen: ScreenEnum) => {
    //console.log('================== MANUAL REFRESH ================== ', screen);
    if (screen === ScreenEnum.History || screen === ScreenEnum.ContactList) {
      // Value Transfers
      this.walletService.fetchTandZandOValueTransfers();
    } else {
      // Messeges
      this.walletService.fetchTandZandOMessages();
    }
  };

  doRescan = async () => {
    // in the rescan case if the shield button is visible
    // we need to hide it fast.
    this.setShieldingAmount(0);
    await this.walletService.refreshSync(true);
  };

  setWallet = async (wallet: WalletType) => {
    //console.log(wallet, this.state.readOnly);
    if (!isEqual(this.state.wallet, wallet)) {
      //const start = Date.now();
      this.setState({ wallet });
      //console.log('=========================================== > WALLET STORED SETSTATE - ', Date.now() - start);
    }
  };

  setServerOption = async (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ): Promise<void> => {
    // here I know the server was changed, clean all the tasks before anything.
    await this.walletService.clearTimers();
    this.setSyncingStatus({} as RPCSyncStatusType);
    this.keepAwake(false);
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
        this.state.performanceLevel,
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
              this.addLastSnackbar({
                message: `${this.state.translate('loadedapp.readingwallet')} ${value.uri}`,
                screenName: [this.screenName],
              });
            }
            await writeSettings('indexerServer', value);
            await writeSettings('selectIndexerServer', selectServer);
            await writeSettings('indexerServerPinned', true);
            this.setState({
              indexerServer: value,
              selectIndexerServer: selectServer,
            });
            // the server is changed, the App needs to restart the timeout tasks from the beginning
            await this.walletService.clearTimers();
            await this.walletService.configure();
            // creating tor cliente if needed
            // we have two buttons to fetch -> we need tor client Just in case.
            if (
              this.state.currency === CurrencyEnum.USDTORCurrency ||
              this.state.currency === CurrencyEnum.USDCurrency
            ) {
              const resp: string = await RPCModule.createTorClientProcess();
              if (resp && resp.toLowerCase().startsWith(GlobalConst.error)) {
                this.setLastError(`Create tor client error: ${resp}`);
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
        this.addLastSnackbar({
          message: `${this.state.translate('loadedapp.readingwallet-error')} ${value.uri}`,
          screenName: [this.screenName],
        });
      }

      // we need to restore the old server because the new one doesn't have the seed of the current wallet.
      const oldSettings = await readSettings();
      if (oldSettings.indexerServer && oldSettings.selectIndexerServer) {
        await RPCModule.changeServerProcess(oldSettings.indexerServer.uri);
        this.setState({
          indexerServer: oldSettings.indexerServer,
          selectIndexerServer: oldSettings.selectIndexerServer,
        });
      }
    }
  };

  setCurrencyOption = async (value: CurrencyEnum): Promise<void> => {
    await writeSettings('currency', value);
    this.setState({
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
        this.setLastError(`Create tor client error: ${result}`);
      }
    } else {
      //console.log('before REMOVE ------------------- TOR CLIENT');
      const result = await RPCModule.removeTorClientProcess();
      //console.log('after REMOVE ------------------- TOR CLIENT', result);
      if (result && result.toLowerCase().startsWith(GlobalConst.error)) {
        this.setLastError(`Remove tor client error: ${result}`);
      }
    }
  };

  setLanguageOption = async (value: string, reset: boolean): Promise<void> => {
    await writeSettings('language', value as LanguageEnum);
    this.setState({
      language: value as LanguageEnum,
    });
    if (reset) {
      this.restartSession({ kind: 'open' });
    }
  };

  setSendAllOption = async (value: boolean): Promise<void> => {
    await writeSettings('sendAll', value);
    this.setState({
      sendAll: value as boolean,
    });
  };

  setDonationOption = async (value: boolean): Promise<void> => {
    await writeSettings('donation', value);
    this.setState({
      donation: value as boolean,
    });
  };

  setPrivacyOption = async (value: boolean): Promise<void> => {
    await writeSettings('privacy', value);
    this.setState({
      privacy: value as boolean,
    });
  };

  setSecurityOption = async (value: SecurityType): Promise<void> => {
    await writeSettings('security', value);
    this.setState({
      security: value as SecurityType,
    });
  };

  setSelectServerOption = async (value: string): Promise<void> => {
    await writeSettings('selectIndexerServer', value as SelectServerEnum);
    this.setState({
      selectIndexerServer: value as SelectServerEnum,
    });
  };

  setRescanMenuOption = async (value: boolean): Promise<void> => {
    await writeSettings('rescanMenu', value);
    this.setState({
      rescanMenu: value as boolean,
    });
  };

  getUfvk = async (): Promise<string> => {
    let wallet = await WalletService.rpcFetchWallet(true);
    return wallet.ufvk || '';
  };

  setRecoveryWalletInfoOnDeviceOption = async (
    value: boolean,
  ): Promise<void> => {
    await writeSettings('recoveryWalletInfoOnDevice', value);
    this.setState({
      recoveryWalletInfoOnDevice: value as boolean,
    });

    if (!value) {
      await removeRecoveryWalletInfo();
    } else {
      const wallet: WalletType = await WalletService.rpcFetchWallet(
        this.state.readOnly,
      );
      await createUpdateRecoveryWalletInfo(wallet);
    }
  };

  setPerformanceLevelOption = async (
    value: RPCPerformanceLevelEnum,
  ): Promise<void> => {
    await writeSettings('performanceLevel', value);
    this.setState({
      performanceLevel: value as RPCPerformanceLevelEnum,
    });

    // change it in zingolib as well.
    const setConfigWallet = await RPCModule.setConfigWalletToProdProcess(
      this.state.performanceLevel,
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
      this.setLastError(`Set performance level error: ${setConfigWallet}`);
    }
  };

  restartSession = async (request?: OpenRequest) => {
    await this.walletService.clearTimers();
    this.props.actions.leaveSession(request);
  };

  recoverWalletFromSeed = async (
    walletSeed: string,
    walletBirthday: number,
  ) => {
    await this.onClickOKChangeWallet({
      kind: 'restore',
      seed: walletSeed,
      birthday: walletBirthday,
    });
  };

  onClickOKChangeWallet = async (request?: OpenRequest) => {
    const { indexerServer } = this.state;

    // if the App is working with a test server
    // no need to do backups of the wallets.
    let resultStr = '';
    if (indexerServer.chainName === ChainNameEnum.mainChainName) {
      // backup
      resultStr = (await this.walletService.changeWallet()) as string;
    } else {
      // no backup
      resultStr = (await this.walletService.changeWalletNoBackup()) as string;
    }

    //console.log("jc change", resultStr);
    if (resultStr && resultStr.toLowerCase().startsWith(GlobalConst.error)) {
      //console.log(`Error change wallet. ${resultStr}`);
      reportFailure(
        this.state.translate('loadedapp.changingwallet-label') as string,
        resultStr,
      );
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        [this.screenName],
        this.state.translate('loadedapp.changingwallet-label') as string,
        resultStr,
        false,
      );
      return;
    }

    await ScheduledActionsFileImpl.resetSA();
    this.setScheduledActions([]);
    await notifee.cancelAllNotifications();

    this.keepAwake(false);
    this.restartSession(request);
  };

  onClickOKRestoreBackup = async () => {
    const resultStr = (await this.walletService.restoreBackup()) as string;

    //console.log("jc restore", resultStr);
    if (resultStr && resultStr.toLowerCase().startsWith(GlobalConst.error)) {
      //console.log(`Error restore backup wallet. ${resultStr}`);
      reportFailure(
        this.state.translate('loadedapp.restoringwallet-label') as string,
        resultStr,
      );
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        [this.screenName],
        this.state.translate('loadedapp.restoringwallet-label') as string,
        resultStr,
        false,
      );
      return;
    }

    await ScheduledActionsFileImpl.resetSA();
    this.setScheduledActions([]);
    await notifee.cancelAllNotifications();

    this.keepAwake(false);
    this.restartSession({ kind: 'open' });
  };

  setBackgroundError = (title: string, error: string) => {
    this.setState({ backgroundError: { title, error } });
  };

  addLastSnackbar = (snackbar: SnackbarType) => {
    this.setState(({ snackbars }) => {
      const last = snackbars[snackbars.length - 1];
      if (last && last.message === snackbar.message) {
        return null;
      }
      return { snackbars: [...snackbars, snackbar] };
    });
  };

  setLastError = (error: string) => {
    if (error === this.state.lastError) {
      return;
    }
    report(new Error(error));
    this.setState({ lastError: error });
  };

  removeFirstSnackbar = (screenName: ScreenEnum) => {
    this.setState(({ snackbars }) => ({
      snackbars: snackbars
        .filter((s: SnackbarType) => s.screenName.includes(screenName))
        .slice(1),
    }));
  };

  setScrollToTop = (value: boolean) => {
    this.setState({
      scrollToTop: value,
    });
  };

  setScrollToBottom = (value: boolean) => {
    this.setState({
      scrollToBottom: value,
    });
  };

  setScheduledActions = (scheduledActions: ScheduledActionType[]) => {
    this.setState({
      scheduledActions,
    });
  };

  render() {
    const { snackbars, scrollToTop } = this.state;

    const context = {
      //context
      netInfo: this.state.netInfo,
      wallet: this.state.wallet,
      totalBalance: this.state.totalBalance,
      staked: this.state.staked,
      globalStaked: this.state.globalStaked,
      walletBonds: this.state.walletBonds,
      addresses: this.state.addresses,
      valueTransfers: this.state.valueTransfers,
      valueTransfersTotal: this.state.valueTransfersTotal,
      messages: this.state.messages,
      messagesTotal: this.state.messagesTotal,
      syncingStatus: this.state.syncingStatus,
      info: this.state.info,
      zecPrice: this.state.zecPrice,
      defaultUnifiedAddress: this.state.defaultUnifiedAddress,
      sendPageState: this.state.sendPageState,
      setSendPageState: this.state.setSendPageState,
      background: this.state.background,
      translate: this.state.translate,
      backgroundError: this.state.backgroundError,
      setBackgroundError: this.state.setBackgroundError,
      readOnly: this.state.readOnly,
      lastError: this.state.lastError,
      orchardPool: this.state.orchardPool,
      saplingPool: this.state.saplingPool,
      transparentPool: this.state.transparentPool,
      snackbars: this.state.snackbars,
      addLastSnackbar: this.state.addLastSnackbar,
      removeFirstSnackbar: this.state.removeFirstSnackbar,
      shieldingAmount: this.state.shieldingAmount,
      somePending: this.state.somePending,
      showSwipeableIcons: this.state.showSwipeableIcons,
      doRefresh: this.state.doRefresh,
      setZecPrice: this.state.setZecPrice,
      zenniesDonationAddress: this.state.zenniesDonationAddress,
      zingolibVersion: this.state.zingolibVersion,
      setPrivacyOption: this.setPrivacyOption,
      requestFaucetFunds: this.requestFaucetFunds,
      stakingDay: this.state.stakingDay,
      timeToStakingDaySeconds: this.state.timeToStakingDaySeconds,
      timeLeftStakingDaySeconds: this.state.timeLeftStakingDaySeconds,
      blocksToStakingDay: this.state.blocksToStakingDay,
      blocksLeftStakingDay: this.state.blocksLeftStakingDay,
      blocksTotalStakingDay: this.state.blocksTotalStakingDay,
      scheduledActions: this.state.scheduledActions,
      setScheduledActions: this.state.setScheduledActions,
      getUfvk: this.getUfvk,

      // context settings
      indexerServer: this.state.indexerServer,
      selectIndexerServer: this.state.selectIndexerServer,
      currency: this.state.currency,
      language: this.state.language,
      sendAll: this.state.sendAll,
      donation: this.state.donation,
      privacy: this.state.privacy,
      security: this.state.security,
      rescanMenu: this.state.rescanMenu,
      recoveryWalletInfoOnDevice: this.state.recoveryWalletInfoOnDevice,
      performanceLevel: this.state.performanceLevel,
    };

    //console.log('render LoadedApp');

    return (
      <ToastProvider>
        <Snackbars
          snackbars={snackbars}
          removeFirstSnackbar={this.removeFirstSnackbar}
          screenName={this.screenName}
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
                      setScrollToTop={this.setScrollToTop}
                      setScrollToBottom={this.setScrollToBottom}
                      setShieldingAmount={this.setShieldingAmount}
                    />
                  )}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.Send}>
                  {props => (
                    <Send
                      setShieldingAmount={this.setShieldingAmount}
                      setScrollToTop={this.setScrollToTop}
                      setScrollToBottom={this.setScrollToBottom}
                      setServerOption={this.setServerOption}
                      clearToAddr={this.clearToAddr}
                      setSecurityOption={this.setSecurityOption}
                      {...props}
                      sendTransaction={this.sendTransaction}
                    />
                  )}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.Receive}>
                  {props => (
                    <Receive
                      setSecurityOption={this.setSecurityOption}
                      {...props}
                    />
                  )}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.Distribution}>
                  {props => <Distribution {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.SyncReport}>
                  {props => <SyncReport {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen
                  name={RouteEnum.Finalizers}
                  options={{ presentation: 'modal' }}
                >
                  {props => <Finalizers {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.Faucet}>
                  {props => <Faucet {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.Computing}>
                  {props => <Computing {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.ComputingOK}>
                  {props => <ComputingOK {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.ComputingError}>
                  {props => <ComputingError {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.ValueTransferDetail}>
                  {props => <ValueTransferDetail {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.FinalizerDetail}>
                  {props => <FinalizerDetail {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.ScannerAddress}>
                  {props => <ScannerAddress {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.SettingsStack}>
                  {props => (
                    <SettingsNavigator
                      {...props}
                      onClickOKChangeWallet={() => this.onClickOKChangeWallet()}
                      leaveSession={() => this.restartSession()}
                    />
                  )}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.Stake}>
                  {props => <AddStakeScreen {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.Unstake}>
                  {props => <Unstake {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.Redelegate}>
                  {props => <Redelegate {...props} />}
                </SessionStack.Screen>

                <SessionStack.Screen name={RouteEnum.ScheduledActionDetail}>
                  {props => (
                    <ScheduledActionDetail
                      {...props}
                      beginUnstakeTransaction={this.beginUnstakeTransaction}
                      withdrawBondTransaction={this.withdrawBondTransaction}
                      stakeTransaction={this.stakeTransaction}
                      redelegateTransaction={this.redelegateTransaction}
                    />
                  )}
                </SessionStack.Screen>
              </SessionStack.Navigator>
            </NavigationContainer>
          </GestureHandlerRootView>
        </SessionDomainsProvider>
      </ToastProvider>
    );
  }
}
