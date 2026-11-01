import React, { Component } from 'react';
import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
  Platform,
} from 'react-native';

import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from '@react-native-community/netinfo/src/index';

import RPCModule from '../RPCModule';
import {
  BackgroundType,
  WalletType,
  TranslateType,
  NetInfoType,
  ServerType,
  CurrencyEnum,
  SelectServerEnum,
  ChainNameEnum,
  SnackbarDurationEnum,
  SnackbarType,
  AppStateStatusEnum,
  GlobalConst,
  EventListenerEnum,
  ZecPriceType,
  BackgroundErrorType,
  ScreenEnum,
} from '../AppState';
import { writeSettings } from '../storage/settingsFile';
import WalletService from '../wallet';
import { SetupDomains, SetupDomainsProvider } from '../context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '../createAlert';
import { RPCWalletKindType } from '../wallet/types/RPCWalletKindType';
import Snackbars from '../../components/Components/Snackbars';
import { RPCSeedType } from '../wallet/types/RPCSeedType';
import Launching from '../lifecycle/Launching';
import isEqual from 'lodash/isEqual';
import {
  createUpdateRecoveryWalletInfo,
  hasRecoveryWalletInfo,
  removeRecoveryWalletInfo,
} from '../recoveryWalletInfov10';
import { RPCWalletKindEnum } from '../wallet/enums/RPCWalletKindEnum';
import { ToastProvider } from 'react-native-toastier';
import { RPCUfvkType } from '../wallet/types/RPCUfvkType';
import ScheduledActionsFileImpl from '../../components/ScheduledActions/ScheduledActionsFileImpl';
import { discoverIndexers, probeIndexer, selectBestIndexer } from '../indexers';
import {
  quarantineLegacyWalletIfNeeded,
  quarantineUnreadableWallet,
} from '../legacyWallet';
import notifee from '@notifee/react-native';
import { reportFailure } from '../reporting';
import { BootInfo, OpenRequest, SessionHandle } from '../lifecycle/phase';
import { useLifecycle } from '../lifecycle';

type OpeningProps = {
  boot: BootInfo;
  request: OpenRequest;
  translate: (key: string) => TranslateType;
  sessionOpened: (session: SessionHandle) => void;
  openingFailed: () => void;
};

type OpeningState = SetupDomains & {
  appStateStatus: AppStateStatus;
  indexerNetwork: import('../AppState').IndexerNetworkEnum;
  indexerServerPinned: boolean;
  serverErrorTries: number;
  hasRecoveryWalletInfoSaved: boolean;
  actionButtonsDisabled: boolean;
};

type WalletKind = {
  readOnly: boolean;
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;
};

export default function Opening() {
  const { lifecycle, translate, actions } = useLifecycle();
  if (lifecycle.phase !== 'opening') {
    return null;
  }
  return (
    <OpeningClass
      boot={lifecycle.boot}
      request={lifecycle.request}
      translate={translate}
      sessionOpened={actions.sessionOpened}
      openingFailed={actions.openingFailed}
    />
  );
}

class OpeningClass extends Component<OpeningProps, OpeningState> {
  private appStateSubscription: NativeEventSubscription | null = null;
  private netInfoSubscription: NetInfoSubscription | null = null;
  screenName = ScreenEnum.Boot;

  constructor(props: OpeningProps) {
    super(props);

    this.state = {
      // context
      netInfo: {} as NetInfoType,
      wallet: {} as WalletType,
      zecPrice: {} as ZecPriceType,
      background: {
        batches: 0,
        message: '',
        date: 0,
        dateEnd: 0,
      } as BackgroundType,
      translate: props.translate,
      backgroundError: {} as BackgroundErrorType,
      setBackgroundError: this.setBackgroundError,
      readOnly: false,
      orchardPool: true,
      saplingPool: true,
      transparentPool: true,
      snackbars: [] as SnackbarType[],
      addLastSnackbar: this.addLastSnackbar,
      removeFirstSnackbar: this.removeFirstSnackbar,
      zingolibVersion: '',
      setPrivacyOption: async () => {},

      // context settings
      ...props.boot.settings,

      // state
      appStateStatus: AppState.currentState,
      indexerNetwork: props.boot.indexerNetwork,
      indexerServerPinned: props.boot.indexerServerPinned,
      serverErrorTries: 0,
      hasRecoveryWalletInfoSaved: false,
      actionButtonsDisabled: true,
    };
  }

