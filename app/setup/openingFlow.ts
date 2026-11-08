import isEqual from 'lodash/isEqual';
import notifee from '@notifee/react-native';

import {
  ChainNameEnum,
  CurrencyEnum,
  GlobalConst,
  IndexerNetworkEnum,
  ScreenEnum,
  SelectServerEnum,
  ServerType,
  SnackbarDurationEnum,
  WalletType,
} from '../AppState';
import { writeSettings } from '../storage/settingsFile';
import WalletService from '../wallet';
import { createAlert } from '../createAlert';
import { SeedType, UfvkType, WalletKindType } from '../wallet/types';
import {
  createUpdateRecoveryWalletInfo,
  hasRecoveryWalletInfo,
  removeRecoveryWalletInfo,
} from '../recoveryWalletInfov10';
import { WalletKindEnum } from '../wallet/enums';
import { resetScheduledActions } from '../storage/scheduledActionsFile';
import { discoverIndexers, probeIndexer, selectBestIndexer } from '../indexers';
import {
  quarantineLegacyWalletIfNeeded,
  quarantineUnreadableWallet,
} from '../legacyWallet';
import { reportFailure } from '../reporting';
import { BootInfo, OpenRequest, SessionHandle } from '../lifecycle/phase';
import { patch, read } from '../store/appStore';
import { addLastSnackbar, setBackgroundError } from '../store/feedback';
import { fetchNetInfo, markBackground } from '../store/platform';

export type OpeningInput = {
  boot: BootInfo;
  request: OpenRequest;
  sessionOpened: (session: SessionHandle) => void;
  openingFailed: () => void;
};

type WalletKind = SessionHandle['walletKind'];

const screenName = ScreenEnum.Boot;

const t = (key: string): string => read().translate(key) as string;

const isError = (value: string | null | undefined): boolean =>
  !value || value.toLowerCase().startsWith(GlobalConst.error);

const alert = (title: string, error: string): void => {
  createAlert(
    setBackgroundError,
    addLastSnackbar,
    [screenName],
    title,
    error,
    false,
  );
};

const snack = (message: string, duration?: SnackbarDurationEnum): void =>
  addLastSnackbar({ message, duration, screenName: [screenName] });

const fetchZingolibVersion = async (): Promise<void> => {
  try {
    let zingolibVersion: string = await WalletService.getVersionInfo();
    if (zingolibVersion) {
      if (zingolibVersion.toLowerCase().startsWith(GlobalConst.error)) {
        zingolibVersion = GlobalConst.zingolibError;
      }
    } else {
      zingolibVersion = GlobalConst.zingolibNone;
    }
    patch({ zingolibVersion });
  } catch (error) {
    console.log(`Critical Error info ${error}`);
  }
};

const ensureTorClient = async (): Promise<void> => {
  const { currency } = read();
  if (
    currency === CurrencyEnum.USDTORCurrency ||
    currency === CurrencyEnum.USDCurrency
  ) {
    await WalletService.createTorClientProcess();
  }
};

const checkServer = async (server: ServerType): Promise<boolean> =>
  (await probeIndexer(server.uri)) !== null;

