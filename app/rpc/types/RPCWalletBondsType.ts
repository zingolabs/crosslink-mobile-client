export default interface RPCWalletBondsType {
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
