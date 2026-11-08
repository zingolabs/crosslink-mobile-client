export default interface SecurityType {
  startApp: boolean;
  foregroundApp: boolean;
  sendConfirm: boolean;
  seedUfvkScreen: boolean;
  rescanScreen: boolean;
  settingsScreen: boolean;
  changeWalletScreen: boolean;

  // obsolete options
  restoreWalletBackupScreen?: boolean;
  seedScreen?: boolean;
  ufvkScreen?: boolean;
}
