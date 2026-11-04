import { GlobalConst } from '../AppState';
import RPCModule from '../RPCModule';

import type { Balance } from './generated/Balance';
import type { CheckAddress } from './generated/CheckAddress';
import type { ConfigWalletPerformance } from './generated/ConfigWalletPerformance';
import type { Confirm } from './generated/Confirm';
import type { ParseAddress } from './generated/ParseAddress';
import type { Propose } from './generated/Propose';
import type { Roster } from './generated/Roster';
import type { Seed } from './generated/Seed';
import type { SpendableBalance } from './generated/SpendableBalance';
import type { SyncPoll } from './generated/SyncPoll';
import type { SyncStatus } from './generated/SyncStatus';
import type { TransparentAddress } from './generated/TransparentAddress';
import type { Ufvk } from './generated/Ufvk';
import type { UnifiedAddress } from './generated/UnifiedAddress';
import type { ValueTransfers } from './generated/ValueTransfers';
import type { WalletBonds } from './generated/WalletBonds';
import type { WalletHeight } from './generated/WalletHeight';
import type { WalletInfo } from './generated/WalletInfo';
import type { WalletKind } from './generated/WalletKind';
import type { WalletVersion } from './generated/WalletVersion';
import type { WithdrawStake } from './generated/WithdrawStake';
import type { ZecPrice } from './generated/ZecPrice';

export type RpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type WalletKeys = Seed | Ufvk;

export type SyncPollResult =
  | { state: 'notLaunched' }
  | { state: 'notComplete' }
  | { state: 'complete'; poll: SyncPoll };

export const INTERNAL_RPC_ERROR = 'Error: Internal RPC Error';

export const isRpcError = (text: string | null | undefined): boolean =>
  !!text && text.toLowerCase().startsWith(GlobalConst.error);

const parse = <T>(name: string, raw: string): RpcResult<T> => {
  if (!raw) {
    return { ok: false, error: `${INTERNAL_RPC_ERROR}: ${name}` };
  }
  if (isRpcError(raw)) {
    return { ok: false, error: raw };
  }
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch (e) {
    return { ok: false, error: `Error: ${name} parse: ${e} value: ${raw}` };
  }
};

const call = async <T>(
  name: string,
  run: () => Promise<string>,
): Promise<RpcResult<T>> => parse<T>(name, await run());

export const getInfo = () =>
  call<WalletInfo>('info', () => RPCModule.infoServerInfo());

export const getBalance = () =>
  call<Balance>('balance', () => RPCModule.getBalanceInfo());

export const getSpendableBalanceTotal = () =>
  call<SpendableBalance>('spendable balance', () =>
    RPCModule.getSpendableBalanceTotalInfo(),
  );

export const getSpendableBalanceWithAddress = (
  address: string,
  zenniesForZingo: boolean,
) =>
  call<SpendableBalance>('spendable balance with address', () =>
    RPCModule.getSpendableBalanceWithAddressInfo(
      address,
      zenniesForZingo ? GlobalConst.true : GlobalConst.false,
    ),
  );

export const getWalletKind = () =>
  call<WalletKind>('wallet kind', () => RPCModule.walletKindInfo());

export const getValueTransfers = () =>
  call<ValueTransfers>('value transfers', () =>
    RPCModule.getValueTransfersList(),
  );

export const getSyncStatus = () =>
  call<SyncStatus>('sync status', () => RPCModule.statusSyncInfo());

export const pollSync = async (): Promise<RpcResult<SyncPollResult>> => {
  const raw: string = await RPCModule.pollSyncInfo();
  const text = (raw || '').toLowerCase();
  if (!isRpcError(raw)) {
    if (text.startsWith('sync task has not been launched')) {
      return { ok: true, value: { state: 'notLaunched' } };
    }
    if (text.startsWith('sync task is not complete')) {
      return { ok: true, value: { state: 'notComplete' } };
    }
  }
  const parsed = parse<SyncPoll>('sync poll', raw);
  return parsed.ok
    ? { ok: true, value: { state: 'complete', poll: parsed.value } }
    : parsed;
};

