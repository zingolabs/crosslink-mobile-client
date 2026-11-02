import React, { useEffect, useRef, useState } from 'react';
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
import { readBackground } from '../storage/backgroundFile';
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

const SetupClass: React.FC<SetupClassProps> = ({
  boot,
  walletExists,
  coldStart,
  openFailed,
  translate,
  startOpening,
}) => {
  const screenName = ScreenEnum.Boot;

  const setPrivacyOption = async (value: boolean): Promise<void> => {
    await writeSettings('privacy', value);
    patchState({
      privacy: value as boolean,
    });
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

  const removeFirstSnackbar = () => {
    setState(prev => ({ ...prev, snackbars: prev.snackbars.slice(1) }));
  };

  const [state, setState] = useState<SetupState>({
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
    translate: translate,
    backgroundError: {} as BackgroundErrorType,
    setBackgroundError: setBackgroundError,
    readOnly: false,
    orchardPool: true,
    saplingPool: true,
    transparentPool: true,
    snackbars: [] as SnackbarType[],
    addLastSnackbar: addLastSnackbar,
    removeFirstSnackbar: removeFirstSnackbar,
    zingolibVersion: '',
    setPrivacyOption: setPrivacyOption,

    // context settings
    ...boot.settings,

    // state
    appStateStatus: AppState.currentState,
    firstLaunchingMessage: boot.launching,
    walletExists: walletExists,
    openWalletFailed: openFailed,
    actionButtonsDisabled: false,
    indexerNetwork: boot.indexerNetwork,
    indexerServerPinned: boot.indexerServerPinned,
  });
  // async handlers read state across awaits; the ref mirrors it so reads
  // stay live like this.state was in the class component.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  const patchState = (part: Partial<SetupState>) =>
    setState(prev => ({ ...prev, ...part }));

  useEffect(() => {
    const fetchBackgroundSyncing = async () => {
      const backgroundJson: BackgroundType = await readBackground();
      patchState({ background: backgroundJson });
    };

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const priorAppState = stateRef.current.appStateStatus;
      patchState({ appStateStatus: nextAppState });
      if (
        (priorAppState === AppStateStatusEnum.inactive ||
          priorAppState === AppStateStatusEnum.background) &&
        nextAppState === AppStateStatusEnum.active
      ) {
        fetchBackgroundSyncing();
        await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
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
      if (
        (nextAppState === AppStateStatusEnum.inactive ||
          nextAppState === AppStateStatusEnum.background) &&
        priorAppState === AppStateStatusEnum.active
      ) {
        await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
      }
    };

    const handleNetInfoChange = (connectionState: NetInfoState) => {
      const { isConnected, type, isConnectionExpensive } =
        stateRef.current.netInfo;
      if (
        isConnected !== connectionState.isConnected ||
        type !== connectionState.type ||
        isConnectionExpensive !== connectionState.details?.isConnectionExpensive
      ) {
        patchState({
          netInfo: {
            isConnected: connectionState.isConnected,
            type: connectionState.type,
            isConnectionExpensive:
              connectionState.details &&
              connectionState.details.isConnectionExpensive,
          },
        });
      }
    };

    const appStateSubscription = AppState.addEventListener(
      EventListenerEnum.change,
      handleAppStateChange,
    );
    const netInfoSubscription = NetInfo.addEventListener(handleNetInfoChange);
    fetchBackgroundSyncing();

    return () => {
      appStateSubscription?.remove?.();
      netInfoSubscription?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setIndexerServer = async (
    indexerServerUri: string,
    indexerServerChainName: ChainNameEnum,
    indexerNetwork?: IndexerNetworkEnum,
  ) => {
    const NewIndexerServer: ServerType = {
      uri: indexerServerUri,
      chainName: indexerServerChainName,
    };
    setState(prev => ({
      ...prev,
      indexerServer: NewIndexerServer,
      indexerServerPinned: true,
      indexerNetwork: indexerNetwork ?? prev.indexerNetwork,
    }));
    await writeSettings('indexerServer', NewIndexerServer);
    await writeSettings('indexerServerPinned', true);
    if (indexerNetwork) {
      await writeSettings('indexerNetwork', indexerNetwork);
    }
    await writeSettings('selectIndexerServer', SelectServerEnum.custom);
  };

  const closeServers = (
    navigation: NativeStackNavigationProp<SetupStackParamList>,
  ) => {
    navigation.popToTop();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const recoverRecoveryWalletInfo = async (security: boolean) => {
    const wallet = await getRecoveryWalletInfo();
    if (wallet.seed || wallet.ufvk) {
      const txt = (wallet.seed || wallet.ufvk) + '\n\n' + wallet.birthday;
      setTimeout(() => {
        Alert.alert(
          translate('loadedapp.walletseed-basic') as string,
          (security
            ? ''
            : ((translate('loadingapp.recoverkeysinstall') +
                '\n\n') as string)) + txt,
          [
            {
              text: translate('copy') as string,
              onPress: () => {
                Clipboard.setString(txt);
                addLastSnackbar({
                  message: translate('txtcopied') as string,
                  duration: SnackbarDurationEnum.short,
                  screenName: [screenName],
                });
              },
            },
            {
              text: translate('cancel') as string,
              style: 'cancel',
            },
          ],
          { cancelable: false },
        );
      }, 100);
    }
  };

  const getwalletToRestore = async () => {
    patchState({ wallet: {} as WalletType });
  };

  const { snackbars } = state;

  const context: SetupDomains = {
    // context
    netInfo: state.netInfo,
    wallet: state.wallet,
    zecPrice: state.zecPrice,
    background: state.background,
    translate: state.translate,
    backgroundError: state.backgroundError,
    setBackgroundError: state.setBackgroundError,
    readOnly: state.readOnly,
    orchardPool: state.orchardPool,
    saplingPool: state.saplingPool,
    transparentPool: state.transparentPool,
    snackbars: state.snackbars,
    addLastSnackbar: state.addLastSnackbar,
    removeFirstSnackbar: removeFirstSnackbar,
    zingolibVersion: state.zingolibVersion,
    setPrivacyOption: setPrivacyOption,

    // settings
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

  return (
    <BackdropHost>
      <ToastProvider>
        <Snackbars
          snackbars={snackbars}
          removeFirstSnackbar={removeFirstSnackbar}
          screenName={screenName}
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
                  actionButtonsDisabled={state.actionButtonsDisabled}
                  walletExists={state.walletExists}
                  openWalletFailed={state.openWalletFailed}
                  playIntro={coldStart && !state.walletExists}
                  openCurrentWallet={() => startOpening({ kind: 'open' })}
                  createNewWallet={() => startOpening({ kind: 'create' })}
                  getwalletToRestore={() => {
                    getwalletToRestore();
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
                  actionButtonsDisabled={state.actionButtonsDisabled}
                  onClickOK={(s: string, b: number) =>
                    startOpening({
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
                  setIndexerServer={setIndexerServer}
                  closeServers={() => closeServers(navigation)}
                  previousServer={state.indexerServer.uri}
                />
              )}
            </SetupStack.Screen>
            <SetupStack.Screen name={RouteEnum.CustomIndexer}>
              {({ navigation }) => (
                <CustomIndexer
                  setIndexerServer={setIndexerServer}
                  closeServers={() => closeServers(navigation)}
                />
              )}
            </SetupStack.Screen>
          </SetupStack.Navigator>
        </SetupDomainsProvider>
      </ToastProvider>
    </BackdropHost>
  );
};
