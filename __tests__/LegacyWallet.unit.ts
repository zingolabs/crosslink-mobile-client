import 'react-native';

import { quarantineLegacyWalletIfNeeded } from '../app/legacyWallet';
import RPCModule from '../app/RPCModule';

const path = '/docs/wallet.dat';
const legacyPath = '/docs/wallet.legacy.dat';

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/docs',
  exists: jest.fn(),
  readFile: jest.fn(),
  moveFile: jest.fn(),
  writeFile: jest.fn(),
}));

import * as RNFS from 'react-native-fs';

const mocked = RNFS as unknown as {
  exists: jest.Mock;
  readFile: jest.Mock;
  moveFile: jest.Mock;
  writeFile: jest.Mock;
};

const inspect = (response: string) =>
  (RPCModule.inspectWallet as jest.Mock).mockResolvedValue(response);

const READABLE_MATCH = JSON.stringify({
  readable: true,
  format_version: 40,
  newest_height: 83544,
  chain_match: true,
  normalize_to: null,
});
const READABLE_MISMATCH = JSON.stringify({
  readable: true,
  format_version: 40,
  newest_height: 4534722,
  chain_match: false,
  normalize_to: null,
});
const READABLE_NORMALIZABLE = JSON.stringify({
  readable: true,
  format_version: 40,
  newest_height: 83544,
  chain_match: true,
  normalize_to: 'd2FsbGV0',
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
    mocked.exists.mockResolvedValue(true);
    mocked.readFile.mockResolvedValue('d2FsbGV0');
    mocked.moveFile.mockResolvedValue(undefined);
    mocked.writeFile.mockResolvedValue(undefined);
  });

  test('quarantines a wallet from another chain immediately', async () => {
    inspect(READABLE_MISMATCH);
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'android'),
    ).toBe(true);
    expect(RPCModule.inspectWallet).toHaveBeenCalledWith(
      'd2FsbGV0',
      'http://indexer:18234',
      'android',
    );
    expect(mocked.moveFile).toHaveBeenCalledWith(path, legacyPath);
  });

  test('quarantines an unreadable wallet file immediately', async () => {
    inspect(UNREADABLE);
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'android'),
    ).toBe(true);
    expect(mocked.moveFile).toHaveBeenCalledWith(path, legacyPath);
  });

  test('normalizes a wallet file stored in the other platform shape', async () => {
    inspect(READABLE_NORMALIZABLE);
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'android'),
    ).toBe(false);
    expect(RPCModule.inspectWallet).toHaveBeenCalledWith(
      'd2FsbGV0',
      'http://indexer:18234',
      'android',
    );
    expect(mocked.writeFile).toHaveBeenCalledWith(path, 'd2FsbGV0', 'base64');
    expect(mocked.moveFile).not.toHaveBeenCalled();
  });

  test('keeps a wallet that reads and matches the served chain', async () => {
    inspect(READABLE_MATCH);
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'android'),
    ).toBe(false);
    expect(mocked.moveFile).not.toHaveBeenCalled();
  });

  test('keeps the wallet when the chain check cannot answer', async () => {
    inspect(
      JSON.stringify({
        readable: true,
        format_version: 40,
        newest_height: 82900,
        chain_match: null,
        normalize_to: null,
      }),
    );
    expect(await quarantineLegacyWalletIfNeeded('', 'android')).toBe(false);
    expect(mocked.moveFile).not.toHaveBeenCalled();
  });

  test('does nothing without a wallet file', async () => {
    mocked.exists.mockResolvedValue(false);
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'android'),
    ).toBe(false);
    expect(RPCModule.inspectWallet).not.toHaveBeenCalled();
  });

  test('does nothing when the inspection fails', async () => {
    (RPCModule.inspectWallet as jest.Mock).mockRejectedValue(
      new Error('native boom'),
    );
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'android'),
    ).toBe(false);
    expect(mocked.moveFile).not.toHaveBeenCalled();
  });
});
