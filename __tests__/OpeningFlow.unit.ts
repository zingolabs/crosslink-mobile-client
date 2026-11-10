import {jest} from '@jest/globals';

import {
  ChainNameEnum,
  CurrencyEnum,
  GlobalConst,
  IndexerNetworkEnum,
  LaunchingModeEnum,
  SelectServerEnum,
} from '../app/AppState';
import WalletService from '../app/wallet';
import RPCModule from '../app/RPCModule';
import {patch, read} from '../app/store/appStore';
import {setBackgroundError} from '../app/store/feedback';
import {
  BootInfo,
  OpenRequest,
  SessionHandle,
} from '../app/lifecycle/phase';
import {runOpening} from '../app/setup/openingFlow';
import {
  discoverIndexers,
  probeIndexer,
  selectBestIndexer,
} from '../app/indexers';
import {writeSettings} from '../app/storage/settingsFile';
import {createAlert} from '../app/createAlert';
import {reportFailure} from '../app/reporting';
import {
  createUpdateRecoveryWalletInfo,
  hasRecoveryWalletInfo,
  removeRecoveryWalletInfo,
} from '../app/recoveryWalletInfov10';
import notifee from '@notifee/react-native';
import {resetScheduledActions} from '../app/storage/scheduledActionsFile';

jest.mock('../app/RPCModule', () => ({
  __esModule: true,
  default: {
    walletExists: jest.fn(),
    deleteExistingWallet: jest.fn(),
  },
}));

jest.mock('../app/indexers', () => ({
  discoverIndexers: jest.fn(),
  probeIndexer: jest.fn(),
  selectBestIndexer: jest.fn(),
}));

jest.mock('../app/storage/settingsFile', () => ({
  writeSettings: jest.fn().mockResolvedValue(undefined),
  readSettings: jest.fn().mockResolvedValue({}),
}));

jest.mock('../app/storage/scheduledActionsFile', () => ({
  resetScheduledActions: jest.fn(),
}));

jest.mock('../app/recoveryWalletInfov10', () => ({
  hasRecoveryWalletInfo: jest.fn(),
  createUpdateRecoveryWalletInfo: jest.fn(),
  removeRecoveryWalletInfo: jest.fn(),
}));

jest.mock('../app/createAlert', () => ({
  createAlert: jest.fn(),
}));

jest.mock('../app/reporting', () => ({
  reportFailure: jest.fn(),
}));

jest.mock('../app/store/platform', () => ({
  fetchNetInfo: jest.fn(),
  markBackground: jest.fn(),
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    cancelAllNotifications: jest.fn(),
  },
}));

const mocked = {
  discoverIndexers: jest.mocked(discoverIndexers),
  probeIndexer: jest.mocked(probeIndexer),
  writeSettings: jest.mocked(writeSettings),
  createAlert: jest.mocked(createAlert),
  reportFailure: jest.mocked(reportFailure),
  createUpdateRecoveryWalletInfo: jest.mocked(createUpdateRecoveryWalletInfo),
  removeRecoveryWalletInfo: jest.mocked(removeRecoveryWalletInfo),
  hasRecoveryWalletInfo: jest.mocked(hasRecoveryWalletInfo),
  notifee: jest.mocked(notifee),
  resetScheduledActions: jest.mocked(resetScheduledActions),
  rpcWalletExists: jest.mocked(RPCModule.walletExists),
  rpcDeleteExistingWallet: jest.mocked(RPCModule.deleteExistingWallet),
};

const createWallet = jest.spyOn(WalletService, 'createNewWallet');
const openWallet = jest.spyOn(WalletService, 'loadExistingWallet');
const restoreWallet = jest.spyOn(WalletService, 'restoreWalletFromSeed');
const walletKindInfo = jest.spyOn(WalletService, 'walletKindInfo');
const rpcFetchWallet = jest.spyOn(WalletService, 'rpcFetchWallet');
const getVersionInfo = jest.spyOn(WalletService, 'getVersionInfo');
const setCryptoDefaultProvider = jest.spyOn(
  WalletService,
  'setCryptoDefaultProvider',
);
const createTorClientProcess = jest.spyOn(
  WalletService,
  'createTorClientProcess',
);

const SERVER_A = 'https://indexer-a.example:9067';
const SERVER_B = 'https://indexer-b.example:9067';
const CREATE_OK = JSON.stringify({seed_phrase: 'seed words', birthday: 1});
const DIAL_ERROR = 'Error: dialing failed';

