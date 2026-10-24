import React, { Component, useState, useMemo, useEffect } from 'react';
import {
  Alert,
  I18nManager,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import { I18n } from 'i18n-js';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import NetInfo, {
  NetInfoState,
} from '@react-native-community/netinfo/src/index';

import RPCModule from '../RPCModule';
import {
  AppStateLoading,
  BackgroundType,
  WalletType,
  TranslateType,
  NetInfoType,
  ServerType,
  SecurityType,
  LanguageEnum,
  CurrencyEnum,
  SelectServerEnum,
  ChainNameEnum,
  IndexerNetworkEnum,
  SnackbarDurationEnum,
  SettingsNameEnum,
  RouteEnum,
  SnackbarType,
  AppStateStatusEnum,
  GlobalConst,
  EventListenerEnum,
  AppContextLoading,
  ZecPriceType,
  BackgroundErrorType,
  ScreenEnum,
  LaunchingModeEnum,
} from '../AppState';
import SettingsFileImpl from '../../components/Settings/SettingsFileImpl';
import RPC from '../rpc';
import { ContextAppLoadingProvider } from '../context';
import BackgroundFileImpl from '../../components/Background';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '../createAlert';
import { RPCWalletKindType } from '../rpc/types/RPCWalletKindType';
import Snackbars from '../../components/Components/Snackbars';
import { RPCSeedType } from '../rpc/types/RPCSeedType';
import Launching from './components/Launching';
import simpleBiometrics from '../simpleBiometrics';
import { isEqual } from 'lodash';
import {
  createUpdateRecoveryWalletInfo,
  getRecoveryWalletInfo,
  hasRecoveryWalletInfo,
  removeRecoveryWalletInfo,
} from '../recoveryWalletInfov10';

// no lazy load because slowing down screens.
import Import from './components/Import';
import { RPCWalletKindEnum } from '../rpc/enums/RPCWalletKindEnum';
import StartMenu from './components/StartMenu';
import { ToastProvider } from 'react-native-toastier';
import { RPCUfvkType } from '../rpc/types/RPCUfvkType';
import { RPCPerformanceLevelEnum } from '../rpc/enums/RPCPerformanceLevelEnum';
import { AppStackParamList, LoadingAppStackParamList } from '../types';
import ChooseIndexer from './components/ChooseIndexer';
import ListedIndexers from './components/ListedIndexers';
import CustomIndexer from './components/CustomIndexer';
import ScheduledActionsFileImpl from '../../components/ScheduledActions/ScheduledActionsFileImpl';
import { discoverIndexers, probeIndexer, selectBestIndexer } from '../indexers';
import { quarantineLegacyWalletIfNeeded } from '../legacyWallet';
import notifee from '@notifee/react-native';
import { useTheme, AppTheme } from '../theme';
import { LoadingAppEntryEnum } from '../AppState/enums/LoadingAppEntryEnum';
import { BackdropHost } from '../Backdrop';

const en = require('../translations/en.json');
const es = require('../translations/es.json');
const pt = require('../translations/pt.json');
const ru = require('../translations/ru.json');
const tr = require('../translations/tr.json');

// for testing
//const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type LoadingAppProps = {
  navigation: NativeStackScreenProps<
    AppStackParamList,
    RouteEnum.LoadingApp
  >['navigation'];
  route: NativeStackScreenProps<
    AppStackParamList,
    RouteEnum.LoadingApp
  >['route'];
};

const LoadingStack = createNativeStackNavigator<LoadingAppStackParamList>();

const SERVER_DEFAULT_0: ServerType = {
  uri: '',
  chainName: ChainNameEnum.testChainName,
} as ServerType;

