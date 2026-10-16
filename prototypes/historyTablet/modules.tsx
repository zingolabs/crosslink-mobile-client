/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import moment from 'moment';
import {
  CalendarClock,
  CircleCheck,
  Hourglass,
  Server,
  ShieldCheck,
} from 'lucide-react-native';

import { ValueTransferType } from '../../app/AppState';
import { WalletBondsStatusEnum } from '../../app/AppState/enums/WalletBondsStatusEnum';
import { ContextAppLoaded } from '../../app/context';
import { useTheme } from '../../app/theme';
import { Bars, BarDatum, Gauge, Sparkline, StackBar } from './charts';
import {
  finalizerNames,
  priceHistory,
  recipientNames,
  stakingSchedule,
} from './data';
import { BalanceFigure, PillButton, Segmented, SyncLine, t } from './parts';
import {
  MASK,
  at,
  flowOf,
  formatFiat,
  formatZec,
  gold,
  isPending,
  stakeBlue,
  tabular,
  unbondAmber,
  useSync,
} from './shared';

export const POOL = {
  orchard: gold,
  sapling: '#9C8540',
  transparent: '#8D8D8D',
};

const useCurrency = () => {
  const { info } = useContext(ContextAppLoaded);
  return info.currencyName || 'ZEC';
};

export const usePools = () => {
  const { totalBalance } = useContext(ContextAppLoaded);
  const orchard = totalBalance?.totalOrchardBalance ?? 0;
  const sapling = totalBalance?.totalSaplingBalance ?? 0;
  const transparent = totalBalance?.totalTransparentBalance ?? 0;
  const confirmed =
    (totalBalance?.confirmedOrchardBalance ?? 0) +
    (totalBalance?.confirmedSaplingBalance ?? 0) +
    (totalBalance?.confirmedTransparentBalance ?? 0);
  const total = orchard + sapling + transparent;
  const shielded = orchard + sapling;
  return {
    orchard,
    sapling,
    transparent,
    total,
    shielded,
    confirming: Math.max(0, total - confirmed),
    spendable: totalBalance?.totalSpendableBalance ?? 0,
    pct: total > 0 ? shielded / total : 1,
  };
};

const pctText = (v: number) => {
  const p = v * 100;
  return p > 99 && p < 100 ? '99' : p.toFixed(0);
};

export const SpendableHeader: React.FC<{
  hidden: boolean;
  size?: number;
}> = ({ hidden, size = 40 }) => {
  const { colors } = useTheme();
  const { zecPrice } = useContext(ContextAppLoaded);
  const cur = useCurrency();
  const p = usePools();
  return (
    <View>
      <Text style={[t.footnote, { color: colors.fgSubtle, marginBottom: 6 }]}>
        Spendable now
      </Text>
      <BalanceFigure value={p.spendable} hidden={hidden} size={size} rule />
      <Text
        style={[
          t.subheadline,
          tabular,
          { color: colors.fgMuted, marginTop: 12 },
        ]}
      >
        {hidden
          ? 'Press and hold to reveal'
          : `≈ ${formatFiat(p.spendable * (zecPrice?.zecPrice ?? 0))}`}
      </Text>
      {p.confirming > 0 && (
        <View style={{ marginTop: 14, gap: 6 }}>
          <View style={[t.row, { justifyContent: 'space-between' }]}>
            <Text style={[t.footnote, tabular, { color: colors.fgWarning }]}>
              {hidden ? MASK : `${formatZec(p.confirming, 2)} ${cur}`}{' '}
              confirming
            </Text>
            <Text style={[t.caption, tabular, { color: colors.fgSubtle }]}>
              1 of 3
            </Text>
          </View>
          <StackBar
            height={4}
            segments={[
              { value: 1, color: colors.fgWarning },
              { value: 2, color: 'transparent' },
            ]}
          />
        </View>
      )}
    </View>
  );
};

