/**
 * @format
 */

import 'react-native';

import { WalletBondsStatusEnum } from '../app/AppState/enums/WalletBondsStatusEnum';
import type { RosterMember } from '../app/wallet/generated/RosterMember';
import type { WalletBond } from '../app/wallet/generated/WalletBond';
import { buildStakedData } from '../app/wallet/stakedData';

const rosterMember = (
  pubkey: string,
  votingPowerZats = 0,
  finalizerAddress: string | null = null,
): RosterMember => ({
  pubkey,
  finalizer_address: finalizerAddress,
  voting_power: votingPowerZats,
  txids: [],
});

const bond = (overrides: Partial<WalletBond>): WalletBond => ({
  created_in_txid: 'txid',
  bond_key: 'key',
  amount_zats: 100_000_000,
  status: 0,
  status_name: 'active',
  last_action_height: 1,
  next_action_height: 2,
  finalizer: 'fin-a',
  finalizer_address: null,
  ...overrides,
});

describe('buildStakedData', () => {
  it('maps the roster to globalStaked with voting power in zec', () => {
    const { globalStaked } = buildStakedData(
      [rosterMember('fin-a', 150_000_000, 'zfinv1aaa'), rosterMember('fin-b')],
      [],
    );

    expect(globalStaked).toEqual([
      { finalizer: 'fin-a', address: 'zfinv1aaa', votingPower: 1.5 },
      { finalizer: 'fin-b', address: null, votingPower: 0 },
    ]);
  });

  it('maps bond statuses onto the wallet bonds list', () => {
    const { walletBonds } = buildStakedData(
      [],
      [
        bond({ created_in_txid: 't0', status: 0, amount_zats: 2 * 10 ** 8 }),
        bond({ created_in_txid: 't1', status: 1 }),
        bond({ created_in_txid: 't2', status: 2 }),
        bond({ created_in_txid: 't3', status: 3 }),
      ],
    );

    expect(walletBonds.map(b => b.status)).toEqual([
      WalletBondsStatusEnum.Active,
      WalletBondsStatusEnum.Unbonding,
      WalletBondsStatusEnum.Withdrawn,
      WalletBondsStatusEnum.Active,
    ]);
    expect(walletBonds[0]).toMatchObject({
      txid: 't0',
      amount: 2,
      finalizer: 'fin-a',
    });
  });

  it('aggregates active and unbonding bonds per finalizer and skips withdrawn ones', () => {
    const { staked } = buildStakedData(
      [
        rosterMember('fin-a', 0, 'zfinv1aaa'),
        rosterMember('fin-b'),
        rosterMember('fin-c'),
        rosterMember('fin-d'),
      ],
      [
        bond({ finalizer: 'fin-a', amount_zats: 1 * 10 ** 8 }),
        bond({ finalizer: 'fin-a', amount_zats: 5 * 10 ** 8 }),
        bond({ finalizer: 'fin-b', status: 1 }),
        bond({ finalizer: 'fin-c', status: 2 }),
        bond({ finalizer: 'fin-d', amount_zats: 0 }),
      ],
    );

    expect(staked).toEqual([
      { finalizer: 'fin-a', address: 'zfinv1aaa', votingPower: 6 },
      { finalizer: 'fin-b', address: null, votingPower: 1 },
      { finalizer: 'fin-d', address: null, votingPower: 0 },
    ]);
  });

  it('returns empty lists for empty inputs', () => {
    expect(buildStakedData([], [])).toEqual({
      globalStaked: [],
      walletBonds: [],
      staked: [],
    });
  });

  it('handles a large roster and bond set without quadratic work', () => {
    const roster = Array.from({ length: 50_000 }, (_, i) =>
      rosterMember(`fin-${i}`),
    );
    const bonds = Array.from({ length: 10_000 }, (_, i) =>
      bond({
        created_in_txid: `tx-${i}`,
        finalizer: `fin-${i * 5}`,
      }),
    );

    const { staked } = buildStakedData(roster, bonds);

    expect(staked).toHaveLength(10_000);
    expect(staked[0]).toEqual({
      finalizer: 'fin-0',
      address: null,
      votingPower: 1,
    });
    expect(staked[1]).toEqual({
      finalizer: 'fin-5',
      address: null,
      votingPower: 1,
    });
  });
});
