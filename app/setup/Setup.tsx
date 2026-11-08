import React, { useEffect } from 'react';
import {
  NativeStackNavigationProp,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { ToastProvider } from 'react-native-toastier';

import {
  ChainNameEnum,
  IndexerNetworkEnum,
  RouteEnum,
  ScreenEnum,
  SelectServerEnum,
  ServerType,
  WalletType,
} from '../AppState';
import { writeSettings } from '../storage/settingsFile';
import { read } from '../store/appStore';
import { addLastSnackbar } from '../store/feedback';
import WalletService from '../wallet';
import { parseWalletFileRecoveryInfo } from '../walletFile';
import {
  enterPhase,
  patch,
  showBackgroundErrorIfAny,
  useFeedback,
  usePhase,
} from '../store';
import {
  fetchBackgroundSyncing,
  watchBackgroundFlag,
  watchNetInfo,
} from '../store/platform';
import Snackbars from '../../components/Components/Snackbars';
import { SetupStackParamList } from '../types';
import Import from './components/Import';
import StartMenu from './components/StartMenu';
import NewSeed from './components/NewSeed';
import ChooseIndexer from './components/ChooseIndexer';
import ListedIndexers from './components/ListedIndexers';
import CustomIndexer from './components/CustomIndexer';
import { BackdropHost } from '../Backdrop';
import { Lifecycle } from '../lifecycle/phase';
import { useLifecycle } from '../lifecycle';
import { navigationTheme, useTheme } from '../theme';

const SetupStack = createNativeStackNavigator<SetupStackParamList>();

const setIndexerServer = async (
  uri: string,
  chainName: ChainNameEnum,
  indexerNetwork?: IndexerNetworkEnum,
): Promise<void> => {
  const indexerServer: ServerType = { uri, chainName };
  patch({ indexerServer });
  await writeSettings('indexerServer', indexerServer);
  await writeSettings('indexerServerPinned', true);
  if (indexerNetwork) {
    await writeSettings('indexerNetwork', indexerNetwork);
  }
  await writeSettings('selectIndexerServer', SelectServerEnum.custom);
};

const getwalletToRestore = (): void => patch({ wallet: {} as WalletType });

const recoverFromFile = async (
  navigation: NativeStackNavigationProp<SetupStackParamList>,
): Promise<void> => {
  const result = await WalletService.readWalletRecoveryInfo(
    read().indexerServer.chainName,
  );
  const info = parseWalletFileRecoveryInfo(result);
  if (!info) {
    addLastSnackbar({ message: result, screenName: [ScreenEnum.Boot] });
    return;
  }
  patch({
    wallet: {
      seed: info.seed_phrase ?? undefined,
      ufvk: info.ufvk ?? undefined,
      birthday: info.birthday,
    },
  });
  navigation.navigate(RouteEnum.RecoveredSeed);
};

const closeServers = (
  navigation: NativeStackNavigationProp<SetupStackParamList>,
): void => navigation.popToTop();

const onForeground = (): void => {
  fetchBackgroundSyncing();
  showBackgroundErrorIfAny();
};

export default function Setup() {
  const { lifecycle, translate, actions } = useLifecycle();
  const { colors } = useTheme();
  const setup = lifecycle as Extract<Lifecycle, { phase: 'setup' }>;
  const { boot, walletExists, coldStart, openFailed } = setup;
  const startOpening = actions.startOpening;

  useEffect(() => {
    enterPhase('setup', { ...boot.settings, translate });
    const stopNetInfo = watchNetInfo();
    const stopAppState = watchBackgroundFlag(onForeground);
    fetchBackgroundSyncing();
    return () => {
      stopNetInfo();
      stopAppState();
    };
  }, [boot, translate]);

  const phase = usePhase();
  const { snackbars, removeFirstSnackbar } = useFeedback();

  if (lifecycle.phase !== 'setup' || phase !== 'setup') {
    return null;
  }

  return (
    <BackdropHost>
      <ToastProvider>
        <Snackbars
          snackbars={snackbars}
          removeFirstSnackbar={removeFirstSnackbar}
          screenName={ScreenEnum.Boot}
        />

        <NavigationContainer theme={navigationTheme(colors)}>
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
                  actionButtonsDisabled={false}
                  walletExists={walletExists}
                  openWalletFailed={openFailed}
                  recoverFromFile={() => recoverFromFile(navigation)}
                  playIntro={coldStart && !walletExists}
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
                  actionButtonsDisabled={false}
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
            <SetupStack.Screen name={RouteEnum.RecoveredSeed}>
              {({ navigation }) => (
                <NewSeed
                  variant="recovered"
                  onClickOK={() => {
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
                  previousServer={boot.settings.indexerServer.uri}
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
        </NavigationContainer>
      </ToastProvider>
    </BackdropHost>
  );
}
