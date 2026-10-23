import {
  ScheduledActionType,
  StakeType,
  StakingActionKindEnum,
  WalletBondsType,
} from '../app/AppState';
import { WalletBondsStatusEnum } from '../app/AppState/enums/WalletBondsStatusEnum';

const FINALIZER_A =
  '02a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
const FINALIZER_B =
  '03f0e1d2c3b4a5968778695a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d';

export const mockStaked: StakeType[] = [
  { finalizer: FINALIZER_A, votingPower: 1200 },
  { finalizer: FINALIZER_B, votingPower: 800 },
];

export const mockGlobalStaked: StakeType[] = [
  { finalizer: FINALIZER_A, votingPower: 52000 },
  { finalizer: FINALIZER_B, votingPower: 31000 },
  {
    finalizer:
      '02aaaabbbbccccddddeeeeffff00001111222233334444555566667777888899',
    votingPower: 9500,
  },
];

export const mockWalletBonds: WalletBondsType[] = [
  {
    txid: 'bond-txid-active-0001',
    pubKey: 'pubkey-0001',
    amount: 0.5,
    status: WalletBondsStatusEnum.Active,
    finalizer: FINALIZER_A,
  },
  {
    txid: 'bond-txid-unbonding-0002',
    pubKey: 'pubkey-0002',
    amount: 0.25,
    status: WalletBondsStatusEnum.Unbonding,
    finalizer: FINALIZER_B,
  },
];

export const mockScheduledActions: ScheduledActionType[] = [
  {
    id: 1,
    kind: StakingActionKindEnum.CreateBond,
    amount: 0.5,
    finalizer: FINALIZER_A,
    finalizerTo: '',
    txid: 'scheduled-stake-0001',
    bondKey: '',
  },
  {
    id: 2,
    kind: StakingActionKindEnum.BeginUnbonding,
    amount: 0.25,
    finalizer: FINALIZER_B,
    finalizerTo: '',
    txid: 'scheduled-unstake-0002',
    bondKey: 'bondkey-0002',
  },
];

export const mockFinalizerA = FINALIZER_A;
export const mockFinalizerB = FINALIZER_B;