export default function LoadingApp(props: LoadingAppProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);

  const [language, setLanguage] = useState<LanguageEnum>(LanguageEnum.en);
  const [currency, setCurrency] = useState<CurrencyEnum>(
    CurrencyEnum.noCurrency,
  ); // by default none because of cTAZ
  const [indexerServer, setIndexerServer] =
    useState<ServerType>(SERVER_DEFAULT_0);
  const [selectIndexerServer, setSelectIndexerServer] =
    useState<SelectServerEnum>(SelectServerEnum.custom);
  const [indexerNetwork, setIndexerNetwork] = useState<IndexerNetworkEnum>(
    IndexerNetworkEnum.stable,
  );
  const [indexerServerPinned, setIndexerServerPinned] =
    useState<boolean>(false);
  const [sendAll, setSendAll] = useState<boolean>(true);
  const [donation, setDonation] = useState<boolean>(false);
  const [privacy, setPrivacy] = useState<boolean>(false);
  const [background, setBackground] = useState<BackgroundType>({
    batches: 0,
    message: '',
    date: 0,
    dateEnd: 0,
  });
  const [firstLaunchingMessage, setFirstLaunchingMessage] =
    useState<LaunchingModeEnum>(LaunchingModeEnum.opening);
  const [security, setSecurity] = useState<SecurityType>({
    startApp: false,
    foregroundApp: false,
    sendConfirm: false,
    seedUfvkScreen: false,
    rescanScreen: false,
    settingsScreen: false,
    changeWalletScreen: false,
    restoreWalletBackupScreen: false,
  });
  const [rescanMenu, setRescanMenu] = useState<boolean>(true);
  const [recoveryWalletInfoOnDevice, setRecoveryWalletInfoOnDevice] =
    useState<boolean>(false);
  const [performanceLevel, setPerformanceLevel] =
    useState<RPCPerformanceLevelEnum>(RPCPerformanceLevelEnum.Medium);
  const file = useMemo(
    () => ({
      en: en,
      es: es,
      pt: pt,
      ru: ru,
      tr: tr,
    }),
    [],
  );
  const i18n = useMemo(() => new I18n(file), [file]);

  const translate: (key: string) => TranslateType = (key: string) =>
    i18n.t(key);

  useEffect(() => {
    (async () => {
      // fallback if no available language fits
      const fallback = { languageTag: LanguageEnum.en, isRTL: false };

      // only en
      //const { languageTag, isRTL } = RNLocalize.findBestLanguageTag(Object.keys(file)) || fallback;

      const { languageTag, isRTL } = {
        languageTag: LanguageEnum.en,
        isRTL: false,
      };

      // update layout direction
      I18nManager.forceRTL(isRTL);

      //I have to check what language and other things are in the settings
      const settings = await SettingsFileImpl.readSettings();
      //console.log('LoadingApp', settings);

      // checking the version of the App in settings
      //console.log('versions, old:', settings.version, ' new:', translate('version') as string);
      if (settings.version === null) {
        // this is a fresh install
        setFirstLaunchingMessage(LaunchingModeEnum.installing);
      } else if (
        settings.version === '' ||
        settings.version !== (translate('version') as string)
      ) {
        // this is an update
        setFirstLaunchingMessage(LaunchingModeEnum.updating);
      }

      if (
        settings.language === LanguageEnum.en ||
        settings.language === LanguageEnum.es ||
        settings.language === LanguageEnum.pt ||
        settings.language === LanguageEnum.ru ||
        settings.language === LanguageEnum.tr
      ) {
        setLanguage(settings.language);
        i18n.locale = settings.language;
        //console.log('apploading settings', settings.language, settings.currency);
      } else {
        const lang =
          languageTag === LanguageEnum.en ||
          languageTag === LanguageEnum.es ||
          languageTag === LanguageEnum.pt ||
          languageTag === LanguageEnum.ru ||
          languageTag === LanguageEnum.tr
            ? (languageTag as LanguageEnum)
            : (fallback.languageTag as LanguageEnum);
        setLanguage(lang);
        i18n.locale = lang;
        await SettingsFileImpl.writeSettings(SettingsNameEnum.language, lang);
        //console.log('apploading NO settings', languageTag);
      }
      if (
        settings.currency === CurrencyEnum.noCurrency ||
        settings.currency === CurrencyEnum.USDCurrency ||
        settings.currency === CurrencyEnum.USDTORCurrency
      ) {
        setCurrency(settings.currency);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.currency,
          currency,
        );
      }
      if (settings.indexerServer) {
        setIndexerServer(settings.indexerServer);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.indexerServer,
          indexerServer,
        );
      }
      // using only custom & offline.
      if (
        settings.selectIndexerServer === SelectServerEnum.auto ||
        settings.selectIndexerServer === SelectServerEnum.custom ||
        settings.selectIndexerServer === SelectServerEnum.list ||
        settings.selectIndexerServer === SelectServerEnum.offline
      ) {
        setSelectIndexerServer(settings.selectIndexerServer);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.selectIndexerServer,
          selectIndexerServer,
        );
      }
      if (
        settings.indexerNetwork === IndexerNetworkEnum.stable ||
        settings.indexerNetwork === IndexerNetworkEnum.nightly
      ) {
        setIndexerNetwork(settings.indexerNetwork);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.indexerNetwork,
          indexerNetwork,
        );
      }
      if (
        settings.indexerServerPinned === true ||
        settings.indexerServerPinned === false
      ) {
        setIndexerServerPinned(settings.indexerServerPinned);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.indexerServerPinned,
          indexerServerPinned,
        );
      }
      if (settings.sendAll === true || settings.sendAll === false) {
        setSendAll(settings.sendAll);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.sendAll, sendAll);
      }
      if (settings.donation === true || settings.donation === false) {
        setDonation(settings.donation);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.donation,
          donation,
        );
      }
      if (settings.privacy === true || settings.privacy === false) {
        setPrivacy(settings.privacy);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.privacy, privacy);
      }
      if (settings.security) {
        setSecurity(settings.security);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.security,
          security,
        );
      }
      if (settings.rescanMenu === true || settings.rescanMenu === false) {
        setRescanMenu(settings.rescanMenu);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.rescanMenu,
          rescanMenu,
        );
      }
      if (
        settings.recoveryWalletInfoOnDevice === true ||
        settings.recoveryWalletInfoOnDevice === false
      ) {
        setRecoveryWalletInfoOnDevice(settings.recoveryWalletInfoOnDevice);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.recoveryWalletInfoOnDevice,
          recoveryWalletInfoOnDevice,
        );
      }
      if (
        settings.performanceLevel === RPCPerformanceLevelEnum.High ||
        settings.performanceLevel === RPCPerformanceLevelEnum.Low ||
        settings.performanceLevel === RPCPerformanceLevelEnum.Maximum ||
        settings.performanceLevel === RPCPerformanceLevelEnum.Medium
      ) {
        setPerformanceLevel(settings.performanceLevel);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.performanceLevel,
          performanceLevel,
        );
      }

      // for testing
      //await delay(5000);

      // reading background task info
      const backgroundJson = await BackgroundFileImpl.readBackground();
      setBackground(backgroundJson);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //console.log('render loadingApp - 2', translate('version'));

  if (loading) {
    return (
      <Launching
        empty={true}
        translate={translate}
        firstLaunchingMessage={LaunchingModeEnum.opening}
        biometricsFailed={false}
      />
    );
  } else {
    return (
      <LoadingAppClass
        {...props}
        navigationApp={props.navigation}
        theme={theme}
        translate={translate}
        language={language}
        currency={currency}
        indexerServer={indexerServer}
        selectIndexerServer={selectIndexerServer}
        indexerNetwork={indexerNetwork}
        indexerServerPinned={indexerServerPinned}
        sendAll={sendAll}
        donation={donation}
        privacy={privacy}
        background={background}
        firstLaunchingMessage={firstLaunchingMessage}
        security={security}
        rescanMenu={rescanMenu}
        recoveryWalletInfoOnDevice={recoveryWalletInfoOnDevice}
        performanceLevel={performanceLevel}
      />
    );
  }
}

