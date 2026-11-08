import 'react-native';

import { quarantineLegacyWalletIfNeeded, quarantineUnreadableWallet } from '../app/legacyWallet';
import RPCModule from '../app/RPCModule';

const inspect = (response: string) =>
  (RPCModule.inspectWallet as jest.Mock).mockResolvedValue(response);

const READABLE_MATCH = JSON.stringify({
  readable: true,
  format_version: 40,
  newest_height: 83544,
  chain_match: true,
});
const READABLE_MISMATCH = JSON.stringify({
  readable: true,
  format_version: 40,
  newest_height: 4534722,
  chain_match: false,
});
const UNREADABLE = JSON.stringify({
  readable: false,
  format_version: 24,
  chain_match: null,
  reason: 'old format',
});
const UNVERIFIED = JSON.stringify({
  readable: true,
  format_version: 40,
  newest_height: 82900,
  chain_match: null,
});

describe('Legacy wallet quarantine - test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (RPCModule.walletExists as jest.Mock).mockResolvedValue('true');
    (RPCModule.quarantineWallet as jest.Mock).mockResolvedValue('true');
  });

  test('quarantines a wallet from another chain immediately', async () => {
    inspect(READABLE_MISMATCH);
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'test'),
    ).toBe(true);
    expect(RPCModule.inspectWallet).toHaveBeenCalledWith(
      'http://indexer:18234',
      'test',
    );
    expect(RPCModule.quarantineWallet).toHaveBeenCalledTimes(1);
  });

  test('quarantines an unreadable wallet file immediately', async () => {
    inspect(UNREADABLE);
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'test'),
    ).toBe(true);
    expect(RPCModule.quarantineWallet).toHaveBeenCalledTimes(1);
  });

  test('keeps a wallet that reads and matches the served chain', async () => {
    inspect(READABLE_MATCH);
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'test'),
    ).toBe(false);
    expect(RPCModule.quarantineWallet).not.toHaveBeenCalled();
  });

  test('keeps the wallet when the chain check cannot answer', async () => {
    inspect(UNVERIFIED);
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'test'),
    ).toBe(false);
    expect(RPCModule.quarantineWallet).not.toHaveBeenCalled();
  });

  test('does nothing without a wallet file', async () => {
    (RPCModule.walletExists as jest.Mock).mockResolvedValue('false');
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'test'),
    ).toBe(false);
    expect(RPCModule.inspectWallet).not.toHaveBeenCalled();
    expect(RPCModule.quarantineWallet).not.toHaveBeenCalled();
  });

  test('a boolean answer from the exists check counts too', async () => {
    (RPCModule.walletExists as jest.Mock).mockResolvedValue(false);
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'test'),
    ).toBe(false);
    expect(RPCModule.inspectWallet).not.toHaveBeenCalled();
  });

  test('does nothing when the inspection fails', async () => {
    (RPCModule.inspectWallet as jest.Mock).mockRejectedValue(
      new Error('native boom'),
    );
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'test'),
    ).toBe(false);
    expect(RPCModule.quarantineWallet).not.toHaveBeenCalled();
  });

  test('answers false when the native quarantine fails', async () => {
    inspect(READABLE_MISMATCH);
    (RPCModule.quarantineWallet as jest.Mock).mockResolvedValue('false');
    expect(
      await quarantineLegacyWalletIfNeeded('http://indexer:18234', 'test'),
    ).toBe(false);
  });

  test('the unreadable check asks no server', async () => {
    inspect(UNREADABLE);
    expect(await quarantineUnreadableWallet('test')).toBe(true);
    expect(RPCModule.inspectWallet).toHaveBeenCalledWith('', 'test');
    expect(RPCModule.quarantineWallet).toHaveBeenCalledTimes(1);
  });

  test('the unreadable check keeps a readable wallet, even unverified', async () => {
    inspect(UNVERIFIED);
    expect(await quarantineUnreadableWallet('test')).toBe(false);
    expect(RPCModule.quarantineWallet).not.toHaveBeenCalled();
  });
});
