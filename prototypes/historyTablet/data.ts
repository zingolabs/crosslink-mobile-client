import {
  ChainNameEnum,
  CurrencyNameEnum,
  PoolEnum,
  StakeType,
  TotalBalanceClass,
  WalletBondsType,
  ValueTransferKindEnum as K,
  ValueTransferType,
} from '../../app/AppState';
import { WalletBondsStatusEnum } from '../../app/AppState/enums/WalletBondsStatusEnum';
import { RPCValueTransferStatusEnum as S } from '../../app/rpc/enums/RPCValueTransferStatusEnum';

const HOUR = 3600;
const DAY = 24 * HOUR;
const now = Math.floor(Date.now() / 1000);
const TIP = 3061244;

const hex = (seed: number) => {
  let x = seed * 2654435761;
  let out = '';
  while (out.length < 64) {
    x = (x * 1103515245 + 12345) >>> 0;
    out += x.toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
};

const B32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

const ua = (seed: string) => {
  const n = seed.split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7);
  const h = hex(n % 100000) + hex((n >> 3) % 100000);
  return `u1${h
    .slice(0, 104)
    .split('')
    .map((c, i) => B32[(parseInt(c, 16) * 2 + i) % 32])
    .join('')}`;
};

type Row = {
  kind: K;
  ago: number;
  amount: number;
  memo?: string;
  to?: string;
  price: number;
  pending?: S;
  pool?: PoolEnum;
};

const rows: Row[] = [
  {
    kind: K.Sent,
    ago: 22 * 60,
    amount: 0.3,
    to: 'lunebistro',
    memo: 'Dinner at Lune, my half',
    price: 41.27,
    pending: S.transmitted,
  },
  {
    kind: K.Received,
    ago: 3 * HOUR,
    amount: 2.5,
    memo: 'For the camera lens. Enjoy it!',
    price: 41.1,
    pool: PoolEnum.OrchardPool,
  },
  {
    kind: K.Received,
    ago: 7 * HOUR,
    amount: 0.05,
    memo: 'Faucet drip',
    price: 40.95,
    pool: PoolEnum.OrchardPool,
  },
  {
    kind: K.CreateBond,
    ago: DAY + 2 * HOUR,
    amount: 5,
    to: 'finalizerzebra',
    price: 40.4,
  },
  { kind: K.Shield, ago: DAY + 5 * HOUR, amount: 0.84, price: 40.4 },
  {
    kind: K.Sent,
    ago: 3 * DAY,
    amount: 0.12,
    to: 'beanroasters',
    memo: 'Coffee beans, September order',
    price: 39.8,
  },
  {
    kind: K.MemoToSelf,
    ago: 4 * DAY,
    amount: 0,
    memo: 'Seed phrase backed up in the blue notebook',
    price: 39.8,
  },
  {
    kind: K.Received,
    ago: 6 * DAY,
    amount: 10,
    memo: 'Salary, September',
    price: 39.2,
    pool: PoolEnum.OrchardPool,
  },
  {
    kind: K.Sent,
    ago: 9 * DAY,
    amount: 1.8,
    to: 'flat4bpower',
    memo: 'Flat 4B electricity',
    price: 38.6,
  },
  { kind: K.SendToSelf, ago: 12 * DAY, amount: 3, price: 38.1 },
  {
    kind: K.BeginUnbond,
    ago: 16 * DAY,
    amount: 2,
    to: 'finalizeralder',
    price: 37.5,
  },
  {
    kind: K.Received,
    ago: 19 * DAY,
    amount: 0.75,
    memo: 'Split for the cabin weekend',
    price: 37.9,
    pool: PoolEnum.SaplingPool,
  },
  {
    kind: K.Sent,
    ago: 23 * DAY,
    amount: 3.2,
    to: 'bikeshopnorth',
    memo: 'Frame repair, invoice 0412',
    price: 36.7,
  },
  {
    kind: K.WithdrawBond,
    ago: 26 * DAY,
    amount: 1,
    to: 'finalizeralder',
    price: 36.2,
  },
  { kind: K.Shield, ago: 29 * DAY, amount: 0.3, price: 36.4 },
  {
    kind: K.Received,
    ago: 36 * DAY,
    amount: 10,
    memo: 'Salary, August',
    price: 35.8,
    pool: PoolEnum.OrchardPool,
  },
  {
    kind: K.Sent,
    ago: 40 * DAY,
    amount: 0.45,
    to: 'bookstall',
    memo: 'Two paperbacks',
    price: 35.1,
  },
  {
    kind: K.RetargetDelegationBond,
    ago: 47 * DAY,
    amount: 3,
    to: 'finalizerzebra',
    price: 34.9,
  },
  {
    kind: K.Received,
    ago: 52 * DAY,
    amount: 1.1,
    memo: 'Concert tickets, thanks',
    price: 34.2,
    pool: PoolEnum.OrchardPool,
  },
  {
    kind: K.Sent,
    ago: 58 * DAY,
    amount: 0.08,
    to: 'parkingmeter',
    price: 33.6,
  },
  {
    kind: K.CreateBond,
    ago: 63 * DAY,
    amount: 5,
    to: 'finalizeralder',
    price: 33.3,
  },
  {
    kind: K.Received,
    ago: 66 * DAY,
    amount: 10,
    memo: 'Salary, July',
    price: 33.0,
    pool: PoolEnum.OrchardPool,
  },
  {
    kind: K.Sent,
    ago: 78 * DAY,
    amount: 2.4,
    to: 'studiorent',
    memo: 'Studio rent, June',
    price: 31.9,
  },
  {
    kind: K.Received,
    ago: 85 * DAY,
    amount: 0.6,
    memo: 'Garage sale, the old lamp',
    price: 31.2,
    pool: PoolEnum.SaplingPool,
  },
  { kind: K.Shield, ago: 91 * DAY, amount: 1.2, price: 30.8 },
  {
    kind: K.Received,
    ago: 97 * DAY,
    amount: 4,
    memo: 'Freelance, logo refresh',
    price: 30.5,
    pool: PoolEnum.OrchardPool,
  },
  {
    kind: K.Received,
    ago: 118 * DAY,
    amount: 12,
    memo: 'Welcome to Zcash. Love, Dad',
    price: 29.4,
    pool: PoolEnum.OrchardPool,
  },
];

