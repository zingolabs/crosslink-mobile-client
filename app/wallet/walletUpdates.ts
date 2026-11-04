import isEqual from 'lodash/isEqual';
import notifee from '@notifee/react-native';

import {
  AddressKindEnum,
  ChainNameEnum,
  CurrencyNameEnum,
  GlobalConst,
  InfoType,
  ScheduledActionType,
  ScreenEnum,
  StakeType,
  TotalBalanceClass,
  TransparentAddressClass,
  UnifiedAddressClass,
  ValueTransferKindEnum,
  ValueTransferType,
  WalletBondsType,
  WalletType,
  ZecPriceType,
} from '../AppState';
import Utils from '../utils';
import { createAlert } from '../createAlert';
import { report } from '../reporting';
import { readSettings, writeSettings } from '../storage/settingsFile';
import { removeScheduledAction } from '../storage/scheduledActionsFile';
import { patch, read } from '../store/appStore';
import { addLastSnackbar, setBackgroundError } from '../store/feedback';
import { fetchBackgroundSyncing } from '../store/platform';
import { SyncStatusType } from './types';

const screenName = ScreenEnum.Session;

export const setLastError = (error: string): void => {
  if (error === read().lastError) {
    return;
  }
  report(new Error(error));
  patch({ lastError: error });
};

export const setTotalBalance = (totalBalance: TotalBalanceClass): void => {
  if (!isEqual(read().totalBalance, totalBalance)) {
    patch({ totalBalance });
  }
};

export const setStaked = (staked: StakeType[]): void => {
  if (!isEqual(read().staked, staked)) {
    patch({ staked });
  }
};

export const setGlobalStaked = (globalStaked: StakeType[]): void => {
  if (!isEqual(read().globalStaked, globalStaked)) {
    patch({ globalStaked });
  }
};

export const setWalletBonds = (walletBonds: WalletBondsType[]): void => {
  if (!isEqual(read().walletBonds, walletBonds)) {
    patch({ walletBonds });
  }
};

export const setSyncingStatus = (syncingStatus: SyncStatusType): void => {
  fetchBackgroundSyncing();
  if (!isEqual(read().syncingStatus, syncingStatus)) {
    patch({ syncingStatus });
  }
};

export const setAllAddresses = (
  addresses: (UnifiedAddressClass | TransparentAddressClass)[],
): void => {
  if (!isEqual(read().addresses, addresses)) {
    patch({ addresses });
  }
  const unified = addresses.filter(a => a.addressKind === AddressKindEnum.u);
  const defaultUnifiedAddress =
    unified.length > 0 ? unified[unified.length - 1].address : '';
  if (read().defaultUnifiedAddress !== defaultUnifiedAddress) {
    patch({ defaultUnifiedAddress });
  }
};

export const setInfo = (newInfo: InfoType): void => {
  const current = read();
  if (isEqual(current.info, newInfo)) {
    return;
  }
  const fallbackCurrency =
    current.indexerServer.chainName === ChainNameEnum.mainChainName
      ? CurrencyNameEnum.ZEC
      : CurrencyNameEnum.cTAZ;
  patch({
    info: {
      ...newInfo,
      currencyName:
        newInfo.currencyName || current.info.currencyName || fallbackCurrency,
      chainName: newInfo.chainName || current.indexerServer.chainName,
      serverUri: newInfo.serverUri || current.indexerServer.uri,
    },
  });
};

export const setZingolibVersion = (zingolibVersion: string): void => {
  if (!read().zingolibVersion) {
    patch({ zingolibVersion });
  }
};

export const setWallet = (wallet: WalletType): void => {
  if (!isEqual(read().wallet, wallet)) {
    patch({ wallet });
  }
};

export const setZecPrice = (price: number, date: number): void => {
  const zecPrice = { zecPrice: price, date } as ZecPriceType;
  if (!isEqual(read().zecPrice, zecPrice)) {
    patch({ zecPrice });
  }
};

export const setScheduledActions = (
  scheduledActions: ScheduledActionType[],
): void => patch({ scheduledActions });

export const setShieldingAmount = (shieldingAmount: number): void =>
  patch({ shieldingAmount });

export const setScrollToTop = (scrollToTop: boolean): void =>
  patch({ scrollToTop });

export const setScrollToBottom = (scrollToBottom: boolean): void =>
  patch({ scrollToBottom });