export const PrivacyGauge: React.FC<{ size?: number; hidden: boolean }> = ({
  size = 132,
  hidden,
}) => {
  const { colors } = useTheme();
  const p = usePools();
  return (
    <Gauge
      size={size}
      stroke={Math.round(size * 0.085)}
      segments={[
        { value: p.orchard, color: POOL.orchard },
        { value: p.sapling, color: POOL.sapling },
        { value: p.transparent, color: POOL.transparent },
      ]}
    >
      <ShieldCheck
        size={Math.round(size * 0.14)}
        color={gold}
        strokeWidth={2}
      />
      <Text
        style={[
          tabular,
          {
            color: colors.fgDefault,
            fontSize: Math.round(size * 0.2),
            fontWeight: '600',
            letterSpacing: -0.5,
            marginTop: 2,
          },
        ]}
      >
        {hidden ? '••' : `${pctText(p.pct)}%`}
      </Text>
      <Text style={[t.caption, { color: colors.fgSubtle }]}>shielded</Text>
    </Gauge>
  );
};

export const PoolLegend: React.FC<{ hidden: boolean; notes?: boolean }> = ({
  hidden,
  notes = true,
}) => {
  const { colors } = useTheme();
  const p = usePools();
  const rows = [
    { k: 'Orchard', v: p.orchard, c: POOL.orchard, note: 'Shielded' },
    { k: 'Sapling', v: p.sapling, c: POOL.sapling, note: 'Shielded, older' },
    { k: 'Transparent', v: p.transparent, c: POOL.transparent, note: 'Public' },
  ];
  return (
    <View style={{ gap: 8 }}>
      {rows.map(r => (
        <View key={r.k} style={[t.row, { gap: 10 }]}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: r.c,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[t.footnote, { color: colors.fgDefault }]}>{r.k}</Text>
            {notes && (
              <Text style={[t.caption, { color: colors.fgSubtle }]}>
                {r.note}
              </Text>
            )}
          </View>
          <Text style={[t.footnote, tabular, { color: colors.fgMuted }]}>
            {hidden ? MASK : formatZec(r.v, 2)}
          </Text>
        </View>
      ))}
    </View>
  );
};

export const ShieldPrompt: React.FC<{
  onShield: () => void;
  hidden: boolean;
  compact?: boolean;
}> = ({ onShield, hidden, compact = false }) => {
  const { colors } = useTheme();
  const cur = useCurrency();
  const p = usePools();
  const [done, setDone] = useState(false);
  if (p.transparent <= 0) {
    return null;
  }
  return (
    <View
      style={{
        borderRadius: 16,
        padding: compact ? 12 : 16,
        backgroundColor: '#ffffff0a',
        gap: 12,
      }}
    >
      <Text style={[t.footnote, { color: colors.fgMuted }]}>
        {done
          ? 'Shielding sent. These funds become private after it confirms.'
          : `${hidden ? 'Some funds are' : `${formatZec(p.transparent, 4)} ${cur} is`} transparent. Anyone can see ${hidden ? 'them' : 'it'} on chain.`}
      </Text>
      {done ? (
        <View style={t.row}>
          <CircleCheck size={16} color={colors.fgSuccess} strokeWidth={2} />
          <Text style={[t.footnote, { color: colors.fgSuccess }]}>
            Shielding in progress
          </Text>
        </View>
      ) : (
        <PillButton
          label="Shield now"
          height={36}
          icon={
            <ShieldCheck size={15} color={colors.fgDefault} strokeWidth={2} />
          }
          onPress={() => {
            setDone(true);
            onShield();
          }}
        />
      )}
    </View>
  );
};

export const NetworkModule: React.FC = () => {
  const { colors } = useTheme();
  const { indexerServer, info } = useContext(ContextAppLoaded);
  const sync = useSync();
  return (
    <View style={{ gap: 8 }}>
      <SyncLine />
      <View style={t.row}>
        <Server size={13} color={colors.fgSubtle} strokeWidth={2} />
        <Text
          numberOfLines={1}
          style={[t.caption, { color: colors.fgSubtle, flex: 1 }]}
        >
          {(indexerServer?.uri || info.serverUri || '').replace(
            /^https?:\/\//,
            '',
          )}
          {sync.done
            ? '  ·  balances are current'
            : '  ·  balances may be out of date'}
        </Text>
      </View>
    </View>
  );
};