const withFee = new Set([
  K.Sent,
  K.Shield,
  K.MemoToSelf,
  K.SendToSelf,
  K.CreateBond,
  K.BeginUnbond,
  K.WithdrawBond,
  K.RetargetDelegationBond,
]);

export const tabletTransfers: ValueTransferType[] = rows.map((r, i) => {
  const blocksAgo = Math.round(r.ago / 75);
  return {
    kind: r.kind,
    txid: hex(i + 7),
    time: now - r.ago,
    amount: r.amount,
    fee: withFee.has(r.kind) ? 0.0001 : undefined,
    confirmations: r.pending ? 0 : Math.max(1, blocksAgo),
    blockheight: TIP - blocksAgo,
    zecPrice: r.price,
    address: r.to ? ua(r.to) : undefined,
    memos: r.memo ? [r.memo] : undefined,
    poolType: r.pool,
    status: r.pending ?? S.confirmed,
    stakingAction: null,
  };
});

export const tabletBalance: TotalBalanceClass = {
  totalTransparentBalance: 0.1235,
  confirmedTransparentBalance: 0.1235,
  totalSaplingBalance: 1.35,
  confirmedSaplingBalance: 1.35,
  totalOrchardBalance: 29.1749,
  confirmedOrchardBalance: 28.8749,
  totalSpendableBalance: 30.2249,
  stakedAmount: 10,
};

export const tabletPrice = { zecPrice: 41.27, date: now };

