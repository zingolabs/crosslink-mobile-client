import {
  PoolEnum,
  ValueTransferKindEnum as K,
  ValueTransferType,
} from '../../app/AppState';
import { RPCValueTransferStatusEnum as S } from '../../app/rpc/enums/RPCValueTransferStatusEnum';

const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const names: Record<string, string> = {
  lunebistro: 'Lune Bistro',
  beanroasters: 'Bean Roasters',
  flat4bpower: 'Flat 4B Power',
  bikeshopnorth: 'Bike Shop North',
  bookstall: 'The Book Stall',
  parkingmeter: 'Parking meter',
  studiorent: 'Studio rent',
  finalizerzebra: 'Zebra finalizer',
  finalizeralder: 'Alder finalizer',
  mara: 'Mara',
  tomas: 'Tomás',
  faucet: 'Testnet faucet',
};

type Seed = {
  kind: K;
  ago: number;
  amount: number;
  to?: string;
  memo?: string;
  price: number;
  pending?: S;
  pool?: PoolEnum;
};

const seeds: Seed[] = [
  {
    kind: K.Sent,
    ago: 18 * MIN,
    amount: 0.3,
    to: 'lunebistro',
    memo: 'Dinner at Lune, my half',
    price: 41.27,
    pending: S.mempool,
  },
  {
    kind: K.Received,
    ago: 3 * HOUR,
    amount: 2.5,
    to: 'mara',
    memo: 'For the camera lens. Enjoy it!',
    price: 41.1,
    pool: PoolEnum.OrchardPool,
  },
  {
    kind: K.Received,
    ago: 7 * HOUR,
    amount: 0.05,
    to: 'faucet',
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
    to: 'tomas',
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
    to: 'mara',
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
    to: 'tomas',
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
    kind: K.Sent,
    ago: 58 * DAY,
    amount: 0.08,
    to: 'parkingmeter',
    price: 33.6,
  },
  {
    kind: K.Sent,
    ago: 78 * DAY,
    amount: 2.4,
    to: 'studiorent',
    memo: 'Studio rent, June',
    price: 31.9,
  },
];

const MOD = 2 ** 32;

const hex = (seed: number) => {
  let x = (seed * 2654435761) % MOD;
  let out = '';
  while (out.length < 64) {
    x = (x * 1103515245 + 12345) % MOD;
    out += Math.floor(x).toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
};

const TIP = 3061244;

const toTransfer = (r: Seed, i: number, now: number): ValueTransferType => ({
  txid: hex(i + 1),
  kind: r.kind,
  fee: r.kind === K.Received ? undefined : 0.0001,
  confirmations: r.pending ? 0 : Math.max(1, Math.floor(r.ago / 75)),
  blockheight: TIP - Math.floor(r.ago / 75),
  time: now - r.ago,
  zecPrice: r.price,
  address: r.to,
  amount: r.amount,
  memos: r.memo ? [r.memo] : undefined,
  poolType: r.pool,
  status: r.pending ?? S.confirmed,
  stakingAction: null,
});

export const seedTransfers = (now: number): ValueTransferType[] =>
  seeds.map((r, i) => toTransfer(r, i, now));

export type Incoming = 'receive' | 'send' | 'stake';

const incomingPool: Record<Incoming, Seed[]> = {
  receive: [
    {
      kind: K.Received,
      ago: 0,
      amount: 0.42,
      to: 'mara',
      memo: 'Lunch, thanks!',
      price: 41.3,
      pool: PoolEnum.OrchardPool,
    },
    {
      kind: K.Received,
      ago: 0,
      amount: 1.25,
      to: 'tomas',
      memo: 'Bonus',
      price: 41.3,
      pool: PoolEnum.OrchardPool,
    },
    {
      kind: K.Received,
      ago: 0,
      amount: 0.05,
      to: 'faucet',
      price: 41.3,
      pool: PoolEnum.OrchardPool,
    },
  ],
  send: [
    {
      kind: K.Sent,
      ago: 0,
      amount: 0.2,
      to: 'beanroasters',
      memo: 'Coffee beans, October',
      price: 41.3,
    },
    {
      kind: K.Sent,
      ago: 0,
      amount: 0.015,
      to: 'parkingmeter',
      price: 41.3,
    },
  ],
  stake: [
    {
      kind: K.CreateBond,
      ago: 0,
      amount: 2,
      to: 'finalizerzebra',
      price: 41.3,
    },
    {
      kind: K.BeginUnbond,
      ago: 0,
      amount: 1,
      to: 'finalizeralder',
      price: 41.3,
    },
  ],
};

let counter = 1000;

export const makeIncoming = (
  what: Incoming,
  now: number,
): ValueTransferType => {
  const pool = incomingPool[what];
  const seed = pool[counter % pool.length];
  counter += 1;
  return {
    ...toTransfer({ ...seed, pending: S.mempool }, counter, now),
    confirmations: 0,
    blockheight: TIP + 1,
  };
};
