import React, { Component } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import {
  NativeStackNavigationProp,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import NetInfo, {
  NetInfoState,
} from '@react-native-community/netinfo/src/index';

import {
  AppStateStatusEnum,
  BackgroundType,
  ChainNameEnum,
  GlobalConst,
  NetInfoType,
  RouteEnum,
  ScreenEnum,
  SelectServerEnum,
  ServerType,
  SnackbarDurationEnum,
  SnackbarType,
  TranslateType,
  WalletType,
  ZecPriceType,
  BackgroundErrorType,
  EventListenerEnum,
  IndexerNetworkEnum,
} from '../AppState';
import { writeSettings } from '../storage/settingsFile';
import { SetupDomains, SetupDomainsProvider } from '../context';
import BackgroundFileImpl from '../../components/Background';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Snackbars from '../../components/Components/Snackbars';
import { SetupStackParamList } from '../types';
import Import from './components/Import';
import StartMenu from './components/StartMenu';
import { ToastProvider } from 'react-native-toastier';
import ChooseIndexer from './components/ChooseIndexer';
import ListedIndexers from './components/ListedIndexers';
import CustomIndexer from './components/CustomIndexer';
import { BackdropHost } from '../Backdrop';
import { BootInfo, OpenRequest } from '../lifecycle/phase';
import { useLifecycle } from '../lifecycle';
import { getRecoveryWalletInfo } from '../recoveryWalletInfov10';

const SetupStack = createNativeStackNavigator<SetupStackParamList>();

type SetupClassProps = {
  boot: BootInfo;
  walletExists: boolean;
  coldStart: boolean;
  openFailed: boolean;
  translate: (key: string) => TranslateType;
  startOpening: (request: OpenRequest) => void;
};

type SetupState = SetupDomains & {
  appStateStatus: AppStateStatus;
  firstLaunchingMessage: import('../AppState').LaunchingModeEnum;
  walletExists: boolean;
  openWalletFailed: boolean;
  actionButtonsDisabled: boolean;
  indexerNetwork: IndexerNetworkEnum;
  indexerServerPinned: boolean;
};

export default function Setup() {
  const { lifecycle, translate, actions } = useLifecycle();
  if (lifecycle.phase !== 'setup') {
    return null;
  }
  return (
    <SetupClass
      boot={lifecycle.boot}
      walletExists={lifecycle.walletExists}
      coldStart={lifecycle.coldStart}
      openFailed={lifecycle.openFailed}
      translate={translate}
      startOpening={actions.startOpening}
    />
  );
}

class SetupClass extends Component<SetupClassProps, SetupState> {
  subscriptions: (() => void)[] = [];
  screenName = ScreenEnum.Boot;

  constructor(props: SetupClassProps) {
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
      setPrivacyOption: this.setPrivacyOption,

      // context settings
      ...props.boot.settings,

      // state
      appStateStatus: AppState.currentState,
      firstLaunchingMessage: props.boot.launching,
      walletExists: props.walletExists,
      openWalletFailed: props.openFailed,
      actionButtonsDisabled: false,
      indexerNetwork: props.boot.indexerNetwork,
      indexerServerPinned: props.boot.indexerServerPinned,
    };
  }

  componentDidMount = async () => {
    this.subscribe();
    await this.fetchBackgroundSyncing();
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
    await writeSettings('indexerServer', NewIndexerServer);
    await writeSettings('indexerServerPinned', true);
    if (indexerNetwork) {
      await writeSettings('indexerNetwork', indexerNetwork);
    }
    await writeSettings('selectIndexerServer', SelectServerEnum.custom);
  };

  closeServers = (
    navigation: NativeStackNavigationProp<SetupStackParamList>,
  ) => {
    navigation.popToTop();
  };

  setPrivacyOption = async (value: boolean): Promise<void> => {
    await writeSettings('privacy', value);
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
    const wallet = await getRecoveryWalletInfo();
    if (wallet.seed || wallet.ufvk) {
      const txt = (wallet.seed || wallet.ufvk) + '\n\n' + wallet.birthday;
      setTimeout(() => {
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
      }, 100);
    }
  };

  getwalletToRestore = async () => {
    this.setState({ wallet: {} as WalletType });
  };

  render() {
    const { snackbars } = this.state;

    const context: SetupDomains = {
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

          <SetupDomainsProvider value={context}>
            <SetupStack.Navigator
              initialRouteName={RouteEnum.StartMenu}
              screenOptions={{ headerShown: false }}
            >
              <SetupStack.Screen
                name={RouteEnum.StartMenu}
                options={{
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              >
                {({ navigation }) => (
                  <StartMenu
                    actionButtonsDisabled={this.state.actionButtonsDisabled}
                    walletExists={this.state.walletExists}
                    openWalletFailed={this.state.openWalletFailed}
                    playIntro={this.props.coldStart && !this.state.walletExists}
                    openCurrentWallet={() =>
                      this.props.startOpening({ kind: 'open' })
                    }
                    createNewWallet={() =>
                      this.props.startOpening({ kind: 'create' })
                    }
                    getwalletToRestore={() => {
                      this.getwalletToRestore();
                      navigation.navigate(RouteEnum.Import);
                    }}
                    openServers={() =>
                      navigation.navigate(RouteEnum.ChooseIndexer)
                    }
                  />
                )}
              </SetupStack.Screen>
              <SetupStack.Screen name={RouteEnum.Import}>
                {({ navigation }) => (
                  <Import
                    actionButtonsDisabled={this.state.actionButtonsDisabled}
                    onClickOK={(s: string, b: number) =>
                      this.props.startOpening({
                        kind: 'restore',
                        seed: s,
                        birthday: b,
                      })
                    }
                    onClickCancel={() => {
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                        return;
                      }
                      navigation.replace(RouteEnum.StartMenu);
                    }}
                  />
                )}
              </SetupStack.Screen>
              <SetupStack.Screen name={RouteEnum.ChooseIndexer}>
                {() => <ChooseIndexer />}
              </SetupStack.Screen>
              <SetupStack.Screen name={RouteEnum.ListedIndexers}>
                {({ navigation }) => (
                  <ListedIndexers
                    setIndexerServer={this.setIndexerServer}
                    closeServers={() => this.closeServers(navigation)}
                    previousServer={this.state.indexerServer.uri}
                  />
                )}
              </SetupStack.Screen>
              <SetupStack.Screen name={RouteEnum.CustomIndexer}>
                {({ navigation }) => (
                  <CustomIndexer
                    setIndexerServer={this.setIndexerServer}
                    closeServers={() => this.closeServers(navigation)}
                  />
                )}
              </SetupStack.Screen>
            </SetupStack.Navigator>
          </SetupDomainsProvider>
        </ToastProvider>
      </BackdropHost>
    );
  }
}
