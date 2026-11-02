import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

import NetInfo, {
  NetInfoState,
} from '@react-native-community/netinfo/src/index';

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
import { SeedType, UfvkType, WalletKindType } from '../wallet/types';
import Snackbars from '../../components/Components/Snackbars';
import Launching from '../lifecycle/Launching';
import isEqual from 'lodash/isEqual';
import {
  createUpdateRecoveryWalletInfo,
  hasRecoveryWalletInfo,
  removeRecoveryWalletInfo,
} from '../recoveryWalletInfov10';
import { WalletKindEnum } from '../wallet/enums';
import { ToastProvider } from 'react-native-toastier';
import { resetScheduledActions } from '../storage/scheduledActionsFile';
import { discoverIndexers, probeIndexer, selectBestIndexer } from '../indexers';
import {
  quarantineLegacyWalletIfNeeded,
  quarantineUnreadableWallet,
} from '../legacyWallet';
import notifee from '@notifee/react-native';
import { reportFailure } from '../reporting';
import {
  BootInfo,
  Lifecycle,
  OpenRequest,
  SessionHandle,
} from '../lifecycle/phase';
import { useLifecycle } from '../lifecycle';

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
  // App.tsx only mounts this screen in the 'opening' phase.
  const opening = lifecycle as Extract<Lifecycle, { phase: 'opening' }>;
  const { boot } = opening;
  const request = opening.request;
  const sessionOpened = actions.sessionOpened;
  const openingFailed = actions.openingFailed;

  const screenName = ScreenEnum.Boot;

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

  const [state, setState] = useState<OpeningState>({
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
    setPrivacyOption: async () => {},

    // context settings
    ...boot.settings,

    // state
    appStateStatus: AppState.currentState,
    indexerNetwork: boot.indexerNetwork,
    indexerServerPinned: boot.indexerServerPinned,
    serverErrorTries: 0,
    hasRecoveryWalletInfoSaved: false,
    actionButtonsDisabled: true,
  });
  // async flows read state across awaits; the ref mirrors it so reads stay
  // live like this.state was in the class component.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  const patchState = (part: Partial<OpeningState>) =>
    setState(prev => ({ ...prev, ...part }));

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      patchState({ appStateStatus: nextAppState });
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
    run(request);

    return () => {
      appStateSubscription?.remove?.();
      netInfoSubscription?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (openRequest: OpenRequest) => {
    const netInfoState = await NetInfo.fetch();
    patchState({
      netInfo: {
        isConnected: netInfoState.isConnected,
        type: netInfoState.type,
        isConnectionExpensive:
          netInfoState.details && netInfoState.details.isConnectionExpensive,
      },
    });

    fetchZingolibVersion();

    await WalletService.setCryptoDefaultProvider();

    const has = await hasRecoveryWalletInfo();
    patchState({ hasRecoveryWalletInfoSaved: has });

    if (!stateRef.current.indexerServer.uri) {
      const { indexers } = await discoverIndexers(
        stateRef.current.indexerNetwork,
      );
      const best = indexers[0];
      if (best) {
        const server: ServerType = {
          uri: best.uri,
          chainName: ChainNameEnum.testChainName,
        };
        patchState({ indexerServer: server });
        await writeSettings('indexerServer', server);
      } else {
        addLastSnackbar({
          message: stateRef.current.translate('loadingapp.noservers') as string,
          screenName: [screenName],
        });
      }
    }

    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);

    switch (openRequest.kind) {
      case 'create':
        await createFlow();
        return;
      case 'restore':
        await restoreFlow(openRequest.seed, openRequest.birthday);
        return;
      case 'open':
        await openFlow();
        return;
    }
  };

  const finishToSetup = async () => {
    await writeSettings('basicFirstViewSeed', true);
    openingFailed();
  };

  const openFlow = async () => {
    const exists = await WalletService.walletExists();
    if (!exists || exists === GlobalConst.false) {
      await finishToSetup();
      return;
    }

    // A wallet from a previous network can no longer be used: probe the
    // configured indexer first, abandon it when it cannot serve this chain,
    // and quarantine a wallet file this build cannot read.
    if (
      stateRef.current.netInfo.isConnected &&
      stateRef.current.selectIndexerServer !== SelectServerEnum.offline &&
      stateRef.current.indexerServer.uri
    ) {
      const probed = await probeIndexer(
        stateRef.current.indexerServer.uri,
        stateRef.current.indexerNetwork,
      ).catch(() => null);
      if (!probed) {
        const { indexers } = await discoverIndexers(
          stateRef.current.indexerNetwork,
        );
        const best = indexers[0];
        if (best && best.uri !== stateRef.current.indexerServer.uri) {
          const server: ServerType = {
            uri: best.uri,
            chainName: ChainNameEnum.testChainName,
          };
          patchState({
            indexerServer: server,
            indexerServerPinned: false,
          });
          await writeSettings('indexerServer', server);
          await writeSettings('indexerServerPinned', false);
        }
      }
    }
    const quarantined = await quarantineLegacyWalletIfNeeded(
      stateRef.current.indexerServer.uri,
      Platform.OS,
    );
    if (quarantined) {
      await finishToSetup();
      return;
    }

    const result: string = await WalletService.loadExistingWallet(
      stateRef.current.indexerServer.uri,
      stateRef.current.indexerServer.chainName,
      stateRef.current.performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );
    const title = stateRef.current.translate(
      'loadingapp.readingwallet-label',
    ) as string;
    if (!result || result.toLowerCase().startsWith(GlobalConst.error)) {
      if (await quarantineUnreadableWallet(Platform.OS)) {
        await finishToSetup();
        return;
      }
      await walletErrorHandle(result, title, true);
      return;
    }
    let resultJson: SeedType & UfvkType;
    try {
      resultJson = await JSON.parse(result);
    } catch (e: unknown) {
      await walletErrorHandle(
        e instanceof Error ? e.message : String(e),
        title,
        true,
      );
      return;
    }
    if (resultJson.error) {
      await walletErrorHandle(resultJson.error, title, true);
      return;
    }

    // Indexer selection probes every known indexer and can stall for a long
    // time when some of them don't answer. It only optimizes the endpoint —
    // the wallet is already open against the configured one, and the rust
    // side re-points the client when a better one wins — so it must never
    // gate opening. Run it in the background; failures are non-fatal.
    if (
      !stateRef.current.indexerServerPinned &&
      stateRef.current.netInfo.isConnected
    ) {
      selectBestIndexer(stateRef.current.indexerNetwork)
        .then(async best => {
          if (best && best !== stateRef.current.indexerServer.uri) {
            const winner: ServerType = {
              uri: best,
              chainName: stateRef.current.indexerServer.chainName,
            };
            patchState({ indexerServer: winner });
            await writeSettings('indexerServer', winner);
          }
        })
        .catch(() => {});
    }

    const wallet = await readWalletKind();
    await ensureTorClient();
    sessionOpened({
      walletKind: wallet,
      launching: boot.launching,
    });
  };

  const createFlow = async (): Promise<void> => {
    // creating a wallet works offline: the native side derives the seed and
    // sets the birthday without contacting the indexer. the first sync needs
    // the network, not the creation itself.
    const seed: string = await WalletService.createNewWallet(
      stateRef.current.indexerServer.uri,
      stateRef.current.indexerServer.chainName,
      stateRef.current.performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );

    if (seed && !seed.toLowerCase().startsWith(GlobalConst.error)) {
      let seedJSON = {} as SeedType;
      try {
        seedJSON = await JSON.parse(seed);
        if (seedJSON.error) {
          reportFailure(
            stateRef.current.translate(
              'loadingapp.creatingwallet-label',
            ) as string,
            seedJSON.error,
          );
          await walletErrorHandle(
            seedJSON.error,
            stateRef.current.translate(
              'loadingapp.creatingwallet-label',
            ) as string,
            false,
          );
          return;
        }
      } catch (e: unknown) {
        reportFailure(
          stateRef.current.translate(
            'loadingapp.creatingwallet-label',
          ) as string,
          e instanceof Error ? e.message : String(e),
        );
        await walletErrorHandle(
          e instanceof Error ? e.message : String(e),
          stateRef.current.translate(
            'loadingapp.creatingwallet-label',
          ) as string,
          false,
        );
        return;
      }
      const wallet: WalletType = {
        seed: seedJSON.seed_phrase || '',
        birthday: seedJSON.birthday || 0,
      };
      if (stateRef.current.recoveryWalletInfoOnDevice) {
        await createUpdateRecoveryWalletInfo(wallet);
      } else if (stateRef.current.hasRecoveryWalletInfoSaved) {
        await removeRecoveryWalletInfo();
      }
      patchState({ wallet });
      await ensureTorClient();

      await resetScheduledActions();
      await notifee.cancelAllNotifications();

      sessionOpened({
        walletKind: {
          readOnly: false,
          orchardPool: true,
          saplingPool: true,
          transparentPool: true,
        },
        launching: boot.launching,
      });
    } else {
      await walletErrorHandle(
        seed,
        stateRef.current.translate('loadingapp.creatingwallet-label') as string,
        false,
      );
    }
  };

  const restoreFlow = async (seed: string, birthday: number) => {
    if (!seed) {
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        [screenName],
        stateRef.current.translate('loadingapp.emptyseedufvk-label') as string,
        stateRef.current.translate('loadingapp.emptyseedufvk-error') as string,
        false,
      );
      openingFailed();
      return;
    }
    if (
      seed.toLowerCase().startsWith(GlobalConst.uview) ||
      seed.toLowerCase().startsWith(GlobalConst.utestview)
    ) {
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        [screenName],
        stateRef.current.translate(
          'loadingapp.invalidseedufvk-label',
        ) as string,
        stateRef.current.translate(
          'loadingapp.invalidseedufvk-error',
        ) as string,
        false,
      );
      openingFailed();
      return;
    }

    const parsedBirthday = parseInt(birthday.toString(), 10);
    const walletBirthday =
      isNaN(parsedBirthday) || parsedBirthday < 0
        ? '0'
        : String(parsedBirthday);

    const result: string = await WalletService.restoreWalletFromSeed(
      seed.toLowerCase(),
      walletBirthday,
      stateRef.current.indexerServer.uri,
      stateRef.current.indexerServer.chainName,
      stateRef.current.performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );

    if (!result || result.toLowerCase().startsWith(GlobalConst.error)) {
      await walletErrorHandle(
        result,
        stateRef.current.translate('loadingapp.readingwallet-label') as string,
        false,
      );
      return;
    }
    let resultJson: SeedType & UfvkType;
    try {
      resultJson = await JSON.parse(result);
    } catch (e: unknown) {
      await walletErrorHandle(
        e instanceof Error ? e.message : String(e),
        stateRef.current.translate('loadingapp.readingwallet-label') as string,
        false,
      );
      return;
    }
    if (resultJson.error) {
      await walletErrorHandle(
        resultJson.error,
        stateRef.current.translate('loadingapp.readingwallet-label') as string,
        false,
      );
      return;
    }

    if (stateRef.current.recoveryWalletInfoOnDevice) {
      await createUpdateRecoveryWalletInfo({
        seed: seed.toLowerCase(),
        birthday: Number(walletBirthday),
      });
    } else if (stateRef.current.hasRecoveryWalletInfoSaved) {
      await removeRecoveryWalletInfo();
    }
    await writeSettings('basicFirstViewSeed', true);

    const wallet = await readWalletKind();
    await ensureTorClient();
    await resetScheduledActions();
    await notifee.cancelAllNotifications();

    sessionOpened({
      walletKind: wallet,
      launching: boot.launching,
    });
  };

  const readWalletKind = async (): Promise<WalletKind> => {
    const kind: WalletKind = {
      readOnly: false,
      orchardPool: false,
      saplingPool: false,
      transparentPool: false,
    };
    const walletKindStr: string = await WalletService.walletKindInfo();
    try {
      const walletKindJSON: WalletKindType = await JSON.parse(walletKindStr);
      kind.readOnly =
        walletKindJSON.kind ===
          WalletKindEnum.LoadedFromUnifiedFullViewingKey ||
        walletKindJSON.kind === WalletKindEnum.NoKeysFound;
      kind.orchardPool = walletKindJSON.orchard;
      kind.saplingPool = walletKindJSON.sapling;
      kind.transparentPool = walletKindJSON.transparent;
      await syncRecoveryWalletInfo(kind.readOnly);
    } catch (e) {
      addLastSnackbar({
        message: walletKindStr,
        screenName: [screenName],
      });
    }
    patchState({ ...kind });
    return kind;
  };

  const syncRecoveryWalletInfo = async (readOnly: boolean) => {
    if (stateRef.current.recoveryWalletInfoOnDevice) {
      const wallet: WalletType = await WalletService.rpcFetchWallet(readOnly);
      await createUpdateRecoveryWalletInfo(wallet);
    } else if (stateRef.current.hasRecoveryWalletInfoSaved) {
      await removeRecoveryWalletInfo();
    }
  };

  const ensureTorClient = async () => {
    if (
      stateRef.current.currency === CurrencyEnum.USDTORCurrency ||
      stateRef.current.currency === CurrencyEnum.USDCurrency
    ) {
      await WalletService.createTorClientProcess();
    }
  };

  const selectTheBestServer = async (
    aDifferentOne: boolean,
  ): Promise<boolean> => {
    const actualServer = stateRef.current.indexerServer;
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
    patchState({
      indexerServer: fasterServer,
      selectIndexerServer: SelectServerEnum.custom,
      indexerServerPinned: false,
    });
    await writeSettings('indexerServer', fasterServer);
    await writeSettings('selectIndexerServer', SelectServerEnum.custom);
    await writeSettings('indexerServerPinned', false);
    if (isEqual(actualServer, fasterServer)) {
      addLastSnackbar({
        message: stateRef.current.translate(
          'loadedapp.selectingserversame',
        ) as string,
        duration: SnackbarDurationEnum.long,
        screenName: [screenName],
      });
    } else {
      addLastSnackbar({
        message:
          (stateRef.current.translate(
            'loadedapp.selectingserverbest',
          ) as string) +
          ' ' +
          fasterServer.uri,
        duration: SnackbarDurationEnum.long,
        screenName: [screenName],
      });
    }
    return true;
  };

  const checkServer = async (server: ServerType): Promise<boolean> =>
    (await probeIndexer(server.uri)) !== null;

  const walletErrorHandle = async (
    result: string,
    title: string,
    start: boolean,
  ) => {
    if (
      start &&
      stateRef.current.netInfo.isConnected &&
      stateRef.current.selectIndexerServer !== SelectServerEnum.offline
    ) {
      addLastSnackbar({
        message: stateRef.current.translate('restarting') as string,
        duration: SnackbarDurationEnum.long,
        screenName: [screenName],
      });
    }
    if (
      !stateRef.current.netInfo.isConnected ||
      stateRef.current.selectIndexerServer === SelectServerEnum.offline
    ) {
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        [screenName],
        title,
        result,
        false,
      );
      patchState({ serverErrorTries: 0 });
      openingFailed();
    } else {
      const workingServer = await checkServer(stateRef.current.indexerServer);
      if (workingServer) {
        // the server is working -> this error is not related to availability
        reportFailure(title, result);
        createAlert(
          setBackgroundError,
          addLastSnackbar,
          [screenName],
          title,
          result,
          false,
        );
        patchState({ serverErrorTries: 0 });
        openingFailed();
      } else {
        if (stateRef.current.serverErrorTries === 0) {
          // first try: a different server, then re-run the same request
          addLastSnackbar({
            message: stateRef.current.translate(
              'loadingapp.serverfirsttry',
            ) as string,
            duration: SnackbarDurationEnum.longer,
            screenName: [screenName],
          });
          const someServerIsWorking = await selectTheBestServer(true);
          if (someServerIsWorking) {
            if (start) {
              patchState({ serverErrorTries: 1 });
              run(request);
            } else {
              createAlert(
                setBackgroundError,
                addLastSnackbar,
                [screenName],
                title,
                result,
                false,
              );
              patchState({ serverErrorTries: 0 });
              openingFailed();
            }
          } else {
            createAlert(
              setBackgroundError,
              addLastSnackbar,
              [screenName],
              title,
              stateRef.current.translate('loadingapp.noservers') as string,
              false,
            );
            patchState({ serverErrorTries: 0 });
            openingFailed();
          }
        } else {
          // second try
          addLastSnackbar({
            message: stateRef.current.translate(
              'loadingapp.serversecondtry',
            ) as string,
            duration: SnackbarDurationEnum.longer,
            screenName: [screenName],
          });
          setTimeout(() => {
            createAlert(
              setBackgroundError,
              addLastSnackbar,
              [screenName],
              title,
              result,
              false,
            );
            patchState({ serverErrorTries: 0 });
            openingFailed();
          }, 1 * 1000);
        }
      }
    }
  };

  const fetchZingolibVersion = async (): Promise<void> => {
    try {
      let zingolibStr: string = await WalletService.getVersionInfo();
      if (zingolibStr) {
        if (zingolibStr.toLowerCase().startsWith(GlobalConst.error)) {
          zingolibStr = GlobalConst.zingolibError;
        }
      } else {
        zingolibStr = GlobalConst.zingolibNone;
      }
      patchState({ zingolibVersion: zingolibStr });
    } catch (error) {
      console.log(`Critical Error info ${error}`);
    }
  };

  const { snackbars } = state;

  const context: SetupDomains = {
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
    setPrivacyOption: state.setPrivacyOption,

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

  if (lifecycle.phase !== 'opening') {
    return null;
  }

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />
      <SetupDomainsProvider value={context}>
        <Launching
          empty={true}
          translate={translate}
          firstLaunchingMessage={boot.launching}
          biometricsFailed={false}
        />
      </SetupDomainsProvider>
    </ToastProvider>
  );
}
