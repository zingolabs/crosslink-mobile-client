import {
  Alert,
  AppState,
  AppStateStatus,
  Linking,
  Platform,
} from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import { NetInfoState } from '@react-native-community/netinfo/src/index';

import WalletService from '../wallet';
import {
  AppStateStatusEnum,
  ChainNameEnum,
  CurrencyEnum,
  CurrencyNameEnum,
  EventListenerEnum,
  GlobalConst,
  InfoType,
  LaunchingModeEnum,
  RouteEnum,
  ScreenEnum,
  SecurityType,
  SelectServerEnum,
  SendPageState,
  ServerType,
  StakingActionType,
  emptyToAddr,
} from '../AppState';
import { StakeJsonToTypeType } from '../AppState/types/ValueTransferType';
import Utils from '../utils';
import { reverseHex32Bytes } from '../utils/hex';
import { readSettings, writeSettings } from '../storage/settingsFile';
import {
  readScheduledActions,
  resetScheduledActions,
} from '../storage/scheduledActionsFile';
import { parseZcashURI } from '../uris';
import { createAlert } from '../createAlert';
import { reportFailure } from '../reporting';
import { keepAwake } from '../keepAwake';
import ShowAddressAlertAsync from '../../components/Send/components/ShowAddressAlertAsync';
import * as rpc from '../wallet/rpc';
import type { SyncStatus } from '../wallet/generated/SyncStatus';
import {
  setLastError,
  setScheduledActions,
  setSyncingStatus,
  setZecPrice,
} from '../wallet/walletUpdates';
import { appStore, patch, read } from '../store/appStore';
import { enterPhase } from '../store/phase';
import {
  addLastSnackbar,
  setBackgroundError,
  showBackgroundErrorIfAny,
} from '../store/feedback';
import {
  fetchBackgroundSyncing,
  fetchNetInfo,
  isForeground,
  isResting,
  markBackground,
  watchAppState,
  watchNetInfo,
} from '../store/platform';
import { BootInfo, OpenRequest, SessionHandle } from '../lifecycle/phase';
import type { LifecycleActions } from '../lifecycle/LifecycleProvider';
import { currentRoute, navigateTo, openScheduledTab } from './navigation';
import { recalculateStakingDay } from './stakingDay';

export type SessionInput = {
  boot: BootInfo;
  session: SessionHandle;
  translate: (key: string) => string;
  actions: LifecycleActions;
};

const screenName = ScreenEnum.Session;
const MIGRATION_WALLET_VERSION = 32;

let initialUrlConsumed = false;

const handleNotificationDeeplink = (deeplink: unknown): void => {
  if (deeplink === 'delegator://reminder-opened') {
    openScheduledTab();
  }
};

class SessionController {
  private readonly walletService: WalletService;
  private gated = false;
  private stops: (() => void)[] = [];

  constructor(private readonly input: SessionInput) {
    const { boot, session, translate } = input;
    const { settings } = boot;
    enterPhase('session', {
      ...settings,
      translate,
      readOnly: session.walletKind.readOnly,
      orchardPool: session.walletKind.orchardPool,
      saplingPool: session.walletKind.saplingPool,
      transparentPool: session.walletKind.transparentPool,
      info: {
        currencyName:
          settings.indexerServer.chainName === ChainNameEnum.mainChainName
            ? CurrencyNameEnum.ZEC
            : CurrencyNameEnum.cTAZ,
        chainName: settings.indexerServer.chainName,
        serverUri: settings.indexerServer.uri,
      } as InfoType,
      getUfvk: this.getUfvk,
      doRefresh: this.doRefresh,
      requestFaucetFunds: this.requestFaucetFunds,
      setZecPrice,
      setScheduledActions,
    });
    this.walletService = new WalletService({
      readOnly: session.walletKind.readOnly,
      indexerServer: settings.indexerServer,
      performanceLevel: settings.performanceLevel,
      recoverWallet: this.recoverWalletFromSeed,
    });
  }

