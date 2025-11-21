import { NativeModules } from 'react-native';

const { RPCModule } = NativeModules;

export enum WalletKind {
  SEED_OR_MNEMONIC,
  UNIFIED_SPENDING_KEY,
  UNIFIED_FULL_VIEWING_KEY,
  NO_KEYS,
}

export interface WalletPools {
  transparent: boolean;
  sapling: boolean;
  orchard: boolean;
}

export interface WalletKindInfo {
  kind: WalletKind;
  pools: WalletPools;
}

export interface LatestBlockWalletInfo {
  height: number;
}

/**
 * Result of getUfvkInfo()
 */
export interface UfvkInfo {
  ufvk: string;
  birthday: number;
}

/**
 * Single value transfer returned by getValueTransfersList()
 * (mirrors the ValueTransferInfo Rust record).
 */
export interface ValueTransferInfo {
  txid: string;
  datetime: string;
  status: string;
  blockheight: number;
  transaction_fee: number | null;
  zec_price: number | null;
  kind: string;
  value: number;
  recipient_address: string | null;
  pool_received: string;
  memos: string[];
}

/**
 * Shape of the native RPC module exposed by React Native.
 *
 * NOTE:
 * - Many methods still resolve to JSON strings; you’ll usually want to JSON.parse on the JS side.
 * - Some methods resolve error strings instead of rejecting; types here describe the “happy path”.
 */
export interface RpcModule {
  //
  // Local wallet file helpers
  //
  walletExists(): Promise<boolean>;
  walletBackupExists(): Promise<boolean>;
  restoreExistingWalletBackup(): Promise<boolean>;
  deleteExistingWallet(): Promise<boolean>;
  deleteExistingWalletBackup(): Promise<boolean>;

  //
  // Wallet lifecycle / initialization
  //
  createNewWallet(
    serveruri: string,
    chainhint: string,
    performancelevel: string,
    minconfirmations: string,
  ): Promise<string>; // seed or ufvk (InitResult.value)

  restoreWalletFromSeed(
    seed: string,
    birthday: string,
    serveruri: string,
    chainhint: string,
    performancelevel: string,
    minconfirmations: string,
  ): Promise<string>; // seed

  restoreWalletFromUfvk(
    ufvk: string,
    birthday: string,
    serveruri: string,
    chainhint: string,
    performancelevel: string,
    minconfirmations: string,
  ): Promise<string>; // ufvk

  loadExistingWallet(
    serveruri: string,
    chainhint: string,
    performancelevel: string,
    minconfirmations: string,
  ): Promise<string>; // seed or ufvk

  //
  // Persistence
  //
  doSave(): Promise<boolean | string>; // boolean on success, error string on failure
  doSaveBackup(): Promise<boolean | string>; // boolean on success, error string on failure

  //
  // Chain height
  //
  getLatestBlockServerInfo(serveruri: string): Promise<number>;
  getLatestBlockWalletInfo(): Promise<LatestBlockWalletInfo | null>;

  //
  // Donation addresses
  //
  getDonationAddress(): Promise<string>;
  getZenniesDonationAddress(): Promise<string>;

  //
  // History / value transfers
  //
  getValueTransfersList(): Promise<ValueTransferInfo[]>;

  //
  // Crypto provider
  //
  setCryptoDefaultProvider(): Promise<void>;

  //
  // Sync control
  //
  pollSyncInfo(): Promise<string>; // JSON / message string
  runSyncProcess(): Promise<string>; // message string
  pauseSyncProcess(): Promise<string>; // message string
  statusSyncInfo(): Promise<string>; // JSON status
  runRescanProcess(): Promise<string>; // message string

  //
  // Server / network info
  //
  infoServerInfo(): Promise<string>; // JSON string from info_server()

  //
  // Recovery info
  //
  getSeedInfo(): Promise<string>; // JSON recovery info
  getUfvkInfo(): Promise<UfvkInfo>;

  //
  // Config
  //
  changeServerProcess(serverUri: string): Promise<void>;
  setConfigWalletToProdProcess(
    performancelevel: string,
    minconfirmations: string,
  ): Promise<string>;
  getConfigWalletPerformanceInfo(): Promise<string>; // JSON { performance_level }
  getWalletVersionInfo(): Promise<string>; // JSON { current_version, read_version }

  //
  // Wallet metadata
  //
  walletKindInfo(): Promise<WalletKindInfo>;
  getWalletSaveRequiredInfo(): Promise<string>; // JSON { save_required: boolean }

  //
  // Parsing helpers
  //
  parseAddressInfo(address: string): Promise<string>; // JSON summary
  parseUfvkInfo(ufvk: string): Promise<string>; // JSON summary

  //
  // Version / about
  //
  getVersionInfo(): Promise<string>; // git description string

  //
  // Data queries
  //
  getMessagesInfo(address: string): Promise<string>; // JSON
  getBalanceInfo(): Promise<string>; // JSON
  getTotalMemobytesToAddressInfo(): Promise<string>; // JSON
  getTotalValueToAddressInfo(): Promise<string>; // JSON
  getTotalSpendsToAddressInfo(): Promise<string>; // JSON
  zecPriceInfo(tor: string): Promise<string>; // JSON

  //
  // Transaction management
  //
  resendTransactionProcess(txid: string): Promise<string>; // message string
  removeTransactionProcess(txid: string): Promise<string>; // message string

  //
  // Spendable balance (legacy helpers)
  //
  getSpendableBalanceWithAddressInfo(
    address: string,
    zennies: string,
  ): Promise<string>; // JSON
  getSpendableBalanceTotalInfo(): Promise<string>; // JSON

  //
  // Options (currently unimplemented in Rust, return error strings)
  //
  getOptionWalletInfo(): Promise<string>;
  setOptionWalletProcess(): Promise<string>;

  //
  // Tor
  //
  createTorClientProcess(): Promise<string>; // message string
  removeTorClientProcess(): Promise<string>; // message string

  //
  // Addresses
  //
  getUnifiedAddressesInfo(): Promise<string>; // JSON
  getTransparentAddressesInfo(): Promise<string>; // JSON
  createNewUnifiedAddressProcess(receivers: string): Promise<string>; // JSON
  createNewTransparentAddressProcess(): Promise<string>; // JSON
  checkMyAddressInfo(address: string): Promise<string>; // JSON

  //
  // Send / shield / confirm flows
  //
  sendProcess(sendJson: string): Promise<string>; // JSON (fee / error)
  shieldProcess(): Promise<string>; // JSON (value_to_shield, fee / error)
  confirmProcess(): Promise<string>; // JSON (txids / error)
}

// Type assertion for intellisense
const NativeRPCModule = RPCModule as RpcModule;

export default NativeRPCModule;