const amountText = (amount: number): string =>
  ` ${Utils.parseNumberFloatToStringLocale(amount, 8)} ${read().info.currencyName}`;

const confirmationNotice = (
  vt: ValueTransferType,
): { title: string; message: string } | null => {
  const t = (key: string) => read().translate(key) as string;
  const feeText = vt.fee ? ` ${t('send.fee')}${amountText(vt.fee)}` : '';
  switch (vt.kind) {
    case ValueTransferKindEnum.Received:
    case ValueTransferKindEnum.WithdrawBond:
    case ValueTransferKindEnum.Rejection:
      return vt.amount > 0
        ? {
            title: t('loadedapp.receive-menu'),
            message: `${t('loadedapp.incoming-funds')}${t('history.received')}${amountText(vt.amount)}`,
          }
        : null;
    case ValueTransferKindEnum.Shield:
      return vt.amount > 0
        ? {
            title: t('loadedapp.receive-menu'),
            message: `${t('loadedapp.incoming-funds')}${t('history.shield')}${amountText(vt.amount)}`,
          }
        : null;
    case ValueTransferKindEnum.MemoToSelf:
      return vt.fee && vt.fee > 0
        ? {
            title: t('loadedapp.send-menu'),
            message: `${t('loadedapp.valuetransfer-confirmed')}${t('history.memotoself')}${feeText}`,
          }
        : null;
    case ValueTransferKindEnum.SendToSelf:
      return vt.fee && vt.fee > 0
        ? {
            title: t('loadedapp.send-menu'),
            message: `${t('loadedapp.valuetransfer-confirmed')}${t('history.sendtoself')}${feeText}`,
          }
        : null;
    case ValueTransferKindEnum.Sent:
      return vt.amount > 0
        ? {
            title: t('loadedapp.send-menu'),
            message: `${t('loadedapp.payment-made')}${t('history.sent')}${amountText(vt.amount)}`,
          }
        : null;
    case ValueTransferKindEnum.CreateBond:
      return vt.amount > 0
        ? {
            title: t('loadedapp.send-menu'),
            message: `${t('loadedapp.payment-made')}Staked${amountText(vt.amount)}`,
          }
        : null;
    default:
      return null;
  }
};

const onValueTransferConfirmed = async (vt: ValueTransferType) => {
  const notice = confirmationNotice(vt);
  if (notice) {
    createAlert(
      setBackgroundError,
      addLastSnackbar,
      [screenName],
      notice.title,
      notice.message,
      true,
    );
  }
  const scheduled = read().scheduledActions.find(sa => sa.txid === vt.txid);
  if (scheduled) {
    const list = await removeScheduledAction(scheduled.id);
    setScheduledActions(list);
    if (list.length === 0) {
      await notifee.cancelAllNotifications();
    }
  }
};

export const setValueTransfersList = async (
  valueTransfers: ValueTransferType[],
  valueTransfersTotal: number,
): Promise<void> => {
  const basicFirstViewSeed = (await readSettings()).basicFirstViewSeed;
  if (!basicFirstViewSeed) {
    await writeSettings('basicFirstViewSeed', true);
  }
  const current = read();
  if (
    isEqual(current.valueTransfers, valueTransfers) &&
    current.valueTransfersTotal === valueTransfersTotal
  ) {
    return;
  }
  const pending =
    valueTransfersTotal > 0
      ? valueTransfers.filter(
          vt =>
            vt.confirmations >= 0 &&
            vt.confirmations < GlobalConst.minConfirmations,
        ).length
      : 0;
  if (
    current.valueTransfers &&
    current.valueTransfersTotal !== null &&
    current.valueTransfersTotal > 0
  ) {
    await Promise.all(
      current.valueTransfers
        .filter(old => old.confirmations === 0)
        .map(async old => {
          const fresh = valueTransfers.find(
            vt =>
              vt.txid === old.txid &&
              vt.address === old.address &&
              vt.poolType === old.poolType,
          );
          if (fresh && fresh.confirmations > 0) {
            await onValueTransferConfirmed(fresh);
          }
        }),
    );
  }
  setTimeout(
    () => {
      patch({
        valueTransfers,
        somePending: pending > 0,
        valueTransfersTotal,
      });
    },
    pending === 0 ? 250 : 0,
  );
};