type LoadingAppClassProps = {
  navigationApp: NativeStackScreenProps<
    AppStackParamList,
    RouteEnum.LoadingApp
  >['navigation'];
  route: NativeStackScreenProps<
    AppStackParamList,
    RouteEnum.LoadingApp
  >['route'];
  translate: (key: string) => TranslateType;
  theme: AppTheme;
  language: LanguageEnum;
  currency: CurrencyEnum;
  indexerServer: ServerType;
  selectIndexerServer: SelectServerEnum;
  indexerNetwork: IndexerNetworkEnum;
  indexerServerPinned: boolean;
  sendAll: boolean;
  donation: boolean;
  privacy: boolean;
  background: BackgroundType;
  firstLaunchingMessage: LaunchingModeEnum;
  security: SecurityType;
  rescanMenu: boolean;
  recoveryWalletInfoOnDevice: boolean;
  performanceLevel: RPCPerformanceLevelEnum;
};

type LoadingAppClassState = AppStateLoading & AppContextLoading;

type WalletKind = {
  readOnly: boolean;
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;
};

type BootResult =
  | { kind: 'biometricsFailed' }
  | { kind: 'opened'; wallet: WalletKind }
  | { kind: 'noWallet' }
  | { kind: 'menu' }
  | { kind: 'restore'; seed: string; birthday: number }
  | { kind: 'error'; message: string; title: string };