const boot = {
  settings: {},
  launching: LaunchingModeEnum.opening,
  indexerNetwork: IndexerNetworkEnum.stable,
  indexerServerPinned: false,
} as unknown as BootInfo;

const sessionOpened = jest.fn<(session: SessionHandle) => void>();
const openingFailed = jest.fn<() => void>();

const drain = async (): Promise<void> => {
  for (let i = 0; i < 30; i += 1) {
    await Promise.resolve();
  }
};

const flushAsync = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0));
  await drain();
};

const seedStore = (): void => {
  patch({
    translate: (key: string) => key,
    indexerServer: {
      uri: '',
      chainName: ChainNameEnum.testChainName,
    },
    selectIndexerServer: SelectServerEnum.custom,
    netInfo: {isConnected: true, type: 'wifi', isConnectionExpensive: false},
    currency: CurrencyEnum.noCurrency,
    recoveryWalletInfoOnDevice: false,
    performanceLevel: read().performanceLevel,
    snackbars: [],
  });
  setBackgroundError('', '');
};

const lastServerUri = (): string => read().indexerServer.uri;

const run = async (request: OpenRequest): Promise<void> => {
  runOpening({boot, request, sessionOpened, openingFailed});
  await drain();
};

beforeEach(() => {
  jest.clearAllMocks();
  seedStore();
  mocked.hasRecoveryWalletInfo.mockResolvedValue(false);
  getVersionInfo.mockResolvedValue('');
  setCryptoDefaultProvider.mockResolvedValue(undefined);
  createTorClientProcess.mockResolvedValue('');
  rpcFetchWallet.mockResolvedValue({} as never);
  walletKindInfo.mockResolvedValue(
    JSON.stringify({kind: 'Created', orchard: true, sapling: true, transparent: true}),
  );
  mocked.writeSettings.mockResolvedValue(undefined);
  selectBestIndexer.mockResolvedValue(null);
});

