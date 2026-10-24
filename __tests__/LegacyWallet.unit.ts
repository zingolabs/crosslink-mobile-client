import 'react-native';

import { quarantineLegacyWallet } from '../app/legacyWallet';
import RPCModule from '../app/RPCModule';

const path = '/docs/wallet.dat';
const legacyPath = '/docs/wallet.legacy.dat';

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/docs',
  exists: jest.fn(),
  readFile: jest.fn(),
  moveFile: jest.fn(),
}));

import * as RNFS from 'react-native-fs';

const mocked = RNFS as unknown as {
  exists: jest.Mock;
  readFile: jest.Mock;
  moveFile: jest.Mock;
};

describe('Legacy wallet quarantine - test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.exists.mockResolvedValue(true);
    mocked.readFile.mockResolvedValue('d2FsbGV0');
    mocked.moveFile.mockResolvedValue(undefined);
  });

  test('quarantines an unreadable wallet file', async () => {
    (RPCModule.inspectWallet as jest.Mock).mockResolvedValue(
      '{"readable":false,"format_version":24,"chain_match":null,"reason":"old format"}',
    );
    expect(await quarantineLegacyWallet('http://indexer:18234')).toBe(true);
    expect(RPCModule.inspectWallet).toHaveBeenCalledWith(
      'd2FsbGV0',
      'http://indexer:18234',
    );
    expect(mocked.moveFile).toHaveBeenCalledWith(path, legacyPath);
  });

  test('quarantines a wallet whose blocks are not on the served chain', async () => {
    (RPCModule.inspectWallet as jest.Mock).mockResolvedValue(
      '{"readable":true,"format_version":32,"newest_height":50000,"chain_match":false}',
    );
    expect(await quarantineLegacyWallet('http://indexer:18234')).toBe(true);
    expect(mocked.moveFile).toHaveBeenCalled();
  });

  test('keeps a wallet that reads and matches the served chain', async () => {
    (RPCModule.inspectWallet as jest.Mock).mockResolvedValue(
      '{"readable":true,"format_version":32,"newest_height":82900,"chain_match":true}',
    );
    expect(await quarantineLegacyWallet('http://indexer:18234')).toBe(false);
    expect(mocked.moveFile).not.toHaveBeenCalled();
  });

  test('keeps the wallet when the chain check cannot answer', async () => {
    (RPCModule.inspectWallet as jest.Mock).mockResolvedValue(
      '{"readable":true,"format_version":32,"newest_height":82900,"chain_match":null}',
    );
    expect(await quarantineLegacyWallet('')).toBe(false);
    expect(mocked.moveFile).not.toHaveBeenCalled();
  });

  test('does nothing without a wallet file', async () => {
    mocked.exists.mockResolvedValue(false);
    expect(await quarantineLegacyWallet('http://indexer:18234')).toBe(false);
    expect(RPCModule.inspectWallet).not.toHaveBeenCalled();
  });

  test('does nothing when the inspection fails', async () => {
    (RPCModule.inspectWallet as jest.Mock).mockRejectedValue(
      new Error('native boom'),
    );
    expect(await quarantineLegacyWallet('http://indexer:18234')).toBe(false);
    expect(mocked.moveFile).not.toHaveBeenCalled();
  });
});
