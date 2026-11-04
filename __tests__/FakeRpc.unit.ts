/**
 * @format
 */

import 'react-native';

import { AddressKindEnum, GlobalConst } from '../app/AppState';
import RPCModule from '../app/RPCModule';
import fakeRpc from '../app/RPCModule/fakeRpc';
import { ParseAddressStatusEnum } from '../app/wallet/enums';
import { WalletValueTransferKindEnum } from '../app/wallet/enums';
import { WalletKindEnum } from '../app/wallet/enums';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockIndexerServer } from '../__mocks__/dataMocks/mockServers';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockWallet } from '../__mocks__/dataMocks/mockWallet';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';

const ZATS = 10 ** 8;
const SERVER = mockIndexerServer.uri;
const CHAIN = mockInfo.chainName;
const TXID = /^[0-9a-f]{64}$/;
const zats = (amount: number) => Math.round(amount * ZATS);

const bondCount = async () =>
  JSON.parse(await fakeRpc.getWalletBondsInfo()).bonds.length as number;

describe('FakeRpc - bridge selection', () => {
  test('keeps the native bridge when the flag is off', () => {
    const { NativeModules } = jest.requireActual('react-native');
    expect(RPCModule).toBe(NativeModules.RPCModule);
  });
});

describe('FakeRpc - wallet lifecycle', () => {
  test('boots without a wallet and refuses to load one', async () => {
    await expect(fakeRpc.walletExists()).resolves.toBe(GlobalConst.false);
    await expect(
      fakeRpc.loadExistingWallet(SERVER, CHAIN, 'Medium', '1'),
    ).resolves.toMatch(/^error/i);
    expect(await fakeRpc.walletBackupExists()).toBe(GlobalConst.false);
  });

  test('createNewWallet seeds an in-memory wallet', async () => {
    const created = JSON.parse(
      await fakeRpc.createNewWallet(SERVER, CHAIN, 'Medium', '1'),
    );
    expect(created.seed_phrase).toBe(mockWallet.seed);
    expect(created.birthday).toBe(mockWallet.birthday);
    await expect(
      fakeRpc.createNewWallet(SERVER, CHAIN, 'Medium', '1'),
    ).resolves.toMatch(/^error/i);
    expect(await fakeRpc.walletExists()).toBe(GlobalConst.true);
    const kind = JSON.parse(await fakeRpc.walletKindInfo());
    expect(kind.kind).toBe(WalletKindEnum.LoadedFromSeedPhrase);
    expect(kind.orchard).toBe(true);
    expect(kind.sapling).toBe(true);
    expect(kind.transparent).toBe(true);
    const loaded = JSON.parse(
      await fakeRpc.loadExistingWallet(SERVER, CHAIN, 'Medium', '1'),
    );
    expect(loaded.error).toBeUndefined();
    expect(loaded.seed_phrase).toBe(mockWallet.seed);
    const seed = JSON.parse(await fakeRpc.getSeedInfo());
    expect(seed.seed_phrase).toBe(mockWallet.seed);
  });
});

describe('FakeRpc - balances', () => {
  test('balances mirror mockTotalBalance in zats', async () => {
    const balances = JSON.parse(await fakeRpc.getBalanceInfo());
    expect(balances.total_orchard_balance).toBe(
      zats(mockTotalBalance.totalOrchardBalance),
    );
    expect(balances.total_sapling_balance).toBe(
      zats(mockTotalBalance.totalSaplingBalance),
    );
    expect(balances.total_transparent_balance).toBe(
      zats(mockTotalBalance.totalTransparentBalance),
    );
    expect(balances.staked_amount).toBe(zats(mockTotalBalance.stakedAmount));
    const spendable = JSON.parse(await fakeRpc.getSpendableBalanceTotalInfo());
    expect(spendable.spendable_balance).toBe(
      zats(mockTotalBalance.totalSpendableBalance),
    );
  });
});

