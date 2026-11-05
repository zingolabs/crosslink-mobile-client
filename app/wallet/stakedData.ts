import { StakeType, WalletBondsType } from '../AppState';
import WalletBondsInfoType, { StakedType } from './types';
import { WalletBondsStatusEnum } from '../AppState/enums/WalletBondsStatusEnum';

export type StakedData = {
  globalStaked: StakeType[];
  walletBonds: WalletBondsType[];
  staked: StakeType[];
};

export const buildStakedData = (
  rosterMembers: Array<StakedType>,
  bonds: Array<WalletBondsInfoType>,
): StakedData => {
  const globalStaked = rosterMembers.map(m => ({
    finalizer: m.pubkey,
    address: m.finalizer_address ?? null,
    votingPower: (m.voting_power || 0) / 10 ** 8,
  }));

  const walletBonds = bonds.map(m => ({
    txid: m.created_in_txid,
    pubKey: m.bond_key,
    amount: (m.amount_zats || 0) / 10 ** 8,
    status:
      m.status === 0
        ? WalletBondsStatusEnum.Active
        : m.status === 1
          ? WalletBondsStatusEnum.Unbonding
          : m.status === 2
            ? WalletBondsStatusEnum.Withdrawn
            : WalletBondsStatusEnum.Active,
    finalizer: m.finalizer,
  }));

  const stakableAmounts = new Map<string, number>();
  for (const bond of walletBonds) {
    if (
      bond.status === WalletBondsStatusEnum.Active ||
      bond.status === WalletBondsStatusEnum.Unbonding
    ) {
      stakableAmounts.set(
        bond.finalizer,
        (stakableAmounts.get(bond.finalizer) ?? 0) + bond.amount,
      );
    }
  }

  const staked = rosterMembers
    .filter(m => stakableAmounts.has(m.pubkey))
    .map(m => ({
      finalizer: m.pubkey,
      address: m.finalizer_address ?? null,
      votingPower: stakableAmounts.get(m.pubkey) || 0,
    }));

  return { globalStaked, walletBonds, staked };
};
