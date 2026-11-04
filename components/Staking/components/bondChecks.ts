import {
  ScheduledActionType,
  ValueTransferType,
  WalletBondsType,
} from '../../../app/AppState';

export const bondTransfer = (
  bond: WalletBondsType,
  valueTransfers: ValueTransferType[],
) => valueTransfers.find(v => v.txid === bond.txid);

export const bondProblem = (
  bond: WalletBondsType,
  valueTransfers: ValueTransferType[],
  scheduledActions: ScheduledActionType[],
  stakingDay: boolean,
): string | null => {
  if (!bond.txid) {
    return 'Could not determine the original bond txid.';
  }
  const transfer = bondTransfer(bond, valueTransfers);
  if (!transfer) {
    return 'Could not find the transaction that created this bond.';
  }
  if ((transfer.confirmations || 0) <= 0) {
    return 'This bond is still processing, wait for confirmations.';
  }
  if (!stakingDay && scheduledActions.some(sa => sa.txid === bond.txid)) {
    return 'This bond is already scheduled, choose another one.';
  }
  return null;
};
