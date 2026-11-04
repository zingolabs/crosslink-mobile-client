import {
  AddressKindEnum,
  ChainNameEnum,
  GlobalConst,
  ValueTransferKindEnum,
} from '../AppState';
import {
  ParseAddressStatusEnum,
  PerformanceLevelEnum,
  ReceiversEnum,
  ValueTransferStatusEnum,
  WalletAddressKindEnum,
  WalletKindEnum,
  WalletValueTransferKindEnum,
} from '../wallet/enums';
import type { Balance } from '../wallet/generated/Balance';
import type { ConfigWalletPerformance } from '../wallet/generated/ConfigWalletPerformance';
import type { Confirm } from '../wallet/generated/Confirm';
import type { ParseAddress } from '../wallet/generated/ParseAddress';
import type { Propose } from '../wallet/generated/Propose';
import type { Roster } from '../wallet/generated/Roster';
import type { Seed } from '../wallet/generated/Seed';
import type { SpendableBalance } from '../wallet/generated/SpendableBalance';
import type { StakingKind } from '../wallet/generated/StakingKind';
import type { SyncPoll } from '../wallet/generated/SyncPoll';
import type { SyncStatus } from '../wallet/generated/SyncStatus';
import type { TransparentAddress } from '../wallet/generated/TransparentAddress';
import type { Ufvk } from '../wallet/generated/Ufvk';
import type { UnifiedAddress } from '../wallet/generated/UnifiedAddress';
import type { ValueTransfer } from '../wallet/generated/ValueTransfer';
import type { ValueTransferKind } from '../wallet/generated/ValueTransferKind';
import type { ValueTransfers } from '../wallet/generated/ValueTransfers';
import type { WalletBonds } from '../wallet/generated/WalletBonds';
import type { WalletHeight } from '../wallet/generated/WalletHeight';
import type { WalletInfo } from '../wallet/generated/WalletInfo';
import type { WalletKind } from '../wallet/generated/WalletKind';
import type { WalletSaveRequired } from '../wallet/generated/WalletSaveRequired';
import type { WalletVersion } from '../wallet/generated/WalletVersion';
import type { WithdrawStake } from '../wallet/generated/WithdrawStake';
import type { ZecPrice } from '../wallet/generated/ZecPrice';
import { mockAddresses } from '../../__mocks__/dataMocks/mockAddresses';
import { mockInfo } from '../../__mocks__/dataMocks/mockInfo';
import { mockIndexerServer } from '../../__mocks__/dataMocks/mockServers';
import { mockTotalBalance } from '../../__mocks__/dataMocks/mockTotalBalance';
import { mockValueTransfers } from '../../__mocks__/dataMocks/mockValueTransfers';
import { mockWallet } from '../../__mocks__/dataMocks/mockWallet';
import { mockZecPrice } from '../../__mocks__/dataMocks/mockZecPrice';
import mockSyncingStatus from '../../__mocks__/dataMocks/mockSyncingStatus';

const ZATS = 10 ** 8;
const FEE_ZATS = 10000;
const HEIGHT = mockInfo.latestBlock;
const VERSION = 'zingo-fake-1.0.0';
const FINALIZER_A = 'f'.repeat(64);
const FINALIZER_B = 'a'.repeat(64);
const FINALIZER_C = 'c'.repeat(64);
const FINALIZER_D = 'd'.repeat(64);
const BOND_TXID_A = 'b'.repeat(64);
const BOND_TXID_B = 'e'.repeat(64);
const BOND_TXID_C = '9'.repeat(64);
const BOND_HEIGHT = HEIGHT - 10;

const err = (message: string) => `${GlobalConst.error}: ${message}`;

const payload = <T>(value: T): string => JSON.stringify(value);

const zats = (amount: number) => Math.round(amount * ZATS);