  start(): void {
    const linking = Linking.addEventListener(EventListenerEnum.url, ({ url }) =>
      this.handleUrl(url),
    );
    const stopNotifications = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        handleNotificationDeeplink(detail.notification?.data?.deeplink);
      }
    });
    this.stops = [
      watchAppState(
        this.handleAppStateChange,
        Platform.OS === GlobalConst.platformOSios
          ? AppStateStatusEnum.active
          : AppState.currentState,
      ),
      () => linking?.remove?.(),
      watchNetInfo(this.handleNetInfoChange),
      () => stopNotifications?.(),
      appStore.subscribe((state, previous) => {
        if (state.info.latestBlock !== previous.info.latestBlock) {
          this.recalculateStakingDay();
        }
      }),
    ];
    this.recordInstall();
    this.startWallet();
    this.handleInitialUrl();
    this.handleInitialNotification();
  }

  stop(): void {
    this.stops.forEach(stop => stop());
    this.stops = [];
    keepAwake(false);
    this.walletService.clearTimers();
  }

  setGated = async (gated: boolean): Promise<void> => {
    if (gated === this.gated) {
      return;
    }
    this.gated = gated;
    if (gated) {
      await this.walletService.clearTimers();
      setSyncingStatus({} as SyncStatus);
      return;
    }
    await fetchBackgroundSyncing();
    await this.restartTimers();
    showBackgroundErrorIfAny();
  };

  getUfvk = async (): Promise<string> => {
    const wallet = await WalletService.rpcFetchWallet(true);
    return wallet.ufvk || '';
  };

  doRefresh = (): void => {
    this.walletService.fetchTandZandOValueTransfers();
  };

  requestFaucetFunds = async (address: string): Promise<string> => {
    try {
      return await this.walletService.requestFaucetFunds(address);
    } catch (err) {
      return `Error: ${err}`;
    }
  };

  sendTransaction = async (sendPageState: SendPageState): Promise<string> => {
    const { indexerServer, donation, defaultUnifiedAddress } = read();
    const sendJson = await Utils.getSendManyJSON(
      sendPageState,
      defaultUnifiedAddress,
      indexerServer,
      donation,
    );
    return this.walletService.sendTransaction(sendJson);
  };

  stakeTransaction = (
    _sendPageState: SendPageState,
    stakingAction: StakingActionType,
  ): Promise<string> => {
    const stakeJson: StakeJsonToTypeType = { stakingAction, receivers: [] };
    return this.walletService.sendStakingTransaction(stakeJson);
  };

  beginUnstakeTransaction = (createBondTxid: string): Promise<string> =>
    this.walletService.sendBeginUnstakingTx(createBondTxid);

  withdrawBondTransaction = (createBondTxid: string): Promise<string> =>
    this.walletService.sendWithdrawBondTx(createBondTxid);

  redelegateTransaction = (
    bondKey: string,
    finalizer: string,
  ): Promise<string> =>
    this.walletService.sendRetargetBondTx(
      bondKey,
      reverseHex32Bytes(finalizer),
    );

  setSecurityOption = async (security: SecurityType): Promise<void> => {
    await writeSettings('security', security);
    patch({ security });
  };

  setServerOption = async (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ): Promise<void> => {
    await this.walletService.clearTimers();
    setSyncingStatus({} as SyncStatus);
    keepAwake(false);
    const translate = read().translate;
    if (sameServerChainName && (await this.openWalletOn(value))) {
      if (toast && selectServer !== SelectServerEnum.offline) {
        addLastSnackbar({
          message: `${translate('loadedapp.readingwallet')} ${value.uri}`,
          screenName: [screenName],
        });
      }
      await writeSettings('indexerServer', value);
      await writeSettings('selectIndexerServer', selectServer);
      await writeSettings('indexerServerPinned', true);
      patch({ indexerServer: value, selectIndexerServer: selectServer });
      await this.restartTimers();
      const { currency } = read();
      if (
        currency === CurrencyEnum.USDTORCurrency ||
        currency === CurrencyEnum.USDCurrency
      ) {
        const resp = await WalletService.createTorClientProcess();
        if (resp && resp.toLowerCase().startsWith(GlobalConst.error)) {
          setLastError(`Create tor client error: ${resp}`);
        }
      }
      return;
    }
    if (toast) {
      addLastSnackbar({
        message: `${translate('loadedapp.readingwallet-error')} ${value.uri}`,
        screenName: [screenName],
      });
    }
    const oldSettings = await readSettings();
    if (oldSettings.indexerServer && oldSettings.selectIndexerServer) {
      await WalletService.changeServerProcess(oldSettings.indexerServer.uri);
      patch({
        indexerServer: oldSettings.indexerServer,
        selectIndexerServer: oldSettings.selectIndexerServer,
      });
    }
  };

  changeWallet = async (request?: OpenRequest): Promise<void> => {
    const { indexerServer, translate } = read();
    const result =
      indexerServer.chainName === ChainNameEnum.mainChainName
        ? await this.walletService.changeWallet()
        : await this.walletService.changeWalletNoBackup();
    if (result && result.toLowerCase().startsWith(GlobalConst.error)) {
      const title = translate('loadedapp.changingwallet-label') as string;
      reportFailure(title, result);
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        [screenName],
        title,
        result,
        false,
      );
      return;
    }
    await resetScheduledActions();
    setScheduledActions([]);
    await notifee.cancelAllNotifications();
    keepAwake(false);
    await this.leave(request);
  };

  leave = async (request?: OpenRequest): Promise<void> => {
    await this.walletService.clearTimers();
    this.input.actions.leaveSession(request);
  };

  private recoverWalletFromSeed = (seed: string, birthday: number) =>
    this.changeWallet({ kind: 'restore', seed, birthday });

  private recalculateStakingDay = () =>
    recalculateStakingDay(this.walletService.getAverageBlockTime());

  private restartTimers = async () => {
    await this.walletService.clearTimers();
    await this.walletService.configure();
  };

  private recordInstall = async () => {
    const { boot, translate } = this.input;
    await writeSettings('firstInstall', false);
    await writeSettings('version', translate('version'));
    const zenniesDonationAddress = await Utils.getZenniesDonationAddress(
      boot.settings.indexerServer.chainName,
    );
    patch({ zenniesDonationAddress });
  };

  private startWallet = async () => {
    const { session, translate } = this.input;
    await this.recalculateStakingDay();
    setScheduledActions(await readScheduledActions());
    await fetchNetInfo();
    if (session.launching !== LaunchingModeEnum.installing) {
      const version = await this.walletService.getWalletVersion();
      if (version && version < MIGRATION_WALLET_VERSION) {
        Alert.alert(
          `${translate('loadedapp.migration-title')} v:${version}`,
          translate('loadedapp.migration-body'),
        );
      }
    }
    await this.restartTimers();
  };

  private openWalletOn = async (server: ServerType): Promise<boolean> => {
    const result = await rpc.loadExistingWallet(
      server.uri,
      server.chainName,
      read().performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );
    return result.ok;
  };

  private enterBackground = async () => {
    await markBackground(true);
    await this.walletService.clearTimers();
    setSyncingStatus({} as SyncStatus);
    await WalletService.doSave();
  };

  private enterForeground = async () => {
    await fetchBackgroundSyncing();
    await markBackground(false);
    await this.restartTimers();
    showBackgroundErrorIfAny();
  };

  private handleAppStateChange = async (
    next: AppStateStatus,
    prior: AppStateStatus,
  ) => {
    if (Platform.OS === GlobalConst.platformOSios) {
      if (
        (prior === AppStateStatusEnum.inactive &&
          next === AppStateStatusEnum.active) ||
        (prior === AppStateStatusEnum.active &&
          next === AppStateStatusEnum.inactive)
      ) {
        return;
      }
      if (
        prior === AppStateStatusEnum.inactive &&
        next === AppStateStatusEnum.background
      ) {
        await this.enterBackground();
        return;
      }
    }
    if (isResting(prior) && isForeground(next)) {
      if (read().security.foregroundApp) {
        this.input.actions.lockGate();
        return;
      }
      await this.enterForeground();
    } else if (isForeground(prior) && isResting(next)) {
      await this.enterBackground();
    }
  };

  private handleNetInfoChange = async (
    state: NetInfoState,
    previousConnected: boolean | null,
  ) => {
    if (previousConnected !== state.isConnected && state.isConnected) {
      await this.restartTimers();
    }
  };

  private handleInitialUrl = async () => {
    if (initialUrlConsumed) {
      return;
    }
    initialUrlConsumed = true;
    await this.handleUrl(await Linking.getInitialURL());
  };

  private handleInitialNotification = async () => {
    const initial = await notifee.getInitialNotification();
    handleNotificationDeeplink(initial?.notification.data?.deeplink);
  };

  private handleUrl = async (url: string | null) => {
    if (url && (await this.readUrl(url))) {
      navigateTo(RouteEnum.Send);
    }
  };

  private readUrl = async (url: string): Promise<boolean> => {
    const { readOnly, translate, indexerServer } = read();
    if (!url.startsWith(GlobalConst.zcash) || readOnly) {
      return false;
    }
    const { error, target } = await parseZcashURI(
      url,
      translate,
      indexerServer,
    );
    if (error) {
      addLastSnackbar({ message: error, screenName: [screenName] });
    }
    if (!target || !target.address) {
      return false;
    }
    const route = currentRoute();
    const draftTo =
      route?.name === RouteEnum.Send
        ? (route.params as { toaddr?: { to?: string } } | undefined)?.toaddr?.to
        : '';
    if (draftTo && draftTo !== target.address) {
      const confirmed = await ShowAddressAlertAsync(translate).then(
        () => true,
        () => false,
      );
      if (!confirmed) {
        return false;
      }
    }
    const to = emptyToAddr();
    to.to = target.address;
    to.amount = target.amount
      ? Utils.parseNumberFloatToStringLocale(target.amount, 8)
      : '';
    to.memo = target.memoString || '';
    navigateTo(RouteEnum.Send, { toaddr: to });
    return true;
  };
}