describe('FakeRpc - value transfers', () => {
  test('value transfers and messages reuse the mocked events', async () => {
    const list = JSON.parse(await fakeRpc.getValueTransfersList());
    const expected = mockValueTransfers.length + (await bondCount());
    expect(list.wallet_events).toHaveLength(expected);
    expect(list.total).toBe(expected);
    const sent = list.wallet_events.find(
      (e: { kind: string }) => e.kind === WalletValueTransferKindEnum.sent,
    );
    expect(sent.value).toBe(zats(mockValueTransfers[0].amount ?? 0));
    expect(sent.transaction_fee).toBe(zats(mockValueTransfers[0].fee ?? 0));
    expect(sent.recipient_address).toBe(mockValueTransfers[0].address);
    const messages = JSON.parse(await fakeRpc.getMessagesInfo(''));
    expect(messages.wallet_events.length).toBeGreaterThan(0);
    messages.wallet_events.forEach((m: { memos?: string[] }) =>
      expect(m.memos && m.memos.join('').length).toBeGreaterThan(0),
    );
  });

  test('send propose and confirm append a sent event', async () => {
    const propose = JSON.parse(
      await fakeRpc.sendProcess(
        JSON.stringify([{ address: mockAddresses[0].address, amount: ZATS }]),
      ),
    );
    expect(propose.error).toBeUndefined();
    expect(propose.fee).toBeGreaterThan(0);
    const confirmed = JSON.parse(await fakeRpc.confirmProcess());
    expect(confirmed.error).toBeUndefined();
    expect(confirmed.txids).toHaveLength(1);
    expect(confirmed.txids[0]).toMatch(TXID);
    const list = JSON.parse(await fakeRpc.getValueTransfersList());
    const before = mockValueTransfers.length + (await bondCount());
    expect(list.wallet_events).toHaveLength(before + 1);
    const last = list.wallet_events[before];
    expect(last.kind).toBe(WalletValueTransferKindEnum.sent);
    expect(last.value).toBe(ZATS);
    await expect(fakeRpc.confirmProcess()).resolves.toMatch(/^error/i);
  });

  test('staking proposes share the confirm path', async () => {
    const stake = JSON.parse(
      await fakeRpc.stakeProcess(
        JSON.stringify({
          amount_zats: 50000000,
          finalizer_address: mockAddresses[3].address,
        }),
      ),
    );
    expect(stake.error).toBeUndefined();
    const bond = JSON.parse(await fakeRpc.confirmProcess());
    expect(bond.txids).toHaveLength(1);
    const list = JSON.parse(await fakeRpc.getValueTransfersList());
    const last = list.wallet_events[list.wallet_events.length - 1];
    expect(last.kind).toBe(WalletValueTransferKindEnum.createBond);

    const withdraw = JSON.parse(
      await fakeRpc.withdrawStakeProcess(bond.txids[0]),
    );
    expect(withdraw.txid).toMatch(TXID);

    const begin = JSON.parse(await fakeRpc.beginUnstakeProcess(bond.txids[0]));
    expect(begin.error).toBeUndefined();
    const unbond = JSON.parse(await fakeRpc.confirmProcess());
    expect(unbond.txids).toHaveLength(1);

    const retarget = JSON.parse(
      await fakeRpc.retargetBondProcess(bond.txids[0], 'finalizer'),
    );
    expect(retarget.error).toBeUndefined();

    await expect(fakeRpc.beginUnstakeProcess('nothex')).resolves.toMatch(
      /^error/i,
    );
    await expect(fakeRpc.withdrawStakeProcess('nothex')).resolves.toMatch(
      /^error/i,
    );
    await expect(fakeRpc.retargetBondProcess('nothex', 'f')).resolves.toMatch(
      /^error/i,
    );
  });
});

describe('FakeRpc - sync', () => {
  test('poll nudges the app until sync runs, then completes', async () => {
    await expect(fakeRpc.pollSyncInfo()).resolves.toMatch(
      /^sync task has not been launched/,
    );
    await expect(fakeRpc.runSyncProcess()).resolves.not.toMatch(/^error/i);
    const poll = JSON.parse(await fakeRpc.pollSyncInfo());
    expect(poll.sync_complete.sync_end_height).toBe(mockInfo.latestBlock);
    const status = JSON.parse(await fakeRpc.statusSyncInfo());
    expect(status.percentage_total_blocks_scanned).toBe(100);
    await expect(fakeRpc.pauseSyncProcess()).resolves.not.toMatch(/^error/i);
    await expect(fakeRpc.runRescanProcess()).resolves.not.toMatch(/^error/i);
  });
});

