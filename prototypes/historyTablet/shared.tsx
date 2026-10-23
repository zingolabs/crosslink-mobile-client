import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, TextStyle } from 'react-native';
import moment from 'moment';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Hourglass,
  Lock,
  LockOpen,
  Repeat,
  ShieldCheck,
  Shuffle,
  StickyNote,
  Undo2,
} from 'lucide-react-native';

import {
  GlobalConst,
  ValueTransferKindEnum as K,
  ValueTransferType,
} from '../../app/AppState';
import { RPCValueTransferStatusEnum } from '../../app/rpc/enums/RPCValueTransferStatusEnum';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
} from '../../app/context';
import { recipientNames } from './data';

export const gold = '#F2CC50';
export const stakeBlue = '#0091FF';
export const unbondAmber = '#FFAF0E';

export const nativeDriver = Platform.OS !== 'web';

export const spring = (response: number, dampingRatio = 1) => ({
  stiffness: Math.pow((2 * Math.PI) / response, 2),
  damping: (4 * Math.PI * dampingRatio) / response,
  mass: 1,
});

export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export type Flow = 'in' | 'out' | 'self' | 'stake';

export const flowOf = (vt: ValueTransferType): Flow => {
  switch (vt.kind) {
    case K.Received:
    case K.WithdrawBond:
      return 'in';
    case K.Sent:
      return 'out';
    case K.CreateBond:
    case K.BeginUnbond:
    case K.RetargetDelegationBond:
      return 'stake';
    default:
      return 'self';
  }
};

export const isPending = (vt: ValueTransferType) =>
  vt.confirmations >= 0 && vt.confirmations < GlobalConst.minConfirmations;

export const kindLabel = (vt: ValueTransferType) => {
  const pending = vt.confirmations === 0;
  switch (vt.kind) {
    case K.Received:
      return pending ? 'Receiving' : 'Received';
    case K.Sent:
      return pending ? 'Sending' : 'Sent';
    case K.Shield:
      return pending ? 'Shielding' : 'Shielded';
    case K.MemoToSelf:
      return 'Note to self';
    case K.SendToSelf:
      return 'Moved to self';
    case K.CreateBond:
      return 'Staked';
    case K.BeginUnbond:
      return 'Unstaking';
    case K.WithdrawBond:
      return 'Stake withdrawn';
    case K.RetargetDelegationBond:
      return 'Redelegated';
    case K.Rejection:
      return 'Returned';
    default:
      return 'Transaction';
  }
};

export const statusLabel = (vt: ValueTransferType) => {
  switch (vt.status) {
    case RPCValueTransferStatusEnum.calculated:
      return 'Preparing';
    case RPCValueTransferStatusEnum.transmitted:
      return 'Broadcast';
    case RPCValueTransferStatusEnum.mempool:
      return 'In mempool';
    case RPCValueTransferStatusEnum.failed:
      return 'Failed';
    default:
      return 'Confirmed';
  }
};

export const kindColor = (vt: ValueTransferType, fallback: string) => {
  if (vt.kind === K.CreateBond) {
    return stakeBlue;
  }
  if (
    vt.kind === K.BeginUnbond ||
    vt.kind === K.RetargetDelegationBond ||
    vt.kind === K.WithdrawBond
  ) {
    return unbondAmber;
  }
  return fallback;
};

export const KindIcon: React.FC<{
  vt: ValueTransferType;
  size?: number;
  color: string;
}> = ({ vt, size = 18, color }) => {
  const props = { size, color, strokeWidth: 2 };
  if (isPending(vt)) {
    return <Clock {...props} />;
  }
  switch (vt.kind) {
    case K.Received:
      return <ArrowDownLeft {...props} />;
    case K.Sent:
      return <ArrowUpRight {...props} />;
    case K.Shield:
      return <ShieldCheck {...props} />;
    case K.MemoToSelf:
      return <StickyNote {...props} />;
    case K.SendToSelf:
      return <Repeat {...props} />;
    case K.CreateBond:
      return <Lock {...props} />;
    case K.BeginUnbond:
      return <Hourglass {...props} />;
    case K.WithdrawBond:
      return <LockOpen {...props} />;
    case K.RetargetDelegationBond:
      return <Shuffle {...props} />;
    default:
      return <Undo2 {...props} />;
  }
};

