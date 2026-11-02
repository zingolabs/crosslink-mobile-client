export enum AddressScopeEnum {
  external = 'external',
  internal = 'internal',
  refund = 'refund',
}

export enum CheckAddressTypeEnum {
  unifiedAddressType = 'unified',
  orchardInternalAddressType = 'orchard_internal',
  saplingAddressType = 'sapling',
  transparentAddressType = 'transparent',
}

export enum ParseAddressStatusEnum {
  successAddressParse = 'success',
  invalidAddressParse = 'Invalid address',
}

export enum ParseViewKeyStatusEnum {
  successViewKeyParse = 'success',
  invalidViewKeyParse = 'Invalid viewkey',
}

export enum PerformanceLevelEnum {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Maximum = 'Maximum',
}

export enum PoolsEnum {
  orchard = 'orchard',
  sapling = 'sapling',
  transparent = 'transparent',
}

export enum ReceiversEnum {
  orchard = 'orchard',
  sapling = 'sapling',
  transparent = 'transparent',
}

export enum SyncScanRangePriorityStatusEnum {
  Scanning = 'Scanning',
  Scanned = 'Scanned',
  ScannedWithoutMapping = 'ScannedWithoutMapping',
  Historic = 'Historic',
  OpenAdjacent = 'OpenAdjacent',
  FoundNote = 'FoundNote',
  ChainTip = 'ChainTip',
  Verify = 'Verify',
}

export enum ValueTransferStatusEnum {
  //pending = 'pending', deprecated / splitted
  calculated = 'calculated',
  transmitted = 'transmitted',
  mempool = 'mempool',
  confirmed = 'confirmed',
  failed = 'failed',
}

export enum WalletAddressKindEnum {
  unifiedAddressKind = 'unified',
  saplingAddressKind = 'sapling',
  transparentAddressKind = 'transparent',
  ufvkAddressKind = 'ufvk',
  texAddressKind = 'tex',
}

export enum WalletKindEnum {
  LoadedFromSeedPhrase = 'Loaded from seed or mnemonic phrase',
  LoadedFromUnifiedSpendingKey = 'Loaded from unified spending key',
  LoadedFromUnifiedFullViewingKey = 'Loaded from unified full viewing key',
  NoKeysFound = 'No keys found',

  // obsolete
  //Seeded = 'Seeded',
  //LoadedFromKey = 'Loaded from key',
}

export enum WalletValueTransferKindEnum {
  sent = 'sent',
  memoToSelf = 'memo-to-self',
  shield = 'shield',
  received = 'received',
  sendToSelf = 'send-to-self',
  rejection = 'rejection',

  // new for staking
  createBond = 'create-bond',
  beginUnbond = 'begin-unbond',
  withdrawBond = 'withdraw-bond',
  retargetDelegationBond = 'retarget-delegation-bond',
}