describe('FakeRpc - addresses, roster and bonds', () => {
  test('addresses mirror the mocked unified and transparent lists', async () => {
    const unified = JSON.parse(await fakeRpc.getUnifiedAddressesInfo());
    const mockedUnified = mockAddresses.filter(
      a => a.addressKind === AddressKindEnum.u,
    );
    expect(unified).toHaveLength(mockedUnified.length);
    expect(unified[0].encoded_address).toBe(mockedUnified[0].address);
    expect(unified[0].has_orchard).toBe(mockedUnified[0].has_orchard);
    const transparent = JSON.parse(await fakeRpc.getTransparentAddressesInfo());
    const mockedTransparent = mockAddresses.filter(
      a => a.addressKind === AddressKindEnum.t,
    );
    expect(transparent).toHaveLength(mockedTransparent.length);
    expect(transparent[0].encoded_address).toBe(mockedTransparent[0].address);
  });

  test('roster and wallet bonds answer staking screens', async () => {
    const roster = JSON.parse(await fakeRpc.getRosterInfo());
    expect(roster.roster_members.length).toBeGreaterThan(0);
    expect(roster.roster_members[0].voting_power).toBeGreaterThan(0);
    const bonds = JSON.parse(await fakeRpc.getWalletBondsInfo());
    expect(bonds.bonds.length).toBeGreaterThan(1);
    const staked = bonds.bonds.reduce(
      (sum: number, b: { amount_zats: number }) => sum + b.amount_zats,
      0,
    );
    expect(staked).toBe(zats(mockTotalBalance.stakedAmount));
    const finalizers = new Set(
      bonds.bonds.map((b: { finalizer: string }) => b.finalizer),
    );
    expect(finalizers.size).toBeGreaterThan(1);
    expect(roster.roster_members.length).toBeGreaterThan(finalizers.size);
    const list = JSON.parse(await fakeRpc.getValueTransfersList());
    bonds.bonds.forEach((b: { created_in_txid: string }) => {
      const event = list.wallet_events.find(
        (e: { txid: string }) => e.txid === b.created_in_txid,
      );
      expect(event.kind).toBe(WalletValueTransferKindEnum.createBond);
      expect(event.blockheight).toBeLessThan(mockInfo.latestBlock);
    });
  });
});

describe('FakeRpc - chain info', () => {
  test('info, heights, version, price and address parsing', async () => {
    const info = JSON.parse(await fakeRpc.infoServerInfo());
    expect(info.chain_name).toBe(CHAIN);
    expect(info.latest_block_height).toBe(mockInfo.latestBlock);
    expect(info.server_uri).toBe(SERVER);
    expect(await fakeRpc.getLatestBlockServerInfo(SERVER)).toBe(
      String(mockInfo.latestBlock),
    );
    const height = JSON.parse(await fakeRpc.getLatestBlockWalletInfo());
    expect(height.height).toBe(mockInfo.latestBlock);
    expect(await fakeRpc.getVersionInfo()).toBeTruthy();
    const price = JSON.parse(await fakeRpc.zecPriceInfo('false'));
    expect(price.current_price).toBe(mockZecPrice.zecPrice);
    const parsed = JSON.parse(
      await fakeRpc.parseAddressInfo(mockAddresses[0].address),
    );
    expect(parsed.status).toBe(ParseAddressStatusEnum.successAddressParse);
    expect(parsed.chain_name).toBe(CHAIN);
    await expect(fakeRpc.parseAddressInfo('')).resolves.toMatch(/^error/i);
  });

  test('indexers answer discovery, probe and best selection', async () => {
    const discovered = JSON.parse(await fakeRpc.discoverIndexers('stable'));
    expect(discovered.errors).toEqual([]);
    expect(discovered.indexers[0].uri).toBe(SERVER);
    const probed = JSON.parse(
      await fakeRpc.probeIndexer('http://fake:18234', 'stable'),
    );
    expect(probed.indexers[0].uri).toBe('http://fake:18234');
    expect(await fakeRpc.selectBestIndexer('stable')).toBe(SERVER);
  });

  test('donations, faucet, tor, config and inspection', async () => {
    expect(await fakeRpc.getDonationAddress()).toBeTruthy();
    expect(await fakeRpc.getZenniesDonationAddress()).toBeTruthy();
    expect(await fakeRpc.requestFaucetFundsProcess('t1fake')).not.toBe(
      GlobalConst.false,
    );
    expect(await fakeRpc.requestFaucetFundsProcess('')).toMatch(/^error/i);
    expect(await fakeRpc.setCryptoDefaultProvider()).not.toMatch(/^error/i);
    expect(await fakeRpc.createTorClientProcess()).not.toMatch(/^error/i);
    expect(await fakeRpc.removeTorClientProcess()).not.toMatch(/^error/i);
    expect(await fakeRpc.changeServerProcess(SERVER)).not.toMatch(/^error/i);
    await expect(
      fakeRpc.setConfigWalletToProdProcess('High', '1'),
    ).resolves.not.toMatch(/^error/i);
    const performance = JSON.parse(
      await fakeRpc.getConfigWalletPerformanceInfo(),
    );
    expect(performance.performance_level).toBe('High');
    const version = JSON.parse(await fakeRpc.getWalletVersionInfo());
    expect(version.read_version).toBeGreaterThan(0);
    const saveRequired = JSON.parse(await fakeRpc.getWalletSaveRequiredInfo());
    expect(saveRequired.save_required).toBe(false);
    const inspected = JSON.parse(
      await fakeRpc.inspectWallet('data', SERVER, 'ios'),
    );
    expect(inspected.readable).toBe(true);
    expect(inspected.chain_match).toBe(true);
    expect(await fakeRpc.doSave()).not.toMatch(/^error/i);
  });
});