type Range = '1M' | '3M' | 'All';
export const RANGES: { key: Range; label: string }[] = [
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: 'All', label: 'All' },
];
const RANGE_DAYS: Record<Range, number> = { '1M': 30, '3M': 90, All: 120 };

export const usePrice = (days: number) => {
  const { zecPrice } = useContext(ContextAppLoaded);
  const series = priceHistory.slice(-(days + 1));
  const now = zecPrice?.zecPrice ?? series[series.length - 1];
  const day = priceHistory[priceHistory.length - 2];
  return {
    series,
    now,
    change: (now - series[0]) / series[0],
    dayChange: (now - day) / day,
  };
};

export const PriceChip: React.FC = () => {
  const { colors } = useTheme();
  const cur = useCurrency();
  const p = usePrice(7);
  const up = p.dayChange >= 0;
  const c = up ? colors.fgSuccess : colors.fgDanger;
  return (
    <View style={[t.row, { gap: 10 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[t.caption, { color: colors.fgSubtle }]}>{cur} price</Text>
        <Text style={[t.subheadline, tabular, { color: colors.fgDefault }]}>
          {formatFiat(p.now)}{' '}
          <Text style={{ color: c, fontSize: 13 }}>
            {up ? '+' : '−'}
            {(Math.abs(p.dayChange) * 100).toFixed(1)}% today
          </Text>
        </Text>
      </View>
      <Sparkline
        data={p.series}
        width={72}
        height={28}
        color={c}
        fill={false}
        strokeWidth={1.5}
      />
    </View>
  );
};

export const holdingsSeries = (
  transfers: ValueTransferType[],
  current: number,
  days: number,
) => {
  const nowSec = Date.now() / 1000;
  const deltas = transfers.map(vt => {
    const f = flowOf(vt);
    const d =
      f === 'in' && vt.kind !== 'WithdrawBond'
        ? vt.amount
        : f === 'out'
          ? -(vt.amount + (vt.fee ?? 0))
          : -(vt.fee ?? 0);
    return { time: vt.time, d };
  });
  const out: number[] = [];
  for (let i = days; i >= 0; i--) {
    const cut = nowSec - i * 86400;
    const later = deltas.filter(x => x.time > cut).reduce((a, x) => a + x.d, 0);
    out.push(Math.max(0, current - later));
  }
  return out;
};

export const HoldingsChart: React.FC<{
  transfers: ValueTransferType[];
  width: number;
  height: number;
  hidden: boolean;
}> = ({ transfers, width, height, hidden }) => {
  const { colors } = useTheme();
  const cur = useCurrency();
  const p = usePools();
  const s = useStaking();
  const [unit, setUnit] = useState<'zec' | 'usd'>('zec');
  const [range, setRange] = useState<Range>('3M');
  const days = RANGE_DAYS[range];
  const holdings = p.total + s.staked + s.unbondingAmt;
  const zec = useMemo(
    () => holdingsSeries(transfers, holdings, days),
    [transfers, holdings, days],
  );
  const prices = priceHistory.slice(-(days + 1));
  const series = unit === 'zec' ? zec : zec.map((v, i) => v * prices[i]);
  const first = series[0];
  const last = series[series.length - 1];
  const up = last >= first;
  const fmt = (v: number) =>
    unit === 'zec' ? `${formatZec(v, 2)} ${cur}` : formatFiat(v);
  const since = moment()
    .subtract(days, 'days')
    .format(days > 60 ? 'MMMM' : 'MMM D');
  return (
    <View style={{ width }}>
      <View
        style={[
          t.row,
          { justifyContent: 'space-between', alignItems: 'flex-start' },
        ]}
      >
        <View>
          <Text
            style={[t.footnote, { color: colors.fgSubtle, fontWeight: '600' }]}
          >
            Total holdings, including staked
          </Text>
          <Text
            style={[
              tabular,
              {
                color: colors.fgDefault,
                fontSize: 28,
                fontWeight: '600',
                letterSpacing: -0.5,
                marginTop: 2,
              },
            ]}
          >
            {hidden ? MASK : fmt(last)}
          </Text>
          <Text
            style={[
              t.footnote,
              tabular,
              { color: up ? colors.fgSuccess : colors.fgDanger },
            ]}
          >
            {hidden
              ? ' '
              : `${up ? 'Up' : 'Down'} ${fmt(Math.abs(last - first))} since ${since}`}
          </Text>
        </View>
        <View style={[t.row, { gap: 8 }]}>
          <Segmented
            items={[
              { key: 'zec' as const, label: cur },
              { key: 'usd' as const, label: 'USD' },
            ]}
            value={unit}
            onChange={setUnit}
            width={116}
          />
          <Segmented
            items={RANGES}
            value={range}
            onChange={setRange}
            width={132}
          />
        </View>
      </View>
      <View style={{ marginTop: 12, opacity: hidden ? 0.25 : 1 }}>
        <Sparkline
          data={series}
          width={width}
          height={height}
          color={unit === 'zec' ? gold : colors.fgSuccess}
        />
      </View>
    </View>
  );
};

export const weeklyFlows = (transfers: ValueTransferType[], weeks = 8) => {
  const start = moment().startOf('isoWeek');
  const data: BarDatum[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const from = start.clone().subtract(w, 'weeks');
    const to = from.clone().add(1, 'week');
    let a = 0;
    let b = 0;
    transfers.forEach(vt => {
      const d = at(vt);
      if (d.isSameOrAfter(from) && d.isBefore(to)) {
        const f = flowOf(vt);
        if (f === 'in') {
          a += vt.amount;
        } else if (f === 'out') {
          b += vt.amount;
        }
      }
    });
    data.push({ label: w === 0 ? 'Now' : from.format('MMM D'), a, b });
  }
  return data;
};

export const monthWeeks = (
  transfers: ValueTransferType[],
  month: moment.Moment,
) => {
  const data: BarDatum[] = [];
  const end = month.clone().endOf('month');
  let from = month.clone().startOf('month');
  while (from.isBefore(end)) {
    const to = moment.min(
      from.clone().add(7, 'days'),
      end.clone().add(1, 'ms'),
    );
    let a = 0;
    let b = 0;
    transfers.forEach(vt => {
      const d = at(vt);
      if (d.isSameOrAfter(from) && d.isBefore(to)) {
        const f = flowOf(vt);
        if (f === 'in') {
          a += vt.amount;
        } else if (f === 'out') {
          b += vt.amount;
        }
      }
    });
    data.push({
      label: `${from.format('D')}–${to.clone().subtract(1, 'ms').format('D')}`,
      a,
      b,
      muted: from.isAfter(moment()),
    });
    from = to;
  }
  return data;
};

export const monthTotals = (
  transfers: ValueTransferType[],
  month = moment(),
) => {
  let inflow = 0;
  let outflow = 0;
  let count = 0;
  transfers.forEach(vt => {
    if (at(vt).isSame(month, 'month')) {
      count += 1;
      const f = flowOf(vt);
      if (f === 'in') {
        inflow += vt.amount;
      } else if (f === 'out') {
        outflow += vt.amount + (vt.fee ?? 0);
      }
    }
  });
  return { inflow, outflow, net: inflow - outflow, count };
};

export const FlowStats: React.FC<{
  inflow: number;
  outflow: number;
  hidden: boolean;
  size?: number;
}> = ({ inflow, outflow, hidden, size = 20 }) => {
  const { colors } = useTheme();
  const net = inflow - outflow;
  const stat = (label: string, value: string, color: string) => (
    <View style={{ flex: 1 }}>
      <Text style={[t.caption, { color: colors.fgSubtle }]}>{label}</Text>
      <Text
        style={[
          tabular,
          { color, fontSize: size, fontWeight: '600', marginTop: 2 },
        ]}
      >
        {hidden ? MASK : value}
      </Text>
    </View>
  );
  return (
    <View style={[t.row, { gap: 16 }]}>
      {stat('Received', `+${formatZec(inflow, 2)}`, colors.fgSuccess)}
      {stat('Spent', `−${formatZec(outflow, 2)}`, colors.fgDefault)}
      {stat(
        'Net',
        `${net >= 0 ? '+' : '−'}${formatZec(net, 2)}`,
        colors.fgMuted,
      )}
    </View>
  );
};

export const FlowBars: React.FC<{
  data: BarDatum[];
  width: number;
  height: number;
  hidden: boolean;
}> = ({ data, width, height, hidden }) => {
  const { colors } = useTheme();
  return (
    <View style={{ opacity: hidden ? 0.25 : 1 }}>
      <Bars
        data={data}
        width={width}
        height={height}
        colorA={colors.fgSuccess}
        colorB="#5a5a5e"
        labelColor={colors.fgSubtle}
      />
    </View>
  );
};

export const useStaking = () => {
  const { walletBonds, globalStaked, totalBalance } =
    useContext(ContextAppLoaded);
  const bonds = walletBonds ?? [];
  const active = bonds.filter(b => b.status === WalletBondsStatusEnum.Active);
  const unbonding = bonds.filter(
    b => b.status === WalletBondsStatusEnum.Unbonding,
  );
  const byFinalizer = new Map<string, number>();
  active.forEach(b =>
    byFinalizer.set(
      b.finalizer,
      (byFinalizer.get(b.finalizer) ?? 0) + b.amount,
    ),
  );
  const positions = [...byFinalizer.entries()].map(([finalizer, amount]) => {
    const weight =
      (globalStaked ?? []).find(g => g.finalizer === finalizer)?.votingPower ??
      0;
    return {
      finalizer,
      name: finalizerNames[finalizer] ?? `${finalizer.slice(0, 8)}…`,
      amount,
      weight,
      active: stakingSchedule.activeSet[finalizer] ?? false,
    };
  });
  return {
    positions,
    staked: active.reduce((a, b) => a + b.amount, 0),
    unbonding,
    unbondingAmt: unbonding.reduce((a, b) => a + b.amount, 0),
    spendable: totalBalance?.totalSpendableBalance ?? 0,
    nextStakingDay: moment(stakingSchedule.nextStakingDay),
    claimableAt: moment(stakingSchedule.claimableAt),
    rewards: stakingSchedule.rewardsSoFar,
    commission: stakingSchedule.commission,
    epochRewards: stakingSchedule.epochRewards,
  };
};

export const StakingSummary: React.FC<{ hidden: boolean }> = ({ hidden }) => {
  const { colors } = useTheme();
  const cur = useCurrency();
  const s = useStaking();
  return (
    <View style={{ gap: 14 }}>
      <View style={[t.row, { gap: 16 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[t.caption, { color: colors.fgSubtle }]}>Staked</Text>
          <Text
            style={[
              tabular,
              { color: colors.fgDefault, fontSize: 22, fontWeight: '600' },
            ]}
          >
            {hidden ? MASK : formatZec(s.staked, 2)}
            <Text style={{ color: colors.fgSubtle, fontSize: 13 }}> {cur}</Text>
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[t.caption, { color: colors.fgSubtle }]}>
            Earned so far
          </Text>
          <Text
            style={[
              tabular,
              { color: colors.fgSuccess, fontSize: 22, fontWeight: '600' },
            ]}
          >
            {hidden ? MASK : `+${formatZec(s.rewards, 4)}`}
          </Text>
        </View>
      </View>
      <View style={[t.row, { gap: 10 }]}>
        <CalendarClock size={16} color={stakeBlue} strokeWidth={2} />
        <Text style={[t.footnote, { color: colors.fgMuted, flex: 1 }]}>
          Next staking day{' '}
          <Text style={{ color: colors.fgDefault, fontWeight: '600' }}>
            {s.nextStakingDay.format('ddd, MMM D')}
          </Text>{' '}
          ({s.nextStakingDay.fromNow()})
        </Text>
      </View>
      {s.unbonding.length > 0 && (
        <View style={[t.row, { gap: 10 }]}>
          <Hourglass size={16} color={unbondAmber} strokeWidth={2} />
          <Text
            style={[t.footnote, tabular, { color: colors.fgMuted, flex: 1 }]}
          >
            {hidden ? MASK : `${formatZec(s.unbondingAmt, 2)} ${cur}`} claimable{' '}
            <Text style={{ color: colors.fgDefault, fontWeight: '600' }}>
              {s.claimableAt.format('MMM D')}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
};

export const AllocationBar: React.FC<{ hidden: boolean }> = ({ hidden }) => {
  const { colors } = useTheme();
  const s = useStaking();
  const rows = [
    { k: 'Spendable', v: s.spendable, c: colors.fgDefault },
    { k: 'Staked', v: s.staked, c: stakeBlue },
    { k: 'Unstaking', v: s.unbondingAmt, c: unbondAmber },
  ];
  return (
    <View style={{ gap: 10 }}>
      <StackBar
        height={10}
        segments={rows.map(r => ({ value: r.v, color: r.c }))}
      />
      <View style={[t.row, { gap: 16 }]}>
        {rows.map(r => (
          <View key={r.k} style={[t.row, { gap: 6 }]}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: r.c,
              }}
            />
            <Text style={[t.caption, tabular, { color: colors.fgMuted }]}>
              {r.k} {hidden ? '' : formatZec(r.v, 2)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const FinalizerList: React.FC<{ hidden: boolean }> = ({ hidden }) => {
  const { colors } = useTheme();
  const cur = useCurrency();
  const s = useStaking();
  return (
    <View>
      {s.positions.map((p, i) => (
        <View
          key={p.finalizer}
          style={{
            paddingVertical: 12,
            borderTopWidth: i === 0 ? 0 : 0.5,
            borderTopColor: '#2a2a2c',
            gap: 4,
          }}
        >
          <View style={[t.row, { justifyContent: 'space-between' }]}>
            <View style={[t.row, { gap: 8 }]}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#0091FF26',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{ color: stakeBlue, fontSize: 13, fontWeight: '700' }}
                >
                  {p.name.slice(0, 1)}
                </Text>
              </View>
              <Text
                style={[
                  t.subheadline,
                  { color: colors.fgDefault, fontWeight: '600' },
                ]}
              >
                {p.name}
              </Text>
            </View>
            <Text style={[t.subheadline, tabular, { color: colors.fgDefault }]}>
              {hidden ? MASK : `${formatZec(p.amount, 2)} ${cur}`}
            </Text>
          </View>
          <Text
            style={[
              t.caption,
              tabular,
              { color: colors.fgSubtle, marginLeft: 36 },
            ]}
          >
            {p.active ? 'In active set' : 'Not in active set'} ·{' '}
            {(s.commission * 100).toFixed(0)}% commission ·{' '}
            {p.weight.toLocaleString('en-US')} {cur} total stake
          </Text>
        </View>
      ))}
    </View>
  );
};

export const RewardBars: React.FC<{
  width: number;
  height: number;
  hidden: boolean;
}> = ({ width, height, hidden }) => {
  const { colors } = useTheme();
  const s = useStaking();
  const data = s.epochRewards.map((v, i) => ({
    label: i === s.epochRewards.length - 1 ? 'Last' : `E${i + 1}`,
    a: v,
  }));
  return (
    <View style={{ opacity: hidden ? 0.25 : 1 }}>
      <Bars
        data={data}
        width={width}
        height={height}
        colorA={stakeBlue}
        labelColor={colors.fgSubtle}
      />
    </View>
  );
};

export const PendingList: React.FC<{
  transfers: ValueTransferType[];
  hidden: boolean;
  onOpen?: (vt: ValueTransferType) => void;
}> = ({ transfers, hidden, onOpen }) => {
  const { colors } = useTheme();
  const pending = transfers.filter(isPending);
  if (!pending.length) {
    return (
      <Text style={[t.footnote, { color: colors.fgSubtle }]}>
        Nothing waiting. Every transaction is confirmed.
      </Text>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {pending.map(vt => (
        <Pressable
          key={vt.txid}
          onPress={() => onOpen?.(vt)}
          style={({ pressed }) => [
            t.row,
            {
              gap: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: pressed ? '#ffffff14' : '#ffffff0a',
            },
          ]}
        >
          <Hourglass size={15} color={colors.fgWarning} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={[t.footnote, { color: colors.fgDefault }]}
            >
              {(vt.address && recipientNames[vt.address]) || 'Outgoing payment'}
            </Text>
            <Text style={[t.caption, { color: colors.fgWarning }]}>
              Confirming · {at(vt).fromNow()}
            </Text>
          </View>
          <Text style={[t.footnote, tabular, { color: colors.fgDefault }]}>
            {hidden ? MASK : `−${formatZec(vt.amount)}`}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

export const frequentRecipients = (
  transfers: ValueTransferType[],
  n = 5,
  month?: moment.Moment,
) => {
  const map = new Map<
    string,
    {
      address: string;
      name: string;
      count: number;
      total: number;
      last: number;
    }
  >();
  transfers.forEach(vt => {
    if (flowOf(vt) !== 'out' || !vt.address) {
      return;
    }
    if (month && !at(vt).isSame(month, 'month')) {
      return;
    }
    const e = map.get(vt.address) ?? {
      address: vt.address,
      name: recipientNames[vt.address] ?? `${vt.address.slice(0, 8)}…`,
      count: 0,
      total: 0,
      last: 0,
    };
    e.count += 1;
    e.total += vt.amount;
    e.last = Math.max(e.last, vt.time);
    map.set(vt.address, e);
  });
  return [...map.values()].sort((a, b) => b.last - a.last).slice(0, n);
};

const AVATAR = [
  '#1c78d2',
  '#8e5cd9',
  '#d9825c',
  '#3aa57a',
  '#c2477a',
  '#5c8fd9',
];

export const Avatar: React.FC<{ name: string; size?: number }> = ({
  name,
  size = 44,
}) => {
  const initials = name
    .split(' ')
    .filter(w => /[A-Za-z]/.test(w[0] ?? ''))
    .slice(0, 2)
    .map(w => w[0])
    .join('');
  const color = AVATAR[name.length % AVATAR.length];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}33`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: size * 0.36, fontWeight: '700' }}>
        {initials}
      </Text>
    </View>
  );
};

export const Recipients: React.FC<{
  transfers: ValueTransferType[];
  onSend: () => void;
  month?: moment.Moment;
  hidden: boolean;
}> = ({ transfers, onSend, month, hidden }) => {
  const { colors } = useTheme();
  const list = frequentRecipients(transfers, 5, month);
  if (!list.length) {
    return (
      <Text style={[t.footnote, { color: colors.fgSubtle }]}>
        No payments this month.
      </Text>
    );
  }
  return (
    <View style={[t.row, { gap: 16, alignItems: 'flex-start' }]}>
      {list.map(r => (
        <Pressable
          key={r.address}
          onPress={onSend}
          accessibilityLabel={`Send to ${r.name}`}
          style={({ pressed }) => ({
            width: 64,
            alignItems: 'center',
            gap: 6,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          })}
        >
          <Avatar name={r.name} />
          <Text
            numberOfLines={1}
            style={[t.caption, { color: colors.fgMuted, textAlign: 'center' }]}
          >
            {r.name.split(' ').slice(0, 2).join(' ')}
          </Text>
          {!!month && (
            <Text
              style={[
                t.caption,
                tabular,
                { color: colors.fgSubtle, fontSize: 11 },
              ]}
            >
              {hidden ? MASK : formatZec(r.total, 2)}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
};
