import {
  ChainNameEnum,
  PoolEnum,
  StakingActionType,
  TransactionTypeEnum,
} from '../AppState';
import {
  AddressScopeEnum,
  CheckAddressTypeEnum,
  ParseAddressStatusEnum,
  ParseViewKeyStatusEnum,
  PerformanceLevelEnum,
  PoolsEnum,
  ReceiversEnum,
  SyncScanRangePriorityStatusEnum,
  ValueTransferStatusEnum,
  WalletAddressKindEnum,
  WalletKindEnum,
  WalletValueTransferKindEnum,
} from './enums';

// Addresses & keys

export type UnifiedAddressType = {
  account: number;
  address_index: number;
  has_orchard: boolean;
  has_sapling: boolean;
  has_transparent: boolean;
  encoded_address: string;
};

export type TransparentAddressType = {
  account: number;
  address_index: number;
  scope: AddressScopeEnum;
  encoded_address: string;
};

export type UfvkType = {
  ufvk?: string;
  birthday?: number;
};

export type ParseAddressType = {
  status: ParseAddressStatusEnum;
  chain_name?: ChainNameEnum;
  address_kind?:
    | WalletAddressKindEnum.unifiedAddressKind
    | WalletAddressKindEnum.saplingAddressKind
    | WalletAddressKindEnum.transparentAddressKind
    | WalletAddressKindEnum.texAddressKind;
  receivers_available?: ReceiversEnum[];
  only_orchard_ua?: string;
};

export type ParseViewKeyType = {
  status: ParseViewKeyStatusEnum;
  chain_name?: ChainNameEnum;
  address_kind?: WalletAddressKindEnum.ufvkAddressKind;
  pools_available?: PoolsEnum[];
};

export type CheckAddressType = {
  is_wallet_address: boolean;
  account_id: number;
  address_type: CheckAddressTypeEnum;
  encoded_address: string;
  address_index?: number;
  has_orchard?: boolean;
  has_sapling?: boolean;
  has_transparent?: boolean;
  diversifier_index?: number;
  scope?: AddressScopeEnum;
};

// Balances & notes

export type BalancesType = {
  total_orchard_balance: number;
  total_sapling_balance: number;
  total_transparent_balance: number;

  confirmed_transparent_balance: number;
  confirmed_orchard_balance: number;
  confirmed_sapling_balance: number;

  unconfirmed_orchard_balance: number;
  unconfirmed_sapling_balance: number;
  unconfirmed_transparent_balance: number;

  staked_amount: number;
};

export type SpendablebalanceType = {
  spendable_balance: number;
};

export type OrchardNoteType = {
  created_in_block: number;
  datetime: number;
  created_in_txid: string;
  value: string;
  pending: string;
  // deprecated
  //is_change: boolean;
  address: string;
  spendable: string;
  spent: string;
  spent_at_height: number;
  pending_spent: string;
};

export type SaplingNoteType = {
  created_in_block: number;
  datetime: number;
  created_in_txid: string;
  value: string;
  pending: string;
  // deprecated
  //is_change: boolean;
  address: string;
  spendable: string;
  spent: string;
  spent_at_height: number;
  pending_spent: string;
};

export type UtxoNoteType = {
  created_in_block: number;
  datetime: number;
  created_in_txid: string;
  value: string;
  scriptkey: string;
  // deprecated
  //is_change: boolean;
  address: string;
  spent_at_height: number;
  spent: string;
  pending_spent: string;
};

export type NotesType = {
  unspent_sapling_notes: SaplingNoteType[];
  pending_sapling_notes: SaplingNoteType[];

  unspent_orchard_notes: OrchardNoteType[];
  pending_orchard_notes: OrchardNoteType[];

  utxos: UtxoNoteType[];
  pending_utxos: UtxoNoteType[];
};

// Transactions & value transfers

export type SendType = {
  txids?: string[];
  error?: string;
};

export type SendProposeType = {
  fee?: number;
  amount?: number;
  error?: string;
};

export type ShieldType = {
  txids?: string[];
  error?: string;
};

export type ShieldProposeType = {
  fee?: number;
  value_to_shield?: number;
  error?: string;
};

export type ValueTransfersType = {
  wallet_events: WalletValueTransferType[];
  total: number;
};

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

export type WalletTransactionType = {
  block_height: number;
  pending: boolean;
  datetime: number;
  txid: string;
  zec_price: number;
  amount: number;
  outgoing_metadata?: OutgoingMetadataType[];
  address: string;
  memo?: string;
  memohex?: string;
  position: string;
};

export type OutgoingMetadataType = {
  address: string;
  value: number;
  memo?: string;
  memohex?: string;
};

export type StakedType = {
  pubkey: string; // finalizer
  voting_power: number;
  txids?: any[];
};

export default interface WalletBondsInfoType {
  created_in_txid: string;
  bond_key: string;
  amount_zats: number;
  status: 0 | 1 | 2 | 3;
  status_name: string;
  last_action_height: number | null;
  next_action_height: number | null;
  finalizer: string;
  finalizer_address: string | null;
}

// Sync & wallet info

export type SyncStatusType = {
  scan_ranges?: SyncScanRangeStatusType[];
  sync_start_height?: number;
  session_blocks_scanned?: number;
  total_blocks_scanned?: number;
  percentage_session_blocks_scanned?: number;
  percentage_total_blocks_scanned?: number;
  session_sapling_outputs_scanned?: number;
  total_sapling_outputs_scanned?: number;
  session_orchard_outputs_scanned?: number;
  total_orchard_outputs_scanned?: number;
  percentage_session_outputs_scanned?: number;
  percentage_total_outputs_scanned?: number;
};

export type SyncPollType = {
  sync_complete: SyncCompletePollType;
};

export type SyncCompletePollType = {
  sync_start_height: number;
  sync_end_height: number;
  blocks_scanned: number;
  sapling_outputs_scanned: number;
  orchard_outputs_scanned: number;
  percentage_total_outputs_scanned?: number;
};

export type SyncScanRangeStatusType = {
  priority: SyncScanRangePriorityStatusEnum;
  start_block: number;
  end_block: number;
};

export type WalletHeight = {
  height: number;
};

export type WalletInfoType = {
  version: string;
  git_commit: string;
  server_uri: string;
  vendor: string;
  taddr_support: boolean;
  chain_name: ChainNameEnum;
  sapling_activation_height: number;
  consensus_branch_id: string;
  latest_block_height: number;
};

export type WalletKindType = {
  kind: WalletKindEnum;
  transparent: boolean;
  sapling: boolean;
  orchard: boolean;
};

export type WalletVersionType = {
  current_version: number;
  read_version: number;
};

export type WalletSaveRequiredType = {
  save_required: boolean;
};

export type ConfigWalletPerformanceType = {
  performance_level: PerformanceLevelEnum;
};

export type SummariesType = {
  block_height: number; // not using.
  datetime: number;
  txid: string;
  price?: number | null | 'None';
  amount: number;
  to_address?: string;
  memos?: string[];
  kind: TransactionTypeEnum;
  pool_type?: PoolEnum | 'None';
  pending: boolean;
};

export type WalletZecPriceType = {
  current_price?: number;
  error?: string;
};

export type SeedType = {
  seed_phrase?: string;
  birthday?: number;
  no_of_accounts?: number;
  error?: string;
};