describe('FakeRpc - backup and deletion', () => {
  test('backup survives delete and restores the wallet', async () => {
    await expect(fakeRpc.doSaveBackup()).resolves.not.toMatch(/^error/i);
    expect(await fakeRpc.walletBackupExists()).toBe(GlobalConst.true);
    expect(await fakeRpc.deleteExistingWallet()).toBe(GlobalConst.true);
    expect(await fakeRpc.walletExists()).toBe(GlobalConst.false);
    await expect(fakeRpc.deleteExistingWallet()).resolves.toBe(
      GlobalConst.false,
    );
    expect(await fakeRpc.restoreExistingWalletBackup()).toBe(GlobalConst.true);
    expect(await fakeRpc.walletExists()).toBe(GlobalConst.true);
  });

  test('restoreWalletFromSeed accepts seeds and viewing keys', async () => {
    await expect(fakeRpc.deleteExistingWallet()).resolves.toBe(
      GlobalConst.true,
    );
    const seeded = JSON.parse(
      await fakeRpc.restoreWalletFromSeed(
        mockWallet.seed ?? '',
        String(mockWallet.birthday),
        SERVER,
        CHAIN,
        'Medium',
        '1',
      ),
    );
    expect(seeded.seed_phrase).toBe(mockWallet.seed);
    expect(seeded.birthday).toBe(mockWallet.birthday);
    await expect(fakeRpc.deleteExistingWallet()).resolves.toBe(
      GlobalConst.true,
    );
    const viewed = JSON.parse(
      await fakeRpc.restoreWalletFromSeed(
        mockWallet.ufvk ?? '',
        '0',
        SERVER,
        CHAIN,
        'Medium',
        '1',
      ),
    );
    expect(viewed.ufvk).toBe(mockWallet.ufvk);
    const kind = JSON.parse(await fakeRpc.walletKindInfo());
    expect(kind.kind).toBe(WalletKindEnum.LoadedFromUnifiedFullViewingKey);
    const ufvk = JSON.parse(await fakeRpc.getUfvkInfo());
    expect(ufvk.ufvk).toBe(mockWallet.ufvk);
    await expect(fakeRpc.getSeedInfo()).resolves.toMatch(/^error/i);
    await expect(fakeRpc.deleteExistingWallet()).resolves.toBe(
      GlobalConst.true,
    );
    await expect(fakeRpc.walletExists()).resolves.toBe(GlobalConst.false);
  });
});