const KINDS: Record<ValueTransferKindEnum, ValueTransferKind> = {
  [ValueTransferKindEnum.Sent]: WalletValueTransferKindEnum.sent,
  [ValueTransferKindEnum.Received]: WalletValueTransferKindEnum.received,
  [ValueTransferKindEnum.MemoToSelf]: WalletValueTransferKindEnum.memoToSelf,
  [ValueTransferKindEnum.SendToSelf]: WalletValueTransferKindEnum.sendToSelf,
  [ValueTransferKindEnum.Shield]: WalletValueTransferKindEnum.shield,
  [ValueTransferKindEnum.Rejection]: WalletValueTransferKindEnum.rejection,
  [ValueTransferKindEnum.CreateBond]: WalletValueTransferKindEnum.createBond,
  [ValueTransferKindEnum.BeginUnbond]: WalletValueTransferKindEnum.beginUnbond,
  [ValueTransferKindEnum.WithdrawBond]:
    WalletValueTransferKindEnum.withdrawBond,
  [ValueTransferKindEnum.RetargetDelegationBond]:
    WalletValueTransferKindEnum.retargetDelegationBond,
  [ValueTransferKindEnum.Unknown]: WalletValueTransferKindEnum.rejection,
};

type Proposal = {
  kind: ValueTransferKind;
  amount: number;
  address: string;
};

type FakeWallet = {
  seed: string;
  birthday: number;
  ufvk: string;
  readOnly: boolean;
};

type FakeBond = {
  txid: string;
  finalizer: string;
  amount: number;
  status: 0 | 1;
};

const BONDS: FakeBond[] = [
  { txid: BOND_TXID_A, finalizer: FINALIZER_A, amount: 0.07, status: 0 },
  { txid: BOND_TXID_B, finalizer: FINALIZER_B, amount: 0.03, status: 0 },
  { txid: BOND_TXID_C, finalizer: FINALIZER_C, amount: 0.02, status: 1 },
];

const ROSTER = [
  { pubkey: FINALIZER_A, voting_power: zats(1000) },
  { pubkey: FINALIZER_B, voting_power: zats(4200) },
  { pubkey: FINALIZER_C, voting_power: zats(860) },
  { pubkey: FINALIZER_D, voting_power: zats(15000) },
];

const bondEvents = (): ValueTransfer[] =>
  BONDS.map((b, i) => ({
    txid: b.txid,
    datetime: Math.floor(Date.now() / 1000) - 3600 * (i + 1),
    status: ValueTransferStatusEnum.confirmed,
    blockheight: BOND_HEIGHT - i,
    transaction_fee: FEE_ZATS,
    zec_price: 33.33,
    kind: WalletValueTransferKindEnum.createBond,
    value: zats(b.amount),
    recipient_address: b.finalizer,
    pool_received: null,
    memos: [],
    staking_action: null,
  }));

const baseEvents = (): ValueTransfer[] => [
  ...bondEvents(),
  ...mockValueTransfers.map(v => ({
    txid: v.txid,
    datetime: v.time,
    status: v.status,
    blockheight: v.blockheight,
    transaction_fee: zats(v.fee ?? 0),
    zec_price: v.zecPrice ?? null,
    kind: KINDS[v.kind],
    value: zats(v.amount ?? 0),
    recipient_address: v.address ?? null,
    pool_received: v.poolType ?? null,
    memos: v.memos ?? [],
    staking_action: v.stakingAction
      ? {
          kind: v.stakingAction.kind as StakingKind,
          val: zats(v.stakingAction.val),
          target: v.stakingAction.target,
          target_address: null,
          unique_public_key: v.stakingAction.unique_public_key,
        }
      : null,
  })),
];

const seedPayload = (w: FakeWallet): string =>
  payload<Seed>({
    seed_phrase: w.seed,
    birthday: w.birthday,
    no_of_accounts: 1,
  });

const ufvkPayload = (w: FakeWallet): string =>
  payload<Ufvk>({ ufvk: w.ufvk, birthday: w.birthday });

const indexerReport = (uri: string) =>
  JSON.stringify({
    indexers: [
      {
        uri,
        latency_ms: 12,
        tip_height: HEIGHT,
        tip_age_secs: 30,
        source: 'builtin',
      },
    ],
    errors: [],
  });

let wallet: FakeWallet | null = null;
let backup: FakeWallet | null = null;
let proposal: Proposal | null = null;
let events: ValueTransfer[] = baseEvents();
let syncLaunched = false;
let syncComplete = false;
let serverUri = mockIndexerServer.uri;
let chainName: ChainNameEnum = mockInfo.chainName;
let performanceLevel: PerformanceLevelEnum = PerformanceLevelEnum.Medium;
let txCounter = 0;

const txid = () => (txCounter++).toString(16).padStart(64, '0');