  componentDidMount() {
    this.appStateSubscription = AppState.addEventListener(
      EventListenerEnum.change,
      this.handleAppStateChange,
    );
    this.netInfoSubscription = NetInfo.addEventListener(
      this.handleNetInfoChange,
    );
    void this.run(this.props.request);
  }

  componentWillUnmount() {
    this.appStateSubscription?.remove();
    this.netInfoSubscription?.();
  }

  handleAppStateChange = async (nextAppState: AppStateStatus) => {
    this.setState({ appStateStatus: nextAppState });
    if (nextAppState === AppStateStatusEnum.active) {
      await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
    }
    if (
      nextAppState === AppStateStatusEnum.inactive ||
      nextAppState === AppStateStatusEnum.background
    ) {
      await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
    }
  };

  handleNetInfoChange = (state: NetInfoState) => {
    const { isConnected, type, isConnectionExpensive } = this.state.netInfo;
    if (
      isConnected !== state.isConnected ||
      type !== state.type ||
      isConnectionExpensive !== state.details?.isConnectionExpensive
    ) {
      this.setState({
        netInfo: {
          isConnected: state.isConnected,
          type: state.type,
          isConnectionExpensive:
            state.details && state.details.isConnectionExpensive,
        },
      });
    }
  };

  run = async (request: OpenRequest) => {
    const netInfoState = await NetInfo.fetch();
    this.setState({
      netInfo: {
        isConnected: netInfoState.isConnected,
        type: netInfoState.type,
        isConnectionExpensive:
          netInfoState.details && netInfoState.details.isConnectionExpensive,
      },
    });

    this.fetchZingolibVersion();

    await RPCModule.setCryptoDefaultProvider();

    const has = await hasRecoveryWalletInfo();
    this.setState({ hasRecoveryWalletInfoSaved: has });

    if (!this.state.indexerServer.uri) {
      const { indexers } = await discoverIndexers(this.state.indexerNetwork);
      const best = indexers[0];
      if (best) {
        const server: ServerType = {
          uri: best.uri,
          chainName: ChainNameEnum.testChainName,
        };
        this.setState({ indexerServer: server });
        await writeSettings('indexerServer', server);
      } else {
        this.addLastSnackbar({
          message: this.state.translate('loadingapp.noservers') as string,
          screenName: [this.screenName],
        });
      }
    }

    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);