export class LoadingAppClass extends Component<
  LoadingAppClassProps,
  LoadingAppClassState
> {
  subscriptions: (() => void)[] = [];
  screenName = ScreenEnum.LoadingApp;
  coldStart: boolean;

  constructor(props: LoadingAppClassProps) {
    super(props);

    this.coldStart = props.route.params?.startingApp ?? true;

    this.state = {
      // context
      netInfo: {} as NetInfoType,
      wallet: {} as WalletType,
      zecPrice: {} as ZecPriceType,
      background: props.background,
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
      setPrivacyOption: this.setPrivacyOption,

      // context settings
      indexerServer: props.indexerServer,
      selectIndexerServer: props.selectIndexerServer,
      indexerNetwork: props.indexerNetwork,
      indexerServerPinned: props.indexerServerPinned,
      currency: props.currency,
      language: props.language,
      sendAll: props.sendAll,
      donation: props.donation,
      privacy: props.privacy,
      security: props.security,
      rescanMenu: props.rescanMenu,
      recoveryWalletInfoOnDevice: props.recoveryWalletInfoOnDevice,
      performanceLevel: props.performanceLevel,

      // state
      appStateStatus: AppState.currentState,
      entry: props.route.params?.entry ?? LoadingAppEntryEnum.boot,
      // Start until boot() proves otherwise, so a wallet switch (entry: menu)
      // never shows enabled buttons while netInfo is still empty.
      actionButtonsDisabled: true,
      walletExists: false,
      openWalletFailed: false,
      biometricsFailed:
        !!props.route.params &&
        props.route.params.biometricsFailed !== undefined
          ? props.route.params.biometricsFailed
          : false,
      startingApp:
        !!props.route.params && props.route.params.startingApp !== undefined
          ? props.route.params.startingApp
          : true,
      serverErrorTries: 0,
      firstLaunchingMessage: props.firstLaunchingMessage,
      hasRecoveryWalletInfoSaved: false,
      walletSeed:
        !!props.route.params && props.route.params.walletSeed !== undefined
          ? props.route.params.walletSeed
          : '',
      walletBirthday:
        !!props.route.params && props.route.params.walletBirthday !== undefined
          ? props.route.params.walletBirthday
          : 0,
    };
  }

  componentDidMount = async () => {
    this.subscribe();
    await this.runBoot();
  };

  componentWillUnmount = () => {
    this.unsubscribe();
  };

  subscribe = () => {
    const appState = AppState.addEventListener(
      EventListenerEnum.change,
      this.handleAppStateChange,
    );
    const netInfo = NetInfo.addEventListener(this.handleNetInfoChange);
    this.subscriptions = [() => appState?.remove?.(), netInfo];
  };

  unsubscribe = () => {
    this.subscriptions.forEach(off => typeof off === 'function' && off());
    this.subscriptions = [];
  };

  handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const priorAppState = this.state.appStateStatus;
    this.setState({ appStateStatus: nextAppState });
    if (
      (priorAppState === AppStateStatusEnum.inactive ||
        priorAppState === AppStateStatusEnum.background) &&
      nextAppState === AppStateStatusEnum.active
    ) {
      this.fetchBackgroundSyncing();
      await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
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
    if (
      (nextAppState === AppStateStatusEnum.inactive ||
        nextAppState === AppStateStatusEnum.background) &&
      priorAppState === AppStateStatusEnum.active
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

  runBoot = async () => {
    const result = await this.boot();
    await this.applyBootResult(result);
  };

  boot = async (): Promise<BootResult> => {
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

    if (this.state.startingApp) {
      if (this.state.biometricsFailed) {
        return { kind: 'biometricsFailed' };
      }
      const resultBio = this.state.security.startApp
        ? await simpleBiometrics({ translate: this.state.translate })
        : true;
      if (resultBio === false) {
        return { kind: 'biometricsFailed' };
      }
    }

    this.setState({ actionButtonsDisabled: true });

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
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.indexerServer,
          server,
        );
      } else {
        this.addLastSnackbar({
          message: this.state.translate('loadingapp.noservers') as string,
          screenName: [this.screenName],
        });
      }
    }

    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
    const exists = await RPCModule.walletExists();

    // a wallet from the previous network can no longer be used: move it aside
    // and start clean — the seed stays recoverable through Import.
    if (
      exists &&
      exists !== GlobalConst.false &&
      this.state.netInfo.isConnected &&
      this.state.selectIndexerServer !== SelectServerEnum.offline
    ) {
      const quarantined = await quarantineLegacyWalletIfNeeded(
        this.state.indexerServer.uri,
      );
      if (quarantined) {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.basicFirstViewSeed,
          true,
        );
        if (!this.state.startingApp && !!this.state.walletSeed) {
          return {
            kind: 'restore',
            seed: this.state.walletSeed,
            birthday: this.state.walletBirthday,
          };
        }
        return { kind: 'noWallet' };
      }
    }

    if (!exists || exists === GlobalConst.false) {
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.basicFirstViewSeed,
        true,
      );
      if (!this.state.startingApp && !!this.state.walletSeed) {
        return {
          kind: 'restore',
          seed: this.state.walletSeed,
          birthday: this.state.walletBirthday,
        };
      }
      return { kind: 'noWallet' };
    }

    this.setState({ walletExists: true });
    if (this.state.entry === LoadingAppEntryEnum.menu) {
      return { kind: 'menu' };
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
      return { kind: 'error', message: result, title };
    }
    let resultJson: RPCSeedType & RPCUfvkType;
    try {
      resultJson = await JSON.parse(result);
    } catch (e: unknown) {
      return {
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
        title,
      };
    }
    if (resultJson.error) {
      return { kind: 'error', message: resultJson.error, title };
    }

    if (!this.state.indexerServerPinned && this.state.netInfo.isConnected) {
      const best = await selectBestIndexer(this.state.indexerNetwork);
      if (best && best !== this.state.indexerServer.uri) {
        const winner: ServerType = {
          uri: best,
          chainName: this.state.indexerServer.chainName,
        };
        this.setState({ indexerServer: winner });
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.indexerServer,
          winner,
        );
      }
    }

    const wallet = await this.readWalletKind();
    await this.ensureTorClient();
    return { kind: 'opened', wallet };
  };

  applyBootResult = async (result: BootResult) => {
    switch (result.kind) {
      case 'biometricsFailed':
        this.setState({ biometricsFailed: true });
        return;
      case 'opened':
        this.navigateToLoadedApp(
          result.wallet.readOnly,
          result.wallet.orchardPool,
          result.wallet.saplingPool,
          result.wallet.transparentPool,
          this.state.firstLaunchingMessage,
        );
        return;
      case 'menu':
        this.setState({
          entry: LoadingAppEntryEnum.menu,
          walletExists: true,
          openWalletFailed: false,
          actionButtonsDisabled: false,
        });
        return;
      case 'noWallet':
        this.setState(state => ({
          entry:
            state.entry === LoadingAppEntryEnum.import
              ? LoadingAppEntryEnum.import
              : LoadingAppEntryEnum.menu,
          walletExists: false,
          actionButtonsDisabled: false,
        }));
        return;
      case 'restore':
        await this.doRestore(result.seed, result.birthday);
        return;
      case 'error':
        this.setState({ openWalletFailed: true });
        await this.walletErrorHandle(
          result.message,
          result.title,
          LoadingAppEntryEnum.menu,
          true,
        );
        return;
    }
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
    this.setState({ ...kind, actionButtonsDisabled: false });
    return kind;
  };

  syncRecoveryWalletInfo = async (readOnly: boolean) => {
    if (this.state.recoveryWalletInfoOnDevice) {
      const wallet: WalletType = await RPC.rpcFetchWallet(readOnly);
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
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.indexerServer,
      fasterServer,
    );
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.selectIndexerServer,
      SelectServerEnum.custom,
    );
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.indexerServerPinned,
      false,
    );
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

  walletErrorHandle = async (
    result: string,
    title: string,
    entry: LoadingAppEntryEnum,
    start: boolean,
  ) => {
    // first check the actual server
    // if the server is not working properly sometimes can take more than one minute to fail.
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
    // if no internet connection -> show the error.
    // if Offline mode -> show the error.
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
        this.state.translate,
      );
      this.setState({
        actionButtonsDisabled: false,
        serverErrorTries: 0,
        entry,
      });
    } else {
      const workingServer = await this.checkServer(this.state.indexerServer);
      if (workingServer) {
        // the server is working -> this error is something not related with the server availability
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          [this.screenName],
          title,
          result,
          false,
          this.state.translate,
        );
        this.setState({
          actionButtonsDisabled: false,
          serverErrorTries: 0,
          entry,
        });
      } else {
        // let's change to another server
        if (this.state.serverErrorTries === 0) {
          // first try
          this.setState({ entry, actionButtonsDisabled: true });
          this.addLastSnackbar({
            message: this.state.translate(
              'loadingapp.serverfirsttry',
            ) as string,
            duration: SnackbarDurationEnum.longer,
            screenName: [this.screenName],
          });
          // a different server.
          const someServerIsWorking = await this.selectTheBestServer(true);
          if (someServerIsWorking) {
            if (start) {
              this.setState(
                {
                  startingApp: false,
                  serverErrorTries: 1,
                  entry,
                },
                () => this.runBoot(),
              );
            } else {
              createAlert(
                this.setBackgroundError,
                this.addLastSnackbar,
                [this.screenName],
                title,
                result,
                false,
                this.state.translate,
              );
              this.setState({
                actionButtonsDisabled: false,
                serverErrorTries: 0,
                entry,
              });
            }
          } else {
            createAlert(
              this.setBackgroundError,
              this.addLastSnackbar,
              [this.screenName],
              title,
              this.state.translate('loadingapp.noservers') as string,
              false,
              this.state.translate,
            );
            this.setState({
              actionButtonsDisabled: false,
              serverErrorTries: 0,
              entry,
            });
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
              this.state.translate,
            );
            this.setState({
              actionButtonsDisabled: false,
              serverErrorTries: 0,
              entry,
            });
          }, 1 * 1000);
        }
      }
    }
  };

  fetchBackgroundSyncing = async () => {
    const backgroundJson: BackgroundType =
      await BackgroundFileImpl.readBackground();
    this.setState({ background: backgroundJson });
  };

  setIndexerServer = async (
    indexerServerUri: string,
    indexerServerChainName: ChainNameEnum,
    indexerNetwork?: IndexerNetworkEnum,
  ) => {
    const NewIndexerServer: ServerType = {
      uri: indexerServerUri,
      chainName: indexerServerChainName,
    };
    this.setState(state => ({
      indexerServer: NewIndexerServer,
      indexerServerPinned: true,
      indexerNetwork: indexerNetwork ?? state.indexerNetwork,
    }));
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.indexerServer,
      NewIndexerServer,
    );
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.indexerServerPinned,
      true,
    );
    if (indexerNetwork) {
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.indexerNetwork,
        indexerNetwork,
      );
    }
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.selectIndexerServer,
      SelectServerEnum.custom,
    );
  };

  closeServers = (
    navigation: NativeStackNavigationProp<LoadingAppStackParamList>,
  ) => {
    navigation.popToTop();
  };

  navigateToLoadedApp = (
    readOnly: boolean,
    orchardPool: boolean,
    saplingPool: boolean,
    transparentPool: boolean,
    firstLaunchingMessage: LaunchingModeEnum,
  ) => {
    this.props.navigationApp.reset({
      index: 0,
      routes: [
        {
          name: RouteEnum.LoadedApp,
          params: {
            readOnly,
            orchardPool,
            saplingPool,
            transparentPool,
            firstLaunchingMessage,
          },
        },
      ],
    });
  };

  createNewWallet = async (): Promise<void> => {
    if (
      !this.state.netInfo.isConnected ||
      this.state.selectIndexerServer === SelectServerEnum.offline
    ) {
      this.addLastSnackbar({
        message: this.state.translate('loadedapp.connection-error') as string,
        screenName: [this.screenName],
      });
      return;
    }
    this.setState({ actionButtonsDisabled: true });
    let seed: string = await RPCModule.createNewWallet(
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
          this.setState({ actionButtonsDisabled: false });
          createAlert(
            this.setBackgroundError,
            this.addLastSnackbar,
            [this.screenName],
            this.state.translate('loadingapp.creatingwallet-label') as string,
            seedJSON.error,
            false,
            this.state.translate,
          );
          return;
        }
      } catch (e: unknown) {
        this.setState({ actionButtonsDisabled: false });
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          [this.screenName],
          this.state.translate('loadingapp.creatingwallet-label') as string,
          e instanceof Error ? e.message : String(e),
          false,
          this.state.translate,
        );
        return;
      }
      const wallet: WalletType = {
        seed: seedJSON.seed_phrase || '',
        birthday: seedJSON.birthday || 0,
      };
      // storing the seed & birthday in KeyChain/KeyStore
      if (this.state.recoveryWalletInfoOnDevice) {
        await createUpdateRecoveryWalletInfo(wallet);
      } else {
        if (this.state.hasRecoveryWalletInfoSaved) {
          await removeRecoveryWalletInfo();
        }
      }
      this.setState({ wallet, actionButtonsDisabled: false });
      await this.ensureTorClient();

      await ScheduledActionsFileImpl.resetSA();
      await notifee.cancelAllNotifications();

      this.navigateToLoadedApp(
        false,
        true,
        true,
        true,
        this.state.firstLaunchingMessage,
      );
    } else {
      this.walletErrorHandle(
        seed,
        this.state.translate('loadingapp.creatingwallet-label') as string,
        LoadingAppEntryEnum.menu,
        false,
      );
    }
  };

  getwalletToRestore = async () => {
    this.setState({ wallet: {} as WalletType });
  };

  doRestore = async (seed: string, birthday: number) => {
    if (!seed) {
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        [this.screenName],
        this.state.translate('loadingapp.emptyseedufvk-label') as string,
        this.state.translate('loadingapp.emptyseedufvk-error') as string,
        false,
        this.state.translate,
      );
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
        this.state.translate,
      );
      return;
    }

    this.setState({ actionButtonsDisabled: true });
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

    const fail = (message: string) =>
      this.walletErrorHandle(
        message,
        this.state.translate('loadingapp.readingwallet-label') as string,
        LoadingAppEntryEnum.import,
        false,
      );

    if (!result || result.toLowerCase().startsWith(GlobalConst.error)) {
      await fail(result);
      return;
    }
    let resultJson: RPCSeedType & RPCUfvkType;
    try {
      resultJson = await JSON.parse(result);
    } catch (e: unknown) {
      await fail(e instanceof Error ? e.message : String(e));
      return;
    }
    if (resultJson.error) {
      await fail(resultJson.error);
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
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.basicFirstViewSeed,
      true,
    );

    const wallet = await this.readWalletKind();
    await this.ensureTorClient();
    await ScheduledActionsFileImpl.resetSA();
    await notifee.cancelAllNotifications();

    this.navigateToLoadedApp(
      wallet.readOnly,
      wallet.orchardPool,
      wallet.saplingPool,
      wallet.transparentPool,
      this.state.firstLaunchingMessage,
    );
  };

  setPrivacyOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.privacy, value);
    this.setState({
      privacy: value as boolean,
    });
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

  recoverRecoveryWalletInfo = async (security: boolean) => {
    // recover the wallet keys from the device
    const wallet = await getRecoveryWalletInfo();
    // in IOS the App + OS needs some time to close the biometric screen
    // then the Alert can be too fast.
    if (wallet.seed || wallet.ufvk) {
      const txt = (wallet.seed || wallet.ufvk) + '\n\n' + wallet.birthday;
      setTimeout(
        () => {
          Alert.alert(
            this.props.translate('loadedapp.walletseed-basic') as string,
            (security
              ? ''
              : ((this.props.translate('loadingapp.recoverkeysinstall') +
                  '\n\n') as string)) + txt,
            [
              {
                text: this.props.translate('copy') as string,
                onPress: () => {
                  Clipboard.setString(txt);
                  this.addLastSnackbar({
                    message: this.props.translate('txtcopied') as string,
                    duration: SnackbarDurationEnum.short,
                    screenName: [this.screenName],
                  });
                },
              },
              {
                text: this.props.translate('cancel') as string,
                style: 'cancel',
              },
            ],
            { cancelable: false },
          );
          // IOS needs time to close the biometric screen.
          // but Android I don't think so, a little bit Just in case.
        },
        Platform.OS === GlobalConst.platformOSios ? 2 * 1000 : 100,
      );
    }
  };

  openCurrentWallet = () => {
    this.setState({ startingApp: false, entry: LoadingAppEntryEnum.boot }, () =>
      this.runBoot(),
    );
  };

  async fetchZingolibVersion(): Promise<void> {
    try {
      const start = Date.now();
      let zingolibStr: string = await RPCModule.getVersionInfo();
      if (Date.now() - start) {
        console.log(
          '=========================================== > zingolib version - ',
          Date.now() - start,
        );
      }
      if (zingolibStr) {
        if (zingolibStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error zingolib version ${zingolibStr}`);
          zingolibStr = GlobalConst.zingolibError;
        }
      } else {
        console.log('Internal Error zingolib version');
        zingolibStr = GlobalConst.zingolibNone;
      }

      //const start2 = Date.now();
      this.setState({
        zingolibVersion: zingolibStr,
      });
      //console.log('=========================================== > set zingolib version - ', Date.now() - start2);
    } catch (error) {
      console.log(`Critical Error info ${error}`);
      return;
    }
  }

  render() {
    const {
      entry,
      actionButtonsDisabled,
      walletExists,
      openWalletFailed,
      snackbars,
      firstLaunchingMessage,
      biometricsFailed,
      translate,
    } = this.state;

    //console.log('render loadingAppClass - 3', this.state.privacy);

    const context = {
      // context
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
      setPrivacyOption: this.setPrivacyOption,

      // settings
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
      <BackdropHost>
        <ToastProvider>
          <Snackbars
            snackbars={snackbars}
            removeFirstSnackbar={this.removeFirstSnackbar}
            screenName={this.screenName}
          />

          <ContextAppLoadingProvider value={context}>
            {entry === LoadingAppEntryEnum.boot && (
              <Launching
                empty={true}
                translate={translate}
                firstLaunchingMessage={firstLaunchingMessage}
                biometricsFailed={biometricsFailed}
                tryAgain={() => {
                  this.setState({ biometricsFailed: false }, () =>
                    this.runBoot(),
                  );
                }}
              />
            )}
            {entry !== LoadingAppEntryEnum.boot && (
              <LoadingStack.Navigator
                initialRouteName={
                  entry === LoadingAppEntryEnum.import
                    ? RouteEnum.Import
                    : RouteEnum.StartMenu
                }
                screenOptions={{ headerShown: false }}
              >
                <LoadingStack.Screen
                  name={RouteEnum.StartMenu}
                  options={{
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                >
                  {({ navigation }) => (
                    <StartMenu
                      actionButtonsDisabled={actionButtonsDisabled}
                      walletExists={walletExists}
                      openWalletFailed={openWalletFailed}
                      playIntro={this.coldStart && !walletExists}
                      openCurrentWallet={this.openCurrentWallet}
                      createNewWallet={this.createNewWallet}
                      getwalletToRestore={() => {
                        this.getwalletToRestore();
                        navigation.navigate(RouteEnum.Import);
                      }}
                      openServers={() =>
                        navigation.navigate(RouteEnum.ChooseIndexer)
                      }
                    />
                  )}
                </LoadingStack.Screen>
                <LoadingStack.Screen name={RouteEnum.Import}>
                  {({ navigation }) => (
                    <Import
                      actionButtonsDisabled={actionButtonsDisabled}
                      onClickOK={(s: string, b: number) => this.doRestore(s, b)}
                      onClickCancel={() => {
                        if (navigation.canGoBack()) {
                          navigation.goBack();
                          return;
                        }
                        this.setState({ entry: LoadingAppEntryEnum.menu });
                        navigation.replace(RouteEnum.StartMenu);
                      }}
                    />
                  )}
                </LoadingStack.Screen>
                <LoadingStack.Screen name={RouteEnum.ChooseIndexer}>
                  {() => <ChooseIndexer />}
                </LoadingStack.Screen>
                <LoadingStack.Screen name={RouteEnum.ListedIndexers}>
                  {({ navigation }) => (
                    <ListedIndexers
                      setIndexerServer={this.setIndexerServer}
                      closeServers={() => this.closeServers(navigation)}
                      previousServer={this.state.indexerServer.uri}
                    />
                  )}
                </LoadingStack.Screen>
                <LoadingStack.Screen name={RouteEnum.CustomIndexer}>
                  {({ navigation }) => (
                    <CustomIndexer
                      setIndexerServer={this.setIndexerServer}
                      closeServers={() => this.closeServers(navigation)}
                    />
                  )}
                </LoadingStack.Screen>
              </LoadingStack.Navigator>
            )}
          </ContextAppLoadingProvider>
        </ToastProvider>
      </BackdropHost>
    );
  }
}
