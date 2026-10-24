import 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { quarantineLegacyWalletIfNeeded } from '../app/legacyWallet';
import RPCModule from '../app/RPCModule';

const path = '/docs/wallet.dat';
const legacyPath = '/docs/wallet.legacy.dat';
const storageState: Record<string, string> = {};

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/docs',
  exists: jest.fn(),
  readFile: jest.fn(),
  moveFile: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => storageState[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      storageState[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete storageState[key];
    }),
  },
}));

import * as RNFS from 'react-native-fs';

const mocked = RNFS as unknown as {
  exists: jest.Mock;
  readFile: jest.Mock;
  moveFile: jest.Mock;
};

const mockedStorage = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

const inspect = (response: string) =>
  (RPCModule.inspectWallet as jest.Mock).mockResolvedValue(response);

const READABLE_MATCH = JSON.stringify({
  readable: true,
  format_version: 32,
  newest_height: 82900,
  chain_match: true,
});
const READABLE_MISMATCH = JSON.stringify({
  readable: true,
  format_version: 32,
  newest_height: 50000,
  chain_match: false,
});
const UNREADABLE = JSON.stringify({
  readable: false,
  format_version: 24,
  chain_match: null,
  reason: 'old format',
});

describe('Legacy wallet quarantine - test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(storageState).forEach(key => delete storageState[key]);
    mocked.exists.mockResolvedValue(true);
    mocked.readFile.mockResolvedValue('d2FsbGV0');
    mocked.moveFile.mockResolvedValue(undefined);
  });

  test('quarantines an unreadable wallet file immediately', async () => {
    inspect(UNREADABLE);
    expect(await quarantineLegacyWalletIfNeeded('http://indexer:18234')).toBe(
      true,
    );
    expect(RPCModule.inspectWallet).toHaveBeenCalledWith(
      'd2FsbGV0',
      'http://indexer:18234',
    );
    expect(mocked.moveFile).toHaveBeenCalledWith(path, legacyPath);
    expect(mockedStorage.removeItem).toHaveBeenCalledWith(
      'legacyChainMismatch',
    );
  });

  test('quarantines a chain mismatch on the second consecutive boot', async () => {
    inspect(READABLE_MISMATCH);
    expect(await quarantineLegacyWalletIfNeeded('http://indexer:18234')).toBe(
      false,
    );
    expect(mocked.moveFile).not.toHaveBeenCalled();
    expect(mockedStorage.setItem).toHaveBeenCalledWith(
      'legacyChainMismatch',
      'true',
    );
    expect(await quarantineLegacyWalletIfNeeded('http://indexer:18234')).toBe(
      true,
    );
    expect(mocked.moveFile).toHaveBeenCalledWith(path, legacyPath);
  });

  test('a good boot clears the mismatch strike', async () => {
    inspect(READABLE_MISMATCH);
    await quarantineLegacyWalletIfNeeded('http://indexer:18234');
    inspect(READABLE_MATCH);
    await quarantineLegacyWalletIfNeeded('http://indexer:18234');
    expect(mockedStorage.removeItem).toHaveBeenCalledWith(
      'legacyChainMismatch',
    );
    inspect(READABLE_MISMATCH);
    expect(await quarantineLegacyWalletIfNeeded('http://indexer:18234')).toBe(
      false,
    );
    expect(mocked.moveFile).not.toHaveBeenCalled();
  });

  test('keeps a wallet that reads and matches the served chain', async () => {
    inspect(READABLE_MATCH);
    expect(await quarantineLegacyWalletIfNeeded('http://indexer:18234')).toBe(
      false,
    );
    expect(mocked.moveFile).not.toHaveBeenCalled();
  });

  test('keeps the wallet when the chain check cannot answer', async () => {
    inspect(
      JSON.stringify({
        readable: true,
        format_version: 32,
        newest_height: 82900,
        chain_match: null,
      }),
    );
    expect(await quarantineLegacyWalletIfNeeded('')).toBe(false);
    expect(mocked.moveFile).not.toHaveBeenCalled();
  });

  test('does nothing without a wallet file', async () => {
    mocked.exists.mockResolvedValue(false);
    expect(await quarantineLegacyWalletIfNeeded('http://indexer:18234')).toBe(
      false,
    );
    expect(RPCModule.inspectWallet).not.toHaveBeenCalled();
  });

  test('does nothing when the inspection fails', async () => {
    (RPCModule.inspectWallet as jest.Mock).mockRejectedValue(
      new Error('native boom'),
    );
    expect(await quarantineLegacyWalletIfNeeded('http://indexer:18234')).toBe(
      false,
    );
    expect(mocked.moveFile).not.toHaveBeenCalled();
  });
});