describe('first run create', () => {
  test('discovers an indexer and creates the wallet against it', async () => {
    mocked.discoverIndexers.mockResolvedValue({indexers: [{uri: SERVER_A}]});
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.false);
    createWallet.mockResolvedValue(CREATE_OK);

    await run({kind: 'create'});

    expect(createWallet).toHaveBeenCalledTimes(1);
    expect(createWallet).toHaveBeenCalledWith(
      SERVER_A,
      ChainNameEnum.testChainName,
      read().performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );
    expect(mocked.writeSettings).toHaveBeenCalledWith('indexerServer', {
      uri: SERVER_A,
      chainName: ChainNameEnum.testChainName,
    });
    expect(sessionOpened).toHaveBeenCalledTimes(1);
    expect(mocked.rpcDeleteExistingWallet).not.toHaveBeenCalled();
  });

  test('backs out without dialing when discovery finds no indexer', async () => {
    mocked.discoverIndexers.mockResolvedValue({indexers: []});
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.false);
    createWallet.mockResolvedValue(CREATE_OK);

    await run({kind: 'create'});

    expect(createWallet).not.toHaveBeenCalled();
    expect(openWallet).not.toHaveBeenCalled();
    expect(sessionOpened).not.toHaveBeenCalled();
    expect(openingFailed).toHaveBeenCalledTimes(1);
    expect(read().snackbars.some(s => s.message === 'loadingapp.noservers')).toBe(
      true,
    );
  });

  test('retries once with the server the failure discovered', async () => {
    mocked.discoverIndexers.mockResolvedValue({
      indexers: [{uri: SERVER_A}, {uri: SERVER_B}],
    });
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.false);
    mocked.probeIndexer.mockResolvedValue(null);
    createWallet.mockImplementation(async (uri: string) =>
      uri === SERVER_A ? DIAL_ERROR : CREATE_OK,
    );

    await run({kind: 'create'});
    await flushAsync();

    expect(createWallet).toHaveBeenNthCalledWith(
      1,
      SERVER_A,
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(createWallet).toHaveBeenNthCalledWith(
      2,
      SERVER_B,
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(sessionOpened).toHaveBeenCalledTimes(1);
    expect(lastServerUri()).toBe(SERVER_B);
  });

  test('stops after one retry when every attempt fails', async () => {
    jest.useFakeTimers();
    mocked.discoverIndexers.mockResolvedValue({
      indexers: [{uri: SERVER_A}, {uri: SERVER_B}],
    });
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.false);
    mocked.probeIndexer.mockResolvedValue(null);
    createWallet.mockResolvedValue(DIAL_ERROR);

    await run({kind: 'create'});
    jest.advanceTimersByTime(1100);
    await drain();
    jest.advanceTimersByTime(1100);
    await drain();

    expect(createWallet).toHaveBeenCalledTimes(2);
    expect(openingFailed).toHaveBeenCalledTimes(1);
    expect(
      read().snackbars.some(
        s => s.message === 'loadingapp.serversecondtry',
      ),
    ).toBe(true);
    jest.useRealTimers();
  });

  test('deletes the wallet file a failed create left behind', async () => {
    jest.useFakeTimers();
    let fileOnDisk = false;
    mocked.discoverIndexers.mockResolvedValue({
      indexers: [{uri: SERVER_A}, {uri: SERVER_B}],
    });
    mocked.rpcWalletExists.mockImplementation(async () =>
      fileOnDisk ? GlobalConst.true : GlobalConst.false,
    );
    mocked.rpcDeleteExistingWallet.mockImplementation(async () => {
      fileOnDisk = false;
      return GlobalConst.true;
    });
    mocked.probeIndexer.mockResolvedValue(null);
    createWallet.mockImplementation(async () => {
      fileOnDisk = true;
      return DIAL_ERROR;
    });

    await run({kind: 'create'});
    expect(mocked.rpcDeleteExistingWallet).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1100);
    await drain();
    jest.advanceTimersByTime(1100);
    await drain();
    expect(mocked.rpcDeleteExistingWallet).toHaveBeenCalledTimes(2);
    expect(openingFailed).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  test('keeps the wallet file when it existed before the failed create', async () => {
    jest.useFakeTimers();
    mocked.discoverIndexers.mockResolvedValue({
      indexers: [{uri: SERVER_A}, {uri: SERVER_B}],
    });
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.true);
    mocked.probeIndexer.mockResolvedValue(null);
    createWallet.mockResolvedValue(DIAL_ERROR);

    await run({kind: 'create'});
    jest.advanceTimersByTime(1100);
    await drain();
    jest.advanceTimersByTime(1100);
    await drain();

    expect(mocked.rpcDeleteExistingWallet).not.toHaveBeenCalled();
    expect(openingFailed).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

describe('open', () => {
  test('loads the existing wallet and reports its kind', async () => {
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.true);
    mocked.probeIndexer.mockResolvedValue({uri: SERVER_A});
    openWallet.mockResolvedValue(JSON.stringify({seed_phrase: 'seed words'}));

    await run({kind: 'open'});

    expect(openWallet).toHaveBeenCalledWith(
      SERVER_A,
      ChainNameEnum.testChainName,
      read().performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );
    expect(sessionOpened).toHaveBeenCalledWith({
      walletKind: {
        readOnly: false,
        orchardPool: true,
        saplingPool: true,
        transparentPool: true,
      },
      launching: boot.launching,
    });
    expect(mocked.removeRecoveryWalletInfo).not.toHaveBeenCalled();
  });

  test('returns to setup when no wallet exists', async () => {
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.false);

    await run({kind: 'open'});

    expect(openWallet).not.toHaveBeenCalled();
    expect(sessionOpened).not.toHaveBeenCalled();
    expect(openingFailed).toHaveBeenCalledTimes(1);
  });

  test('switches to a discovered indexer when the configured one is dead', async () => {
    patch({
      indexerServer: {uri: SERVER_A, chainName: ChainNameEnum.testChainName},
    });
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.true);
    mocked.probeIndexer.mockImplementation(async (uri: string) =>
      uri === SERVER_A ? null : {uri},
    );
    mocked.discoverIndexers.mockResolvedValue({indexers: [{uri: SERVER_B}]});
    openWallet.mockResolvedValue(JSON.stringify({seed_phrase: 'seed words'}));

    await run({kind: 'open'});

    expect(openWallet).toHaveBeenCalledWith(
      SERVER_B,
      ChainNameEnum.testChainName,
      expect.anything(),
      expect.anything(),
    );
    expect(sessionOpened).toHaveBeenCalledTimes(1);
  });

  test('fails without retry when the server answers but the open errors', async () => {
    patch({
      indexerServer: {uri: SERVER_A, chainName: ChainNameEnum.testChainName},
    });
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.true);
    mocked.probeIndexer.mockResolvedValue({uri: SERVER_A});
    openWallet.mockResolvedValue(DIAL_ERROR);

    await run({kind: 'open'});

    expect(openWallet).toHaveBeenCalledTimes(1);
    expect(mocked.reportFailure).toHaveBeenCalledTimes(1);
    expect(mocked.createAlert).toHaveBeenCalledTimes(1);
    expect(openingFailed).toHaveBeenCalledTimes(1);
    expect(mocked.discoverIndexers).not.toHaveBeenCalled();
  });

  test('fails without probing when the device is offline', async () => {
    patch({
      indexerServer: {uri: SERVER_A, chainName: ChainNameEnum.testChainName},
      netInfo: {isConnected: false, type: 'none', isConnectionExpensive: false},
    });
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.true);
    openWallet.mockResolvedValue(DIAL_ERROR);

    await run({kind: 'open'});

    expect(mocked.probeIndexer).not.toHaveBeenCalled();
    expect(mocked.discoverIndexers).not.toHaveBeenCalled();
    expect(openingFailed).toHaveBeenCalledTimes(1);
    expect(sessionOpened).not.toHaveBeenCalled();
  });

  test('fails immediately on a wallet file error', async () => {
    patch({
      indexerServer: {uri: SERVER_A, chainName: ChainNameEnum.testChainName},
    });
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.true);
    mocked.probeIndexer.mockResolvedValue({uri: SERVER_A});
    openWallet.mockResolvedValue(
      'Error: wallet file ends early while reading the seed',
    );

    await run({kind: 'open'});

    expect(openWallet).toHaveBeenCalledTimes(1);
    expect(mocked.reportFailure).toHaveBeenCalledTimes(1);
    expect(openingFailed).toHaveBeenCalledTimes(1);
    expect(sessionOpened).not.toHaveBeenCalled();
  });
});

