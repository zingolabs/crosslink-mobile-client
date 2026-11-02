import { OutgoingMetadataType } from './OutgoingMetadataType';

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