export const formatZec = (n: number, maxDecimals = 8) => {
  const fixed = Math.abs(n).toFixed(maxDecimals);
  let [whole, frac = ''] = fixed.split('.');
  frac = frac.replace(/0+$/, '');
  if (frac.length < 2) {
    frac = frac.padEnd(2, '0');
  }
  whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${whole}.${frac}`;
};

export const splitZec = (n: number) => {
  const [whole, frac] = formatZec(n).split('.');
  return { whole, frac };
};

export const formatFiat = (n: number) =>
  `$${Math.abs(n)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

export const signOf = (vt: ValueTransferType) => {
  const f = flowOf(vt);
  if (f === 'in') {
    return '+';
  }
  if (f === 'out') {
    return '−';
  }
  return '';
};

export const MASK = '••••';

export const counterparty = (vt: ValueTransferType) => {
  if (vt.address) {
    return (
      recipientNames[vt.address] ??
      `${vt.address.slice(0, 8)}…${vt.address.slice(-6)}`
    );
  }
  if (vt.poolType) {
    return `${vt.poolType} pool`;
  }
  return 'This wallet';
};

export const memoOf = (vt: ValueTransferType) =>
  (vt.memos ?? [])
    .map(m => m.trim())
    .filter(Boolean)
    .join(' ');

export const trimHash = (h: string, n = 10) =>
  `${h.slice(0, n)}…${h.slice(-n)}`;

export const at = (vt: ValueTransferType) => moment(vt.time * 1000);

export const monthKey = (vt: ValueTransferType) => at(vt).format('YYYY-MM');

export type MonthGroup = {
  key: string;
  date: moment.Moment;
  items: ValueTransferType[];
  inflow: number;
  outflow: number;
};

export const groupByMonth = (vts: ValueTransferType[]): MonthGroup[] => {
  const map = new Map<string, MonthGroup>();
  vts.forEach(vt => {
    const key = monthKey(vt);
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        date: at(vt).startOf('month'),
        items: [],
        inflow: 0,
        outflow: 0,
      };
      map.set(key, g);
    }
    g.items.push(vt);
    const f = flowOf(vt);
    if (f === 'in') {
      g.inflow += vt.amount;
    } else if (f === 'out') {
      g.outflow += vt.amount + (vt.fee ?? 0);
    }
  });
  return [...map.values()];
};

export const relativeBucket = (vt: ValueTransferType) => {
  const d = at(vt);
  const today = moment().startOf('day');
  if (d.isSameOrAfter(today)) {
    return 'Today';
  }
  if (d.isSameOrAfter(today.clone().subtract(1, 'day'))) {
    return 'Yesterday';
  }
  if (d.isSameOrAfter(today.clone().subtract(6, 'days'))) {
    return 'This week';
  }
  if (d.isSame(today, 'month')) {
    return 'Earlier this month';
  }
  return d.format('MMMM YYYY');
};

export const useTransfers = () => {
  const { valueTransfers } = useAppLoadedWallet();
  return useMemo(
    () =>
      (valueTransfers ?? [])
        .filter(vt => vt.status !== RPCValueTransferStatusEnum.failed)
        .sort((a, b) => b.time - a.time),
    [valueTransfers],
  );
};

export const useSync = () => {
  const { syncingStatus, netInfo } = useAppLoadedWallet();
  const pct =
    syncingStatus?.percentage_total_outputs_scanned ||
    syncingStatus?.percentage_total_blocks_scanned ||
    0;
  if (!netInfo.isConnected) {
    return { label: 'Offline', progress: 0, done: false, offline: true };
  }
  if (pct >= 100) {
    return { label: 'Up to date', progress: 1, done: true, offline: false };
  }
  if (pct > 0) {
    return {
      label: `Syncing ${Math.floor(pct)}%`,
      progress: pct / 100,
      done: false,
      offline: false,
    };
  }
  return { label: 'Connecting', progress: 0, done: false, offline: false };
};

export const usePrivacy = () => {
  const { setPrivacyOption } = useAppLoadedActions();
  const { privacy } = useAppLoadedSettings();
  const [hidden, setHidden] = useState<boolean>(!!privacy);
  useEffect(() => setHidden(!!privacy), [privacy]);
  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    setPrivacyOption(next);
  };
  return { hidden, toggle };
};

export const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => sub.remove();
  }, []);
  return reduced;
};

export const useCopy = () => {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) {
      return;
    }
    const t = setTimeout(() => setCopied(null), 1400);
    return () => clearTimeout(t);
  }, [copied]);
  return { copied, markCopied: setCopied };
};

export const useKeys = (handler: (e: KeyboardEvent) => void) => {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const fn = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      handler(e);
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [handler]);
};

export type VariantActions = {
  onSend: () => void;
  onReceive: () => void;
  onFaucet: () => void;
  onShield: () => void;
  onStake: () => void;
};