    switch (request.kind) {
      case 'create':
        await this.createFlow();
        return;
      case 'restore':
        await this.restoreFlow(request.seed, request.birthday);
        return;
      case 'open':
        await this.openFlow();
        return;
    }
  };

  finishToSetup = async () => {
    await writeSettings('basicFirstViewSeed', true);
    this.props.openingFailed();
  };

  openFlow = async () => {
    const exists = await RPCModule.walletExists();
    if (!exists || exists === GlobalConst.false) {
      await this.finishToSetup();
      return;
    }

    // A wallet from a previous network can no longer be used: probe the
    // configured indexer first, abandon it when it cannot serve this chain,
    // and quarantine a wallet file this build cannot read.
    if (
      this.state.netInfo.isConnected &&
      this.state.selectIndexerServer !== SelectServerEnum.offline &&
      this.state.indexerServer.uri
    ) {
      const probed = await probeIndexer(
        this.state.indexerServer.uri,
        this.state.indexerNetwork,
      ).catch(() => null);
      if (!probed) {
        const { indexers } = await discoverIndexers(this.state.indexerNetwork);
        const best = indexers[0];
        if (best && best.uri !== this.state.indexerServer.uri) {
          const server: ServerType = {
            uri: best.uri,
            chainName: ChainNameEnum.testChainName,
          };
          this.setState({
            indexerServer: server,
            indexerServerPinned: false,
          });
          await writeSettings('indexerServer', server);
          await writeSettings('indexerServerPinned', false);
        }
      }
    }
    const quarantined = await quarantineLegacyWalletIfNeeded(
      this.state.indexerServer.uri,
      Platform.OS,
    );
    if (quarantined) {
      await this.finishToSetup();
      return;
    }

    const result: string = await RPCModule.loadExistingWallet(
      this.state.indexerServer.uri,
      this.state.indexerServer.chainName,
      this.state.performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );
    const title = this.state.translate(
      'loadingapp.readingwallet-label',
    ) as string;
    if (!result || result.toLowerCase().startsWith(GlobalConst.error)) {
      if (await quarantineUnreadableWallet(Platform.OS)) {
        await this.finishToSetup();
        return;
      }
      await this.walletErrorHandle(result, title, true);
      return;
    }
    let resultJson: RPCSeedType & RPCUfvkType;
    try {
      resultJson = await JSON.parse(result);
    } catch (e: unknown) {
      await this.walletErrorHandle(
        e instanceof Error ? e.message : String(e),
        title,
        true,
      );
      return;
    }
    if (resultJson.error) {
      await this.walletErrorHandle(resultJson.error, title, true);
      return;
    }

    // Indexer selection probes every known indexer and can stall for a long
    // time when some of them don't answer. It only optimizes the endpoint —
    // the wallet is already open against the configured one, and the rust
    // side re-points the client when a better one wins — so it must never
    // gate opening. Run it in the background; failures are non-fatal.
    if (!this.state.indexerServerPinned && this.state.netInfo.isConnected) {
      selectBestIndexer(this.state.indexerNetwork)
        .then(async best => {
          if (best && best !== this.state.indexerServer.uri) {
            const winner: ServerType = {
              uri: best,
              chainName: this.state.indexerServer.chainName,
            };
            this.setState({ indexerServer: winner });
            await writeSettings('indexerServer', winner);
          }
        })
        .catch(() => {});
    }

    const wallet = await this.readWalletKind();
    await this.ensureTorClient();
    this.props.sessionOpened({
      walletKind: wallet,
      launching: this.props.boot.launching,
    });
  };

  createFlow = async (): Promise<void> => {
    // creating a wallet works offline: the native side derives the seed and
    // sets the birthday without contacting the indexer. the first sync needs
    // the network, not the creation itself.
    const seed: string = await RPCModule.createNewWallet(
      this.state.indexerServer.uri,
      this.state.indexerServer.chainName,
      this.state.performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );

    if (seed && !seed.toLowerCase().startsWith(GlobalConst.error)) {
      let seedJSON = {} as RPCSeedType;
      try {
        seedJSON = await JSON.parse(seed);
        if (seedJSON.error) {
          reportFailure(
            this.state.translate('loadingapp.creatingwallet-label') as string,
            seedJSON.error,
          );
          await this.walletErrorHandle(
            seedJSON.error,
            this.state.translate('loadingapp.creatingwallet-label') as string,
            false,
          );
          return;
        }
      } catch (e: unknown) {
        reportFailure(
          this.state.translate('loadingapp.creatingwallet-label') as string,
          e instanceof Error ? e.message : String(e),
        );
        await this.walletErrorHandle(
          e instanceof Error ? e.message : String(e),
          this.state.translate('loadingapp.creatingwallet-label') as string,
          false,
        );
        return;
      }
      const wallet: WalletType = {
        seed: seedJSON.seed_phrase || '',
        birthday: seedJSON.birthday || 0,
      };
      if (this.state.recoveryWalletInfoOnDevice) {
        await createUpdateRecoveryWalletInfo(wallet);
      } else if (this.state.hasRecoveryWalletInfoSaved) {
        await removeRecoveryWalletInfo();
      }
      this.setState({ wallet });
      await this.ensureTorClient();

      await ScheduledActionsFileImpl.resetSA();
      await notifee.cancelAllNotifications();

      this.props.sessionOpened({
        walletKind: {
          readOnly: false,
          orchardPool: true,
          saplingPool: true,
          transparentPool: true,
        },
        launching: this.props.boot.launching,
      });
    } else {
      await this.walletErrorHandle(
        seed,
        this.state.translate('loadingapp.creatingwallet-label') as string,
        false,
      );
    }
  };

  restoreFlow = async (seed: string, birthday: number) => {
    if (!seed) {
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        [this.screenName],
        this.state.translate('loadingapp.emptyseedufvk-label') as string,
        this.state.translate('loadingapp.emptyseedufvk-error') as string,
        false,
      );
      this.props.openingFailed();
      return;
    }
    if (
      seed.toLowerCase().startsWith(GlobalConst.uview) ||
      seed.toLowerCase().startsWith(GlobalConst.utestview)
    ) {
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        [this.screenName],
        this.state.translate('loadingapp.invalidseedufvk-label') as string,
        this.state.translate('loadingapp.invalidseedufvk-error') as string,
        false,
      );
      this.props.openingFailed();
      return;
    }

    const parsedBirthday = parseInt(birthday.toString(), 10);
    const walletBirthday =
      isNaN(parsedBirthday) || parsedBirthday < 0
        ? '0'
        : String(parsedBirthday);

    const result: string = await RPCModule.restoreWalletFromSeed(
      seed.toLowerCase(),
      walletBirthday,
      this.state.indexerServer.uri,
      this.state.indexerServer.chainName,
      this.state.performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );

    if (!result || result.toLowerCase().startsWith(GlobalConst.error)) {
      await this.walletErrorHandle(
        result,
        this.state.translate('loadingapp.readingwallet-label') as string,
        false,
      );
      return;
    }
    let resultJson: RPCSeedType & RPCUfvkType;
    try {
      resultJson = await JSON.parse(result);
    } catch (e: unknown) {
      await this.walletErrorHandle(
        e instanceof Error ? e.message : String(e),
        this.state.translate('loadingapp.readingwallet-label') as string,
        false,
      );
      return;
    }
    if (resultJson.error) {
      await this.walletErrorHandle(
        resultJson.error,
        this.state.translate('loadingapp.readingwallet-label') as string,
        false,
      );
      return;
    }

    if (this.state.recoveryWalletInfoOnDevice) {
      await createUpdateRecoveryWalletInfo({
        seed: seed.toLowerCase(),
        birthday: Number(walletBirthday),
      });
    } else if (this.state.hasRecoveryWalletInfoSaved) {
      await removeRecoveryWalletInfo();
    }
    await writeSettings('basicFirstViewSeed', true);

    const wallet = await this.readWalletKind();
    await this.ensureTorClient();
    await ScheduledActionsFileImpl.resetSA();
    await notifee.cancelAllNotifications();

    this.props.sessionOpened({
      walletKind: wallet,
      launching: this.props.boot.launching,
    });
  };

  readWalletKind = async (): Promise<WalletKind> => {
    const kind: WalletKind = {
      readOnly: false,
      orchardPool: false,
      saplingPool: false,
      transparentPool: false,
    };
    const walletKindStr: string = await RPCModule.walletKindInfo();
    try {
      const walletKindJSON: RPCWalletKindType = await JSON.parse(walletKindStr);
      kind.readOnly =
        walletKindJSON.kind ===
          RPCWalletKindEnum.LoadedFromUnifiedFullViewingKey ||
        walletKindJSON.kind === RPCWalletKindEnum.NoKeysFound;
      kind.orchardPool = walletKindJSON.orchard;
      kind.saplingPool = walletKindJSON.sapling;
      kind.transparentPool = walletKindJSON.transparent;
      await this.syncRecoveryWalletInfo(kind.readOnly);
    } catch (e) {
      this.addLastSnackbar({
        message: walletKindStr,
        screenName: [this.screenName],
      });
    }
    this.setState({ ...kind });
    return kind;
  };

  syncRecoveryWalletInfo = async (readOnly: boolean) => {
    if (this.state.recoveryWalletInfoOnDevice) {
      const wallet: WalletType = await WalletService.rpcFetchWallet(readOnly);
      await createUpdateRecoveryWalletInfo(wallet);
    } else if (this.state.hasRecoveryWalletInfoSaved) {
      await removeRecoveryWalletInfo();
    }
  };

  ensureTorClient = async () => {
    if (
      this.state.currency === CurrencyEnum.USDTORCurrency ||
      this.state.currency === CurrencyEnum.USDCurrency
    ) {
      await RPCModule.createTorClientProcess();
    }
  };

  selectTheBestServer = async (aDifferentOne: boolean): Promise<boolean> => {
    const actualServer = this.state.indexerServer;
    const { indexers } = await discoverIndexers();
    const best = indexers.find(
      i => !aDifferentOne || i.uri !== actualServer.uri,
    );
    if (!best) {
      return false;
    }
    const fasterServer: ServerType = {
      uri: best.uri,
      chainName: ChainNameEnum.testChainName,
    };
    this.setState({
      indexerServer: fasterServer,
      selectIndexerServer: SelectServerEnum.custom,
      indexerServerPinned: false,
    });
    await writeSettings('indexerServer', fasterServer);
    await writeSettings('selectIndexerServer', SelectServerEnum.custom);
    await writeSettings('indexerServerPinned', false);
    if (isEqual(actualServer, fasterServer)) {
      this.addLastSnackbar({
        message: this.state.translate(
          'loadedapp.selectingserversame',
        ) as string,
        duration: SnackbarDurationEnum.long,
        screenName: [this.screenName],
      });
    } else {
      this.addLastSnackbar({
        message:
          (this.state.translate('loadedapp.selectingserverbest') as string) +
          ' ' +
          fasterServer.uri,
        duration: SnackbarDurationEnum.long,
        screenName: [this.screenName],
      });
    }
    return true;
  };

  checkServer = async (server: ServerType): Promise<boolean> =>
    (await probeIndexer(server.uri)) !== null;

  walletErrorHandle = async (result: string, title: string, start: boolean) => {
    if (
      start &&
      this.state.netInfo.isConnected &&
      this.state.selectIndexerServer !== SelectServerEnum.offline
    ) {
      this.addLastSnackbar({
        message: this.state.translate('restarting') as string,
        duration: SnackbarDurationEnum.long,
        screenName: [this.screenName],
      });
    }
    if (
      !this.state.netInfo.isConnected ||
      this.state.selectIndexerServer === SelectServerEnum.offline
    ) {
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        [this.screenName],
        title,
        result,
        false,
      );
      this.setState({ serverErrorTries: 0 });
      this.props.openingFailed();
    } else {
      const workingServer = await this.checkServer(this.state.indexerServer);
      if (workingServer) {
        // the server is working -> this error is not related to availability
        reportFailure(title, result);
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          [this.screenName],
          title,
          result,
          false,
        );
        this.setState({ serverErrorTries: 0 });
        this.props.openingFailed();
      } else {
        if (this.state.serverErrorTries === 0) {
          // first try: a different server, then re-run the same request
          this.addLastSnackbar({
            message: this.state.translate(
              'loadingapp.serverfirsttry',
            ) as string,
            duration: SnackbarDurationEnum.longer,
            screenName: [this.screenName],
          });
          const someServerIsWorking = await this.selectTheBestServer(true);
          if (someServerIsWorking) {
            if (start) {
              this.setState({ serverErrorTries: 1 }, () =>
                this.run(this.props.request),
              );
            } else {
              createAlert(
                this.setBackgroundError,
                this.addLastSnackbar,
                [this.screenName],
                title,
                result,
                false,
              );
              this.setState({ serverErrorTries: 0 });
              this.props.openingFailed();
            }
          } else {
            createAlert(
              this.setBackgroundError,
              this.addLastSnackbar,
              [this.screenName],
              title,
              this.state.translate('loadingapp.noservers') as string,
              false,
            );
            this.setState({ serverErrorTries: 0 });
            this.props.openingFailed();
          }
        } else {
          // second try
          this.addLastSnackbar({
            message: this.state.translate(
              'loadingapp.serversecondtry',
            ) as string,
            duration: SnackbarDurationEnum.longer,
            screenName: [this.screenName],
          });
          setTimeout(() => {
            createAlert(
              this.setBackgroundError,
              this.addLastSnackbar,
              [this.screenName],
              title,
              result,
              false,
            );
            this.setState({ serverErrorTries: 0 });
            this.props.openingFailed();
          }, 1 * 1000);
        }
      }
    }
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

  removeFirstSnackbar = () => {
    this.setState(({ snackbars }) => ({ snackbars: snackbars.slice(1) }));
  };

  async fetchZingolibVersion(): Promise<void> {
    try {
      let zingolibStr: string = await RPCModule.getVersionInfo();
      if (zingolibStr) {
        if (zingolibStr.toLowerCase().startsWith(GlobalConst.error)) {
          zingolibStr = GlobalConst.zingolibError;
        }
      } else {
        zingolibStr = GlobalConst.zingolibNone;
      }
      this.setState({ zingolibVersion: zingolibStr });
    } catch (error) {
      console.log(`Critical Error info ${error}`);
    }
  }

  render() {
    const { snackbars } = this.state;

    const context: SetupDomains = {
      netInfo: this.state.netInfo,
      wallet: this.state.wallet,
      zecPrice: this.state.zecPrice,
      background: this.state.background,
      translate: this.state.translate,
      backgroundError: this.state.backgroundError,
      setBackgroundError: this.state.setBackgroundError,
      readOnly: this.state.readOnly,
      orchardPool: this.state.orchardPool,
      saplingPool: this.state.saplingPool,
      transparentPool: this.state.transparentPool,
      snackbars: this.state.snackbars,
      addLastSnackbar: this.state.addLastSnackbar,
      removeFirstSnackbar: this.removeFirstSnackbar,
      zingolibVersion: this.state.zingolibVersion,
      setPrivacyOption: this.state.setPrivacyOption,

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

    return (
      <ToastProvider>
        <Snackbars
          snackbars={snackbars}
          removeFirstSnackbar={this.removeFirstSnackbar}
          screenName={this.screenName}
        />
        <SetupDomainsProvider value={context}>
          <Launching
            empty={true}
            translate={this.props.translate}
            firstLaunchingMessage={this.props.boot.launching}
            biometricsFailed={false}
          />
        </SetupDomainsProvider>
      </ToastProvider>
    );
  }
}