describe('restore', () => {
  test('rejects an empty seed without dialing', async () => {
    mocked.discoverIndexers.mockResolvedValue({indexers: [{uri: SERVER_A}]});

    await run({kind: 'restore', seed: '', birthday: 0});

    expect(restoreWallet).not.toHaveBeenCalled();
    expect(mocked.createAlert).toHaveBeenCalledTimes(1);
    expect(openingFailed).toHaveBeenCalledTimes(1);
  });

  test('rejects a viewing key without dialing', async () => {
    await run({kind: 'restore', seed: 'uviewtest1abc', birthday: 0});

    expect(restoreWallet).not.toHaveBeenCalled();
    expect(mocked.createAlert).toHaveBeenCalledTimes(1);
    expect(openingFailed).toHaveBeenCalledTimes(1);
  });

  test('restores from a seed and opens the session', async () => {
    mocked.discoverIndexers.mockResolvedValue({indexers: [{uri: SERVER_A}]});
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.true);
    restoreWallet.mockResolvedValue(JSON.stringify({seed_phrase: 'ok'}));

    await run({kind: 'restore', seed: 'About City', birthday: 419200});

    expect(restoreWallet).toHaveBeenCalledWith(
      'about city',
      '419200',
      SERVER_A,
      ChainNameEnum.testChainName,
      expect.anything(),
      expect.anything(),
    );
    expect(mocked.writeSettings).toHaveBeenCalledWith(
      'basicFirstViewSeed',
      true,
    );
    expect(sessionOpened).toHaveBeenCalledTimes(1);
    expect(mocked.notifee.cancelAllNotifications).toHaveBeenCalled();
    expect(mocked.resetScheduledActions).toHaveBeenCalled();
  });

  test('saves recovery info when the device keeps it', async () => {
    patch({recoveryWalletInfoOnDevice: true});
    mocked.discoverIndexers.mockResolvedValue({indexers: [{uri: SERVER_A}]});
    mocked.rpcWalletExists.mockResolvedValue(GlobalConst.true);
    restoreWallet.mockResolvedValue(
      JSON.stringify({seed_phrase: 'seed words', birthday: 419200}),
    );

    await run({kind: 'restore', seed: 'seed words', birthday: 419200});

    expect(mocked.createUpdateRecoveryWalletInfo).toHaveBeenCalledWith({
      seed: 'seed words',
      birthday: 419200,
    });
    expect(sessionOpened).toHaveBeenCalledTimes(1);
  });
});
