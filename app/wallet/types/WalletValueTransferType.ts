import { PoolEnum, StakingActionType } from '../../AppState';
import { ValueTransferStatusEnum } from '../enums/ValueTransferStatusEnum';
import { WalletValueTransferKindEnum } from '../enums/WalletValueTransferKindEnum';

export type WalletValueTransferType = {
  txid: string;
  datetime: number;
  status: ValueTransferStatusEnum;
  blockheight: number;
  transaction_fee?: number;
  zec_price?: number;
  kind: WalletValueTransferKindEnum;
  value: number;
  recipient_address?: string;
  pool_received?: PoolEnum;
  memos?: string[];
  staking_action: StakingActionType | null;
};