export const tabletInfo = {
  chainName: ChainNameEnum.testChainName,
  serverUri: 'https://testnet.zec.rocks',
  latestBlock: TIP,
  version: 'zainod 0.4',
  currencyName: CurrencyNameEnum.ZEC,
};

export const priceHistory: number[] = Array.from({ length: 121 }, (_, i) => {
  const d = 120 - i;
  const trend = 29.4 + (41.27 - 29.4) * (i / 120);
  const wave = Math.sin(i / 6.5) * 1.6 + Math.sin(i / 2.3) * 0.7;
  const dip = d > 30 && d < 45 ? -2.4 * Math.sin(((d - 30) / 15) * Math.PI) : 0;
  return d === 0 ? 41.27 : Math.round((trend + wave + dip) * 100) / 100;
});

const FIN_ZEBRA =
  '02a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
const FIN_ALDER =
  '03f0e1d2c3b4a5968778695a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d';
const FIN_KESTREL =
  '02aaaabbbbccccddddeeeeffff00001111222233334444555566667777888899';

export const finalizerNames: Record<string, string> = {
  [FIN_ZEBRA]: 'Zebra Finalizer',
  [FIN_ALDER]: 'Alder Node',
  [FIN_KESTREL]: 'Kestrel',
};

export const tabletBonds: WalletBondsType[] = [
  {
    txid: hex(101),
    pubKey: hex(201),
    amount: 5,
    status: WalletBondsStatusEnum.Active,
    finalizer: FIN_ZEBRA,
  },
  {
    txid: hex(102),
    pubKey: hex(202),
    amount: 5,
    status: WalletBondsStatusEnum.Active,
    finalizer: FIN_ALDER,
  },
  {
    txid: hex(103),
    pubKey: hex(203),
    amount: 2,
    status: WalletBondsStatusEnum.Unbonding,
    finalizer: FIN_ALDER,
  },
];

export const tabletStaked: StakeType[] = [
  { finalizer: FIN_ZEBRA, votingPower: 5 },
  { finalizer: FIN_ALDER, votingPower: 5 },
];

export const tabletGlobalStaked: StakeType[] = [
  { finalizer: FIN_ZEBRA, votingPower: 52000 },
  { finalizer: FIN_ALDER, votingPower: 31000 },
  { finalizer: FIN_KESTREL, votingPower: 9500 },
];

const DAY_MS = 24 * 3600 * 1000;

export const stakingSchedule = {
  nextStakingDay: Date.now() + 2 * DAY_MS,
  claimableAt: Date.now() + 9 * DAY_MS,
  rewardsSoFar: 0.0614,
  commission: 0.1,
  activeSet: {
    [FIN_ZEBRA]: true,
    [FIN_ALDER]: true,
    [FIN_KESTREL]: false,
  } as Record<string, boolean>,
  epochRewards: [
    0.0041, 0.0043, 0.0058, 0.0061, 0.0072, 0.0079, 0.0102, 0.0108,
  ],
};

export const recipientNames: Record<string, string> = {
  [ua('lunebistro')]: 'Lune Bistro',
  [ua('beanroasters')]: 'Bean Roasters',
  [ua('flat4bpower')]: 'Flat 4B Power',
  [ua('bikeshopnorth')]: 'Bike Shop North',
  [ua('bookstall')]: 'The Book Stall',
  [ua('parkingmeter')]: 'City Parking',
  [ua('studiorent')]: 'Studio Rent',
  [ua('finalizerzebra')]: 'Zebra Finalizer',
  [ua('finalizeralder')]: 'Alder Node',
};

export const tabletContext = {
  valueTransfers: tabletTransfers,
  valueTransfersTotal: tabletTransfers.length,
  totalBalance: tabletBalance,
  zecPrice: tabletPrice,
  info: tabletInfo,
  walletBonds: tabletBonds,
  staked: tabletStaked,
  globalStaked: tabletGlobalStaked,
};
