// TODO: SPLIT INTO SUB-ROUTES
export enum RouteEnum {
  // Stack
  Boot = 'boot',
  Session = 'session',

  StartMenu = 'StartMenu',
  ChooseIndexer = 'ChooseIndexer',
  ListedIndexers = 'ListedIndexers',
  CustomIndexer = 'CustomIndexer',
  Import = 'Import',

  MainTabs = 'MainTabs',

  // Drawer no params
  History = 'History',
  Send = 'Send',
  Receive = 'Receive',
  Faucet = 'Faucet',
  SettingsMenu = 'SettingsMenu',
  SettingsServers = 'SettingsServers',
  DebugInfo = 'DebugInfo',
  Computing = 'Computing',
  ComputingOK = 'ComputingOK',
  ComputingError = 'ComputingError',
  SyncReport = 'SyncReport',
  StakingHome = 'StakingHome',
  Stake = 'Stake',
  Unstake = 'Unstake',
  Distribution = 'Distribution',
  Redelegate = 'Redelegate',
  Finalizers = 'Finalizers',
  ScheduledActionDetail = 'ScheduledActionDetail',
  FinalizerDetail = 'FinalizerDetail',

  SettingsStack = 'SettingsStack',
  Notes = 'Notes',

  // Drawer with params
  ScannerAddress = 'ScannerAddress',
  ValueTransferDetail = 'ValueTransferDetail',
  Seed = 'Seed',
}