const fakeRpc = {
  walletExists: async () => (wallet ? GlobalConst.true : GlobalConst.false),

  walletBackupExists: async () =>
    backup ? GlobalConst.true : GlobalConst.false,

  loadExistingWallet: async (
    uri: string,
    name: string,
    level: string,
    _minConfirmations: string,
  ) => {
    if (!wallet) {
      return err('wallet not found');
    }
    serverUri = uri;
    chainName = name as ChainNameEnum;
    performanceLevel = level as PerformanceLevelEnum;
    return wallet.readOnly ? ufvkPayload(wallet) : seedPayload(wallet);
  },

  createNewWallet: async (
    uri: string,
    name: string,
    level: string,
    _minConfirmations: string,
  ) => {
    if (wallet) {
      return err('wallet already exists');
    }
    serverUri = uri;
    chainName = name as ChainNameEnum;
    performanceLevel = level as PerformanceLevelEnum;
    const created: FakeWallet = {
      seed: mockWallet.seed ?? '',
      birthday: mockWallet.birthday,
      ufvk: mockWallet.ufvk ?? '',
      readOnly: false,
    };
    wallet = created;
    return seedPayload(created);
  },

  restoreWalletFromSeed: async (
    seed: string,
    birthday: string,
    uri: string,
    name: string,
    level: string,
    _minConfirmations: string,
  ) => {
    serverUri = uri;
    chainName = name as ChainNameEnum;
    performanceLevel = level as PerformanceLevelEnum;
    const lower = seed.toLowerCase();
    const readOnly =
      lower.startsWith(GlobalConst.uview) ||
      lower.startsWith(GlobalConst.utestview);
    const restored: FakeWallet = {
      seed: readOnly ? '' : lower,
      birthday: Number(birthday) || 0,
      ufvk: readOnly ? seed : (mockWallet.ufvk ?? ''),
      readOnly,
    };
    wallet = restored;
    return readOnly ? ufvkPayload(restored) : seedPayload(restored);
  },

  walletKindInfo: async () => {
    if (!wallet) {
      return err('wallet not found');
    }
    return payload<WalletKind>({
      kind: wallet.readOnly
        ? WalletKindEnum.LoadedFromUnifiedFullViewingKey
        : WalletKindEnum.LoadedFromSeedPhrase,
      transparent: true,
      sapling: true,
      orchard: true,
    });
  },

  getSeedInfo: async () => {
    if (!wallet || wallet.readOnly) {
      return err('wallet not found');
    }
    return seedPayload(wallet);
  },

  getUfvkInfo: async () => {
    if (!wallet) {
      return err('wallet not found');
    }
    return ufvkPayload(wallet);
  },

  getBalanceInfo: async () =>
    payload<Balance>({
      confirmed_ironwood_balance: 0,
      unconfirmed_ironwood_balance: 0,
      total_ironwood_balance: 0,
      confirmed_orchard_balance: zats(mockTotalBalance.confirmedOrchardBalance),
      unconfirmed_orchard_balance: 0,
      total_orchard_balance: zats(mockTotalBalance.totalOrchardBalance),
      confirmed_sapling_balance: zats(mockTotalBalance.confirmedSaplingBalance),
      unconfirmed_sapling_balance: 0,
      total_sapling_balance: zats(mockTotalBalance.totalSaplingBalance),
      confirmed_transparent_balance: zats(
        mockTotalBalance.confirmedTransparentBalance,
      ),
      unconfirmed_transparent_balance: 0,
      total_transparent_balance: zats(mockTotalBalance.totalTransparentBalance),
      staked_amount: zats(mockTotalBalance.stakedAmount),
    }),

  getSpendableBalanceTotalInfo: async () =>
    payload<SpendableBalance>({
      spendable_balance: zats(mockTotalBalance.totalSpendableBalance),
    }),

  getValueTransfersList: async () =>
    payload<ValueTransfers>({ wallet_events: events }),

  runSyncProcess: async () => {
    syncLaunched = true;
    syncComplete = true;
    return 'OK';
  },

  runRescanProcess: async () => {
    syncLaunched = true;
    syncComplete = true;
    return 'OK';
  },

  pauseSyncProcess: async () => 'OK',

  statusSyncInfo: async () => payload<SyncStatus>(mockSyncingStatus),

  pollSyncInfo: async () => {
    if (!syncLaunched) {
      return 'sync task has not been launched yet';
    }
    if (!syncComplete) {
      return 'sync task is not complete';
    }
    const start = wallet ? wallet.birthday : 0;
    return payload<SyncPoll>({
      sync_complete: {
        sync_start_height: start,
        sync_end_height: HEIGHT,
        blocks_scanned: HEIGHT - start,
        sapling_outputs_scanned: 0,
        orchard_outputs_scanned: 0,
        ironwood_outputs_scanned: 0,
        percentage_total_outputs_scanned: 100,
        total_outputs_scanned: 0,
        total_outputs: 0,
      },
    });
  },

  sendProcess: async (sendJson: string) => {
    if (!wallet) {
      return err('wallet not found');
    }
    let amount = 0;
    let address = '';
    try {
      const json = JSON.parse(sendJson);
      amount = Number(json[0]?.amount ?? 0);
      address = String(json[0]?.address ?? '');
    } catch (e) {
      return err('invalid propose json');
    }
    proposal = { kind: WalletValueTransferKindEnum.sent, amount, address };
    return payload<Propose>({ fee: FEE_ZATS });
  },

  confirmProcess: async () => {
    if (!proposal) {
      return err('no proposed transaction');
    }
    const current = proposal;
    proposal = null;
    const created = txid();
    events = [
      ...events,
      {
        txid: created,
        datetime: Date.now(),
        status: ValueTransferStatusEnum.confirmed,
        blockheight: HEIGHT,
        transaction_fee: FEE_ZATS,
        zec_price: null,
        kind: current.kind,
        value: current.amount,
        recipient_address: current.address || null,
        pool_received: null,
        memos: [],
        staking_action: null,
      },
    ];
    return payload<Confirm>({ txids: [created] });
  },

  stakeProcess: async (stakeJson: string) => {
    if (!wallet) {
      return err('wallet not found');
    }
    let amount = 0;
    let address = '';
    try {
      const json = JSON.parse(stakeJson);
      amount = Number(json.amount_zats ?? 0);
      address = String(json.finalizer_address ?? '');
    } catch (e) {
      return err('invalid stake json');
    }
    proposal = {
      kind: WalletValueTransferKindEnum.createBond,
      amount,
      address,
    };
    return payload<Propose>({ fee: FEE_ZATS });
  },

  beginUnstakeProcess: async (createTxid: string) => {
    if (!wallet) {
      return err('wallet not found');
    }
    if (!/^[0-9a-fA-F]{64}$/.test(createTxid)) {
      return err('begin_unstake requires a 64-hex create bond txid');
    }
    proposal = {
      kind: WalletValueTransferKindEnum.beginUnbond,
      amount: 0,
      address: '',
    };
    return payload<Propose>({ fee: FEE_ZATS });
  },

  withdrawStakeProcess: async (createTxid: string) => {
    if (!wallet) {
      return err('wallet not found');
    }
    if (!/^[0-9a-fA-F]{64}$/.test(createTxid)) {
      return err('withdraw_stake requires a 64-hex create bond txid');
    }
    return payload<WithdrawStake>({ txid: txid() });
  },

  retargetBondProcess: async (createTxid: string, finalizer: string) => {
    if (!wallet) {
      return err('wallet not found');
    }
    if (!/^[0-9a-fA-F]{64}$/.test(createTxid)) {
      return err('retarget_bond requires a 64-hex create bond txid');
    }
    proposal = {
      kind: WalletValueTransferKindEnum.retargetDelegationBond,
      amount: 0,
      address: finalizer,
    };
    return payload<Propose>({ fee: FEE_ZATS });
  },

  requestFaucetFundsProcess: async (address: string) => {
    if (!address) {
      return err('empty address');
    }
    return 'ok';
  },

  infoServerInfo: async () =>
    payload<WalletInfo>({
      version: '0.0.1',
      git_commit: 'fakecommit',
      indexer_uri: serverUri,
      vendor: 'zingo',
      taddr_support: true,
      chain_name: chainName,
      sapling_activation_height: 419200,
      consensus_branch_id: 'c2e6d8a6',
      latest_block_height: HEIGHT,
    }),

  getLatestBlockWalletInfo: async () =>
    payload<WalletHeight>({ height: HEIGHT }),

  getLatestBlockServerInfo: async (_serverUri: string) => String(HEIGHT),

  getUnifiedAddressesInfo: async () =>
    payload<UnifiedAddress[]>(
      mockAddresses
        .filter(a => a.addressKind === AddressKindEnum.u)
        .map(a => ({
          account: 0,
          address_index: a.index,
          has_orchard: a.has_orchard,
          has_sapling: a.has_sapling,
          has_transparent: a.has_transparent,
          encoded_address: a.address,
        })),
    ),

  getTransparentAddressesInfo: async () =>
    payload<TransparentAddress[]>(
      mockAddresses
        .filter(a => a.addressKind === AddressKindEnum.t)
        .map(a => ({
          account: 0,
          address_index: a.index,
          scope: a.scope,
          encoded_address: a.address,
        })),
    ),

  getRosterInfo: async () =>
    payload<Roster>({
      roster_members: ROSTER.map(m => ({
        ...m,
        finalizer_address: null,
        txids: [],
      })),
    }),

  getWalletBondsInfo: async () =>
    payload<WalletBonds>({
      bonds: BONDS.map(b => ({
        created_in_txid: b.txid,
        bond_key: b.finalizer,
        amount_zats: zats(b.amount),
        status: b.status,
        status_name: b.status === 0 ? 'active' : 'unbonding',
        last_action_height: BOND_HEIGHT,
        next_action_height: b.status === 1 ? HEIGHT + 100 : null,
        finalizer: b.finalizer,
        finalizer_address: null,
      })),
    }),

  getConfigWalletPerformanceInfo: async () =>
    payload<ConfigWalletPerformance>({ performance_level: performanceLevel }),

  getWalletVersionInfo: async () =>
    payload<WalletVersion>({ current_version: 2, read_version: 2 }),

  getWalletSaveRequiredInfo: async () =>
    payload<WalletSaveRequired>({ save_required: false }),

  getVersionInfo: async () => VERSION,

  zecPriceInfo: async (_withTor: string) =>
    payload<ZecPrice>({ current_price: mockZecPrice.zecPrice }),

  parseAddressInfo: async (address: string) => {
    if (!address) {
      return err('empty address');
    }
    return payload<ParseAddress>({
      status: ParseAddressStatusEnum.successAddressParse,
      chain_name: chainName,
      address_kind: WalletAddressKindEnum.unifiedAddressKind,
      receivers_available: [
        ReceiversEnum.orchard,
        ReceiversEnum.sapling,
        ReceiversEnum.transparent,
      ],
      only_orchard_ua: '',
    });
  },

  getDonationAddress: async () => mockAddresses[0].address,

  getZenniesDonationAddress: async () => mockAddresses[1].address,

  inspectWallet: async (_data: string, _serverUri: string, _platform: string) =>
    JSON.stringify({
      readable: true,
      format_version: 2,
      newest_height: HEIGHT,
      chain_match: true,
      normalize_to: null,
      reason: '',
    }),

  discoverIndexers: async (_network: string) => indexerReport(serverUri),

  probeIndexer: async (uri: string, _network: string) => indexerReport(uri),

  selectBestIndexer: async (_network: string) => mockIndexerServer.uri,

  setCryptoDefaultProvider: async () => 'ok',

  createTorClientProcess: async () => 'ok',

  removeTorClientProcess: async () => 'ok',

  changeServerProcess: async (uri: string) => {
    serverUri = uri;
    return 'ok';
  },

  setConfigWalletToProdProcess: async (
    level: string,
    _minConfirmations: string,
  ) => {
    performanceLevel = level as PerformanceLevelEnum;
    return 'ok';
  },

  doSave: async () => 'ok',

  doSaveBackup: async () => {
    if (wallet) {
      backup = wallet;
    }
    return 'ok';
  },

  deleteExistingWallet: async () => {
    if (!wallet) {
      return GlobalConst.false;
    }
    wallet = null;
    proposal = null;
    events = baseEvents();
    syncLaunched = false;
    syncComplete = false;
    return GlobalConst.true;
  },

  restoreExistingWalletBackup: async () => {
    if (!backup) {
      return GlobalConst.false;
    }
    wallet = backup;
    return GlobalConst.true;
  },
};

export default fakeRpc;
