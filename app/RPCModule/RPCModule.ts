import { NativeModules } from 'react-native';

const { RPCModule } = NativeModules;

export type WalletKind =
  | 'seed_or_mnemonic'
  | 'unified_spending_key'
  | 'unified_full_viewing_key'
  | 'no_keys';

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

export interface RpcModule {
  walletKindInfo(): Promise<WalletKindInfo>;

  getLatestBlockWalletInfo(): Promise<LatestBlockWalletInfo>;

  changeServerProcess(serverUri: string): Promise<void>;

  setCryptoDefaultProvider(): Promise<void>;

  // TODO: Add remaining methods that are missing here:
  // ...
}

// Type assertion for intellisense
const NativeRPCModule = RPCModule as RpcModule;

export default NativeRPCModule;