export const getUnifiedAddresses = () =>
  call<UnifiedAddress[]>('unified addresses', () =>
    RPCModule.getUnifiedAddressesInfo(),
  );

export const getTransparentAddresses = () =>
  call<TransparentAddress[]>('transparent addresses', () =>
    RPCModule.getTransparentAddressesInfo(),
  );

export const getRoster = () =>
  call<Roster>('roster_info', () => RPCModule.getRosterInfo());

export const getWalletBonds = () =>
  call<WalletBonds>('wallet bonds', () => RPCModule.getWalletBondsInfo());

export const getWalletVersion = () =>
  call<WalletVersion>('wallet version', () => RPCModule.getWalletVersionInfo());

export const getSeed = () => call<Seed>('seed', () => RPCModule.getSeedInfo());

export const getUfvk = () => call<Ufvk>('ufvk', () => RPCModule.getUfvkInfo());

export const getWalletHeight = () =>
  call<WalletHeight>('wallet height', () =>
    RPCModule.getLatestBlockWalletInfo(),
  );

export const getConfigWalletPerformance = () =>
  call<ConfigWalletPerformance>('wallet config performance', () =>
    RPCModule.getConfigWalletPerformanceInfo(),
  );

export const getZecPrice = (withTor: boolean) =>
  call<ZecPrice>('price', () =>
    RPCModule.zecPriceInfo(withTor ? GlobalConst.true : GlobalConst.false),
  );

export const parseAddress = (address: string) =>
  call<ParseAddress>('parse address', () =>
    RPCModule.parseAddressInfo(address),
  );

export const checkMyAddress = (address: string) =>
  call<CheckAddress>('check address', () =>
    RPCModule.checkMyAddressInfo(address),
  );

export const proposeSend = (sendJson: string) =>
  call<Propose>('propose', () => RPCModule.sendProcess(sendJson));

export const proposeStake = (stakeJson: string) =>
  call<Propose>('staking propose', () => RPCModule.stakeProcess(stakeJson));

export const proposeBeginUnstake = (bondCreateTxid: string) =>
  call<Propose>('begin_unstake propose', () =>
    RPCModule.beginUnstakeProcess(bondCreateTxid),
  );

export const proposeRetargetBond = (
  bondCreateTxid: string,
  finalizer: string,
) =>
  call<Propose>('Retarget_Bond propose', () =>
    RPCModule.retargetBondProcess(bondCreateTxid, finalizer),
  );

export const withdrawStake = (bondCreateTxid: string) =>
  call<WithdrawStake>('withdraw_stake', () =>
    RPCModule.withdrawStakeProcess(bondCreateTxid),
  );

export const confirm = () =>
  call<Confirm>('confirm', () => RPCModule.confirmProcess());

export const loadExistingWallet = (
  serverUri: string,
  chainName: string,
  performanceLevel: string,
  minConfirmations: string,
) =>
  call<WalletKeys>('load wallet', () =>
    RPCModule.loadExistingWallet(
      serverUri,
      chainName,
      performanceLevel,
      minConfirmations,
    ),
  );

export const createNewWallet = (
  serverUri: string,
  chainName: string,
  performanceLevel: string,
  minConfirmations: string,
) =>
  call<Seed>('create wallet', () =>
    RPCModule.createNewWallet(
      serverUri,
      chainName,
      performanceLevel,
      minConfirmations,
    ),
  );

export const restoreWalletFromSeed = (
  seed: string,
  birthday: string,
  serverUri: string,
  chainName: string,
  performanceLevel: string,
  minConfirmations: string,
) =>
  call<WalletKeys>('restore wallet', () =>
    RPCModule.restoreWalletFromSeed(
      seed,
      birthday,
      serverUri,
      chainName,
      performanceLevel,
      minConfirmations,
    ),
  );