export const runOpening = (input: OpeningInput): void => {
  const { boot, request, sessionOpened, openingFailed } = input;
  let indexerNetwork: IndexerNetworkEnum = boot.indexerNetwork;
  let indexerServerPinned = boot.indexerServerPinned;
  let serverErrorTries = 0;
  let hasRecoveryWalletInfoSaved = false;

  const syncRecoveryWalletInfo = async (readOnly: boolean) => {
    if (read().recoveryWalletInfoOnDevice) {
      const wallet: WalletType = await WalletService.rpcFetchWallet(readOnly);
      await createUpdateRecoveryWalletInfo(wallet);
    } else if (hasRecoveryWalletInfoSaved) {
      await removeRecoveryWalletInfo();
    }
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
      snack(walletKindStr);
    }
    patch({ ...kind });
    return kind;
  };

  const selectTheBestServer = async (
    aDifferentOne: boolean,
  ): Promise<boolean> => {
    const actualServer = read().indexerServer;
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
    indexerServerPinned = false;
    patch({
      indexerServer: fasterServer,
      selectIndexerServer: SelectServerEnum.custom,
    });
    await writeSettings('indexerServer', fasterServer);
    await writeSettings('selectIndexerServer', SelectServerEnum.custom);
    await writeSettings('indexerServerPinned', false);
    if (isEqual(actualServer, fasterServer)) {
      snack(t('loadedapp.selectingserversame'), SnackbarDurationEnum.long);
    } else {
      snack(
        `${t('loadedapp.selectingserverbest')} ${fasterServer.uri}`,
        SnackbarDurationEnum.long,
      );
    }
    return true;
  };

  const fail = (title: string, result: string) => {
    alert(title, result);
    serverErrorTries = 0;
    openingFailed();
  };

  const walletErrorHandle = async (
    result: string,
    title: string,
    start: boolean,
  ) => {
    const { netInfo, selectIndexerServer, indexerServer } = read();
    const offline =
      !netInfo.isConnected || selectIndexerServer === SelectServerEnum.offline;
    if (start && !offline) {
      snack(t('restarting'), SnackbarDurationEnum.long);
    }
    if (offline) {
      fail(title, result);
      return;
    }
    if (await checkServer(indexerServer)) {
      reportFailure(title, result);
      fail(title, result);
      return;
    }
    if (serverErrorTries === 0) {
      snack(t('loadingapp.serverfirsttry'), SnackbarDurationEnum.longer);
      const someServerIsWorking = await selectTheBestServer(true);
      if (!someServerIsWorking) {
        fail(title, t('loadingapp.noservers'));
        return;
      }
      if (start) {
        serverErrorTries = 1;
        run();
        return;
      }
      fail(title, result);
      return;
    }
    snack(t('loadingapp.serversecondtry'), SnackbarDurationEnum.longer);
    setTimeout(() => fail(title, result), 1000);
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

    const { netInfo, selectIndexerServer, indexerServer } = read();
    if (
      netInfo.isConnected &&
      selectIndexerServer !== SelectServerEnum.offline &&
      indexerServer.uri
    ) {
      const probed = await probeIndexer(
        indexerServer.uri,
        indexerNetwork,
      ).catch(() => null);
      if (!probed) {
        const { indexers } = await discoverIndexers(indexerNetwork);
        const best = indexers[0];
        if (best && best.uri !== indexerServer.uri) {
          const server: ServerType = {
            uri: best.uri,
            chainName: ChainNameEnum.testChainName,
          };
          indexerServerPinned = false;
          patch({ indexerServer: server });
          await writeSettings('indexerServer', server);
          await writeSettings('indexerServerPinned', false);
        }
      }
    }
    const quarantined = await quarantineLegacyWalletIfNeeded(
      read().indexerServer.uri,
      read().indexerServer.chainName,
    );
    if (quarantined) {
      await finishToSetup();
      return;
    }

    const server = read().indexerServer;
    const result: string = await WalletService.loadExistingWallet(
      server.uri,
      server.chainName,
      read().performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );
    const title = t('loadingapp.readingwallet-label');
    if (isError(result)) {
      if (await quarantineUnreadableWallet(server.chainName)) {
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

    if (!indexerServerPinned && read().netInfo.isConnected) {
      selectBestIndexer(indexerNetwork)
        .then(async best => {
          const current = read().indexerServer;
          if (best && best !== current.uri) {
            const winner: ServerType = {
              uri: best,
              chainName: current.chainName,
            };
            patch({ indexerServer: winner });
            await writeSettings('indexerServer', winner);
          }
        })
        .catch(() => {});
    }

    const walletKind = await readWalletKind();
    await ensureTorClient();
    sessionOpened({ walletKind, launching: boot.launching });
  };

  const createFlow = async (): Promise<void> => {
    const server = read().indexerServer;
    const seed: string = await WalletService.createNewWallet(
      server.uri,
      server.chainName,
      read().performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );
    const title = t('loadingapp.creatingwallet-label');
    if (isError(seed)) {
      await walletErrorHandle(seed, title, false);
      return;
    }
    let seedJSON = {} as SeedType;
    try {
      seedJSON = await JSON.parse(seed);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      reportFailure(title, message);
      await walletErrorHandle(message, title, false);
      return;
    }
    if (seedJSON.error) {
      reportFailure(title, seedJSON.error);
      await walletErrorHandle(seedJSON.error, title, false);
      return;
    }
    const wallet: WalletType = {
      seed: seedJSON.seed_phrase || '',
      birthday: seedJSON.birthday || 0,
    };
    if (read().recoveryWalletInfoOnDevice) {
      await createUpdateRecoveryWalletInfo(wallet);
    } else if (hasRecoveryWalletInfoSaved) {
      await removeRecoveryWalletInfo();
    }
    patch({ wallet });
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
  };

  const restoreFlow = async (seed: string, birthday: number) => {
    if (!seed) {
      alert(
        t('loadingapp.emptyseedufvk-label'),
        t('loadingapp.emptyseedufvk-error'),
      );
      openingFailed();
      return;
    }
    if (
      seed.toLowerCase().startsWith(GlobalConst.uview) ||
      seed.toLowerCase().startsWith(GlobalConst.utestview)
    ) {
      alert(
        t('loadingapp.invalidseedufvk-label'),
        t('loadingapp.invalidseedufvk-error'),
      );
      openingFailed();
      return;
    }

    const parsedBirthday = parseInt(birthday.toString(), 10);
    const walletBirthday =
      isNaN(parsedBirthday) || parsedBirthday < 0
        ? '0'
        : String(parsedBirthday);

    const server = read().indexerServer;
    const result: string = await WalletService.restoreWalletFromSeed(
      seed.toLowerCase(),
      walletBirthday,
      server.uri,
      server.chainName,
      read().performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );
    const title = t('loadingapp.readingwallet-label');
    if (isError(result)) {
      await walletErrorHandle(result, title, false);
      return;
    }
    let resultJson: SeedType & UfvkType;
    try {
      resultJson = await JSON.parse(result);
    } catch (e: unknown) {
      await walletErrorHandle(
        e instanceof Error ? e.message : String(e),
        title,
        false,
      );
      return;
    }
    if (resultJson.error) {
      await walletErrorHandle(resultJson.error, title, false);
      return;
    }

    if (read().recoveryWalletInfoOnDevice) {
      await createUpdateRecoveryWalletInfo({
        seed: seed.toLowerCase(),
        birthday: Number(walletBirthday),
      });
    } else if (hasRecoveryWalletInfoSaved) {
      await removeRecoveryWalletInfo();
    }
    await writeSettings('basicFirstViewSeed', true);

    const walletKind = await readWalletKind();
    await ensureTorClient();
    await resetScheduledActions();
    await notifee.cancelAllNotifications();

    sessionOpened({ walletKind, launching: boot.launching });
  };

  const run = async () => {
    await fetchNetInfo();
    fetchZingolibVersion();
    await WalletService.setCryptoDefaultProvider();
    hasRecoveryWalletInfoSaved = await hasRecoveryWalletInfo();

    if (!read().indexerServer.uri) {
      const { indexers } = await discoverIndexers(indexerNetwork);
      const best = indexers[0];
      if (best) {
        const server: ServerType = {
          uri: best.uri,
          chainName: ChainNameEnum.testChainName,
        };
        patch({ indexerServer: server });
        await writeSettings('indexerServer', server);
      } else {
        snack(t('loadingapp.noservers'));
      }
    }

    await markBackground(false);

    switch (request.kind) {
      case 'create':
        await createFlow();
        return;
      case 'restore':
        await restoreFlow(request.seed, request.birthday);
        return;
      case 'open':
        await openFlow();
        return;
    }
  };

  run();
};