let current: SessionController | null = null;

const active = (): SessionController => {
  if (!current) {
    throw new Error('No active session');
  }
  return current;
};

export const startSession = (input: SessionInput): (() => void) => {
  current?.stop();
  const controller = new SessionController(input);
  current = controller;
  controller.start();
  return () => {
    if (current === controller) {
      controller.stop();
      current = null;
    }
  };
};

export const setSessionGated = (gated: boolean): void => {
  current?.setGated(gated);
};

export const sendTransaction = (sendPageState: SendPageState) =>
  active().sendTransaction(sendPageState);
export const stakeTransaction = (
  sendPageState: SendPageState,
  stakingAction: StakingActionType,
) => active().stakeTransaction(sendPageState, stakingAction);
export const beginUnstakeTransaction = (txid: string) =>
  active().beginUnstakeTransaction(txid);
export const withdrawBondTransaction = (txid: string) =>
  active().withdrawBondTransaction(txid);
export const redelegateTransaction = (bondKey: string, finalizer: string) =>
  active().redelegateTransaction(bondKey, finalizer);
export const setServerOption = (
  value: ServerType,
  selectServer: SelectServerEnum,
  toast: boolean,
  sameServerChainName: boolean,
) => active().setServerOption(value, selectServer, toast, sameServerChainName);
export const setSecurityOption = (security: SecurityType) =>
  active().setSecurityOption(security);
export const changeWallet = () => active().changeWallet();
export const leaveSession = () => active().leave();
