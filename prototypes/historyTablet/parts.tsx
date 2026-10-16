/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Check, Copy, Eye, X } from 'lucide-react-native';

import { ValueTransferType } from '../../app/AppState';
import { ContextAppLoaded } from '../../app/context';
import { fontFamily, useTheme } from '../../app/theme';
import {
  Flow,
  KindIcon,
  MASK,
  at,
  counterparty,
  flowOf,
  formatFiat,
  formatZec,
  gold,
  groupByMonth,
  isPending,
  kindColor,
  kindLabel,
  memoOf,
  nativeDriver,
  signOf,
  splitZec,
  spring,
  statusLabel,
  tabular,
  trimHash,
  useCopy,
  useKeys,
  useReducedMotion,
  useSync,
} from './shared';

export const HAIRLINE = '#1f1f21';
export const PANEL = '#121213';
export const CARD = '#161618';

export const t = StyleSheet.create({
  caption: { fontSize: 12, lineHeight: 16 },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
  subheadline: { fontSize: 15, lineHeight: 20, letterSpacing: -0.24 },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: 0.36,
  },
  rowTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.24,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export const PillButton: React.FC<{
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'plain';
  height?: number;
  style?: ViewStyle;
}> = ({ label, icon, onPress, tone = 'secondary', height = 44, style }) => {
  const { colors } = useTheme();
  const bg =
    tone === 'primary'
      ? colors.bgAccent
      : tone === 'secondary'
        ? colors.bgSurface
        : 'transparent';
  const fg =
    tone === 'primary'
      ? '#fff'
      : tone === 'secondary'
        ? colors.fgDefault
        : colors.fgMuted;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          height,
          borderRadius: height / 2,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: tone === 'plain' && pressed ? '#ffffff0f' : bg,
          transform: [{ scale: pressed && tone !== 'plain' ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {icon}
      <Text
        style={{
          color: fg,
          fontSize: height >= 44 ? 16 : 15,
          fontWeight: '600',
          letterSpacing: -0.32,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const BalanceFigure: React.FC<{
  value: number;
  hidden: boolean;
  size?: number;
  weight?: '200' | '300' | '400' | '500' | '600';
  rule?: boolean;
  color?: string;
}> = ({ value, hidden, size = 40, weight = '600', rule = false, color }) => {
  const { colors } = useTheme();
  const { info } = useContext(ContextAppLoaded);
  const [peek, setPeek] = useState(false);
  const masked = hidden && !peek;
  const b = splitZec(value);
  return (
    <Pressable
      disabled={!hidden}
      onLongPress={() => setPeek(true)}
      onPressOut={() => setPeek(false)}
      delayLongPress={250}
      accessibilityHint={hidden ? 'Press and hold to reveal' : undefined}
      style={{ alignSelf: 'flex-start' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text
          style={[
            tabular,
            {
              color: color ?? colors.fgDefault,
              fontSize: size,
              lineHeight: Math.round(size * 1.15),
              fontWeight: weight,
              letterSpacing: -size * 0.02,
            },
          ]}
        >
          {masked ? MASK : b.whole}
        </Text>
        {!masked && (
          <Text
            style={[
              tabular,
              {
                color: colors.fgMuted,
                fontSize: Math.round(size * 0.6),
                fontWeight: weight,
                letterSpacing: -size * 0.008,
              },
            ]}
          >
            .{b.frac}
          </Text>
        )}
        <Text
          style={{
            color: colors.fgSubtle,
            fontSize: Math.max(13, Math.round(size * 0.38)),
            fontWeight: '500',
            marginLeft: 6,
          }}
        >
          {info.currencyName || 'ZEC'}
        </Text>
      </View>
      {rule && (
        <View
          style={{ marginTop: 6, height: 5, justifyContent: 'space-between' }}
        >
          <View style={{ height: 1, backgroundColor: gold }} />
          <View style={{ height: 1, backgroundColor: gold }} />
        </View>
      )}
    </Pressable>
  );
};

export const SyncLine: React.FC<{ size?: number }> = ({ size = 13 }) => {
  const { colors } = useTheme();
  const { info } = useContext(ContextAppLoaded);
  const sync = useSync();
  return (
    <View style={t.row}>
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: sync.offline
            ? colors.fgDanger
            : sync.done
              ? colors.fgSuccess
              : colors.fgSyncing,
        }}
      />
      <Text style={[tabular, { color: colors.fgMuted, fontSize: size }]}>
        {sync.label}
        {sync.done && info.latestBlock
          ? `  ·  block ${info.latestBlock.toLocaleString('en-US')}`
          : ''}
      </Text>
    </View>
  );
};

export const HideToggle: React.FC<{
  hidden: boolean;
  onToggle: () => void;
}> = ({ hidden, onToggle }) => {
  const { colors } = useTheme();
  return (
    <View style={[t.row, { justifyContent: 'space-between' }]}>
      <View style={t.row}>
        <Eye size={16} color={colors.fgMuted} strokeWidth={2} />
        <Text style={[t.subheadline, { color: colors.fgMuted }]}>
          Hide amounts
        </Text>
      </View>
      <Switch
        value={hidden}
        onValueChange={onToggle}
        trackColor={{ false: colors.bgFaint, true: colors.bgAccent }}
        thumbColor="#fff"
      />
    </View>
  );
};

export type Filter = 'all' | 'in' | 'out' | 'stake';

export const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in', label: 'In' },
  { key: 'out', label: 'Out' },
  { key: 'stake', label: 'Staking' },
];

const matches = (f: Filter, flow: Flow) => f === 'all' || f === flow;

export const Segmented = <K extends string>({
  items,
  value,
  onChange,
  width,
}: {
  items: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  width: number;
}) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const segW = (width - 4) / items.length;
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const to = items.findIndex(i => i.key === value) * segW;
    if (reduced) {
      x.setValue(to);
    } else {
      Animated.spring(x, {
        toValue: to,
        ...spring(0.3),
        useNativeDriver: nativeDriver,
      }).start();
    }
  }, [value, items, segW, x, reduced]);
  return (
    <View
      style={{
        width,
        height: 32,
        padding: 2,
        borderRadius: 9,
        backgroundColor: '#1c1c1e',
        flexDirection: 'row',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: segW,
          height: 28,
          borderRadius: 7,
          backgroundColor: '#3a3a3c',
          transform: [{ translateX: x }],
        }}
      />
      {items.map(i => (
        <Pressable
          key={i.key}
          onPressIn={() => onChange(i.key)}
          onPress={() => onChange(i.key)}
          style={{
            width: segW,
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: value === i.key ? colors.fgDefault : colors.fgMuted,
              fontSize: 13,
              fontWeight: value === i.key ? '600' : '500',
            }}
          >
            {i.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

export const TxRow: React.FC<{
  vt: ValueTransferType;
  selected: boolean;
  hidden: boolean;
  onPress: () => void;
  onLayout?: (y: number) => void;
}> = React.memo(({ vt, selected, hidden, onPress, onLayout }) => {
  const { colors } = useTheme();
  const flow = flowOf(vt);
  const tint = kindColor(vt, flow === 'in' ? colors.fgSuccess : colors.fgMuted);
  const memo = memoOf(vt);
  return (
    <Pressable
      onLayout={e => onLayout?.(e.nativeEvent.layout.y)}
      onPress={onPress}
      style={({ pressed }) => ({
        marginHorizontal: 12,
        paddingHorizontal: 12,
        height: 60,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: selected
          ? colors.bgAccentTint
          : pressed
            ? '#ffffff0d'
            : 'transparent',
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1c1c1e',
        }}
      >
        <KindIcon
          vt={vt}
          size={17}
          color={isPending(vt) ? colors.fgWarning : tint}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={[t.rowTitle, { color: colors.fgDefault }]}
        >
          {kindLabel(vt)}
        </Text>
        <Text
          numberOfLines={1}
          style={[t.footnote, { color: colors.fgSubtle, marginTop: 2 }]}
        >
          {memo || counterparty(vt)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={[
            t.rowTitle,
            tabular,
            {
              color: flow === 'in' ? colors.fgSuccess : colors.fgDefault,
              fontWeight: '500',
            },
          ]}
        >
          {hidden ? MASK : `${signOf(vt)}${formatZec(vt.amount)}`}
        </Text>
        <Text
          style={[
            t.caption,
            tabular,
            {
              color: isPending(vt) ? colors.fgWarning : colors.fgSubtle,
              marginTop: 2,
            },
          ]}
        >
          {isPending(vt) ? statusLabel(vt) : at(vt).format('MMM D')}
        </Text>
      </View>
    </Pressable>
  );
});

export const ActivityList: React.FC<{
  transfers: ValueTransferType[];
  hidden: boolean;
  width: number;
  selected: string | null;
  onSelect: (vt: ValueTransferType) => void;
  title?: string;
  header?: React.ReactNode;
  showFilter?: boolean;
  keyboard?: boolean;
  paddingTop?: number;
  autoSelect?: boolean;
}> = ({
  transfers,
  hidden,
  width,
  selected,
  onSelect,
  title = 'Activity',
  header,
  showFilter = true,
  keyboard = true,
  paddingTop = 0,
  autoSelect = true,
}) => {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = useMemo(
    () => transfers.filter(vt => matches(filter, flowOf(vt))),
    [transfers, filter],
  );

  useEffect(() => {
    if (
      autoSelect &&
      filtered.length &&
      !filtered.some(vt => vt.txid === selected)
    ) {
      onSelect(filtered[0]);
    }
  }, [filtered, selected, onSelect, autoSelect]);

  const scroll = useRef<ScrollView>(null);
  const rowY = useRef(new Map<string, number>());
  const viewH = useRef(0);
  const scrollY = useRef(0);

  const reveal = useCallback((txid: string) => {
    const y = rowY.current.get(txid);
    if (y === undefined || !scroll.current) {
      return;
    }
    const top = scrollY.current + 44;
    const bottom = scrollY.current + viewH.current - 64;
    if (y < top) {
      scroll.current.scrollTo({ y: Math.max(0, y - 52), animated: true });
    } else if (y + 64 > bottom) {
      scroll.current.scrollTo({ y: y - viewH.current + 128, animated: true });
    }
  }, []);

  const move = useCallback(
    (delta: number) => {
      if (!filtered.length) {
        return;
      }
      const i = Math.max(
        0,
        filtered.findIndex(vt => vt.txid === selected),
      );
      const next =
        filtered[Math.min(filtered.length - 1, Math.max(0, i + delta))];
      onSelect(next);
      reveal(next.txid);
    },
    [filtered, selected, onSelect, reveal],
  );

  useKeys(
    useCallback(
      (e: KeyboardEvent) => {
        if (!keyboard) {
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          move(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          move(-1);
        }
      },
      [move, keyboard],
    ),
  );

  const groups = useMemo(() => groupByMonth(filtered), [filtered]);
  const flat: (
    | { t: 'h'; key: string; g: (typeof groups)[number] }
    | { t: 'r'; key: string; vt: ValueTransferType }
  )[] = [];
  const sticky: number[] = [];
  groups.forEach(g => {
    sticky.push(flat.length);
    flat.push({ t: 'h', key: `h-${g.key}`, g });
    g.items.forEach(vt => flat.push({ t: 'r', key: vt.txid, vt }));
  });

  return (
    <View style={{ width, flex: 1, paddingTop }}>
      <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
          <Text style={[t.title1, { color: colors.fgDefault }]}>{title}</Text>
          <Text style={[t.footnote, tabular, { color: colors.fgSubtle }]}>
            {filtered.length}{' '}
            {filtered.length === 1 ? 'transaction' : 'transactions'}
          </Text>
        </View>
        {header}
        {showFilter && (
          <View style={{ marginTop: 12 }}>
            <Segmented
              items={FILTERS}
              value={filter}
              onChange={setFilter}
              width={width - 48}
            />
          </View>
        )}
      </View>

      {flat.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 48,
          }}
        >
          <Text
            style={[
              t.subheadline,
              { color: colors.fgSubtle, textAlign: 'center' },
            ]}
          >
            Nothing here yet.
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scroll}
          stickyHeaderIndices={sticky}
          onLayout={(e: LayoutChangeEvent) => {
            viewH.current = e.nativeEvent.layout.height;
          }}
          onScroll={e => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 48 }}
        >
          {flat.map(item =>
            item.t === 'h' ? (
              <View
                key={item.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  paddingHorizontal: 24,
                  paddingTop: 16,
                  paddingBottom: 8,
                  backgroundColor: colors.bgCanvas,
                }}
              >
                <Text style={[t.headline, { color: colors.fgDefault }]}>
                  {item.g.date.format('MMMM')}
                  <Text style={{ color: colors.fgSubtle, fontWeight: '400' }}>
                    {' '}
                    {item.g.date.format('YYYY')}
                  </Text>
                </Text>
                {!hidden && item.g.inflow + item.g.outflow > 0 && (
                  <Text
                    style={[t.footnote, tabular, { color: colors.fgSubtle }]}
                  >
                    <Text style={{ color: colors.fgSuccess }}>
                      +{formatZec(item.g.inflow, 2)}
                    </Text>
                    {'   '}−{formatZec(item.g.outflow, 2)}
                  </Text>
                )}
              </View>
            ) : (
              <TxRow
                key={item.key}
                vt={item.vt}
                selected={item.vt.txid === selected}
                hidden={hidden}
                onPress={() => onSelect(item.vt)}
                onLayout={y => rowY.current.set(item.vt.txid, y)}
              />
            ),
          )}
        </ScrollView>
      )}
    </View>
  );
};

export const TxDetail: React.FC<{
  vt: ValueTransferType;
  hidden: boolean;
  compact?: boolean;
}> = ({ vt, hidden, compact = false }) => {
  const { colors } = useTheme();
  const { info } = useContext(ContextAppLoaded);
  const { copied, markCopied } = useCopy();
  const reduced = useReducedMotion();
  const fade = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start();
  }, [fade]);

  const flow = flowOf(vt);
  const tint = kindColor(vt, flow === 'in' ? colors.fgSuccess : colors.fgMuted);
  const memo = memoOf(vt);
  const amt = splitZec(vt.amount);
  const pending = isPending(vt);
  const currency = info.currencyName || 'ZEC';
  const big = compact ? 36 : 48;

  const copy = (key: string, value: string) => {
    Clipboard.setString(value);
    markCopied(key);
  };

  const fields: { k: string; v: string; copy?: string; mono?: boolean }[] = [
    { k: 'Date', v: at(vt).format('ddd, MMM D YYYY [at] h:mm A') },
  ];
  if (vt.address) {
    fields.push({
      k: flow === 'out' ? 'To' : 'Finalizer',
      v: counterparty(vt),
    });
    fields.push({
      k: 'Address',
      v: `${vt.address.slice(0, 10)}…${vt.address.slice(-8)}`,
      copy: vt.address,
      mono: true,
    });
  }
  if (vt.poolType) {
    fields.push({ k: 'Pool', v: vt.poolType });
  }
  if (vt.fee) {
    fields.push({ k: 'Network fee', v: `${formatZec(vt.fee)} ${currency}` });
  }
  fields.push({ k: 'Block', v: vt.blockheight.toLocaleString('en-US') });
  fields.push({
    k: 'Transaction ID',
    v: trimHash(vt.txid, 8),
    copy: vt.txid,
    mono: true,
  });

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: fade,
        transform: [
          {
            translateY: fade.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 0],
            }),
          },
        ],
      }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: compact ? 24 : 32,
          paddingTop: 20,
          paddingBottom: 48,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1c1c1e',
            }}
          >
            <KindIcon
              vt={vt}
              size={20}
              color={pending ? colors.fgWarning : tint}
            />
          </View>
          <View>
            <Text style={[t.headline, { color: colors.fgDefault }]}>
              {kindLabel(vt)}
            </Text>
            <Text
              style={[t.footnote, { color: colors.fgSubtle, marginTop: 2 }]}
            >
              {at(vt).fromNow()}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            marginTop: compact ? 20 : 28,
          }}
        >
          <Text
            style={[
              tabular,
              {
                color: flow === 'in' ? colors.fgSuccess : colors.fgDefault,
                fontSize: big,
                lineHeight: Math.round(big * 1.12),
                fontWeight: '300',
                letterSpacing: -big * 0.025,
              },
            ]}
          >
            {hidden ? MASK : `${signOf(vt)}${amt.whole}`}
          </Text>
          {!hidden && (
            <Text
              style={[
                tabular,
                {
                  color: flow === 'in' ? colors.fgSuccess : colors.fgMuted,
                  fontSize: Math.round(big * 0.58),
                  fontWeight: '300',
                },
              ]}
            >
              .{amt.frac}
            </Text>
          )}
          <Text style={{ color: colors.fgSubtle, fontSize: 17, marginLeft: 8 }}>
            {currency}
          </Text>
        </View>
        {!!vt.zecPrice && vt.amount > 0 && (
          <Text
            style={[
              t.subheadline,
              tabular,
              { color: colors.fgSubtle, marginTop: 4 },
            ]}
          >
            {hidden ? MASK : formatFiat(vt.amount * vt.zecPrice)} at the time
          </Text>
        )}

        <View style={[t.row, { marginTop: 16 }]}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: pending ? colors.fgWarning : colors.fgSuccess,
            }}
          />
          <Text style={[t.footnote, tabular, { color: colors.fgMuted }]}>
            {pending
              ? `${statusLabel(vt)} · waiting for confirmation`
              : `Confirmed · ${vt.confirmations.toLocaleString('en-US')} confirmations`}
          </Text>
        </View>

        {!!memo && (
          <View
            style={{
              marginTop: 28,
              paddingLeft: 14,
              borderLeftWidth: 2,
              borderLeftColor: gold,
            }}
          >
            <Text
              style={[t.caption, { color: colors.fgSubtle, marginBottom: 4 }]}
            >
              Memo
            </Text>
            <Text
              style={{
                color: colors.fgDefault,
                fontSize: 17,
                lineHeight: 24,
                letterSpacing: -0.41,
              }}
            >
              {memo}
            </Text>
          </View>
        )}

        <View
          style={{
            marginTop: 28,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: HAIRLINE,
          }}
        >
          {fields.map(f => (
            <View
              key={f.k}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: 44,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: HAIRLINE,
                gap: 12,
              }}
            >
              <Text
                style={[t.subheadline, { color: colors.fgSubtle, width: 112 }]}
              >
                {f.k}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  t.subheadline,
                  tabular,
                  {
                    flex: 1,
                    color: colors.fgDefault,
                    fontFamily: f.mono ? fontFamily.mono : undefined,
                    fontSize: f.mono ? 13 : 15,
                  },
                ]}
              >
                {f.v}
              </Text>
              {!!f.copy && (
                <Pressable
                  onPress={() => copy(f.k, f.copy!)}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    padding: 6,
                    borderRadius: 8,
                    backgroundColor: pressed ? '#ffffff14' : 'transparent',
                  })}
                  accessibilityLabel={`Copy ${f.k}`}
                >
                  {copied === f.k ? (
                    <Check
                      size={16}
                      color={colors.fgSuccess}
                      strokeWidth={2.4}
                    />
                  ) : (
                    <Copy size={16} color={colors.fgAccent} strokeWidth={2} />
                  )}
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );
};

export const useSelection = (transfers: ValueTransferType[]) => {
  const [selected, setSelected] = useState<string | null>(
    transfers[0]?.txid ?? null,
  );
  const current = transfers.find(vt => vt.txid === selected) ?? null;
  const onSelect = useCallback(
    (vt: ValueTransferType) => setSelected(vt.txid),
    [],
  );
  return { selected, current, onSelect, setSelected };
};

export const Inspector: React.FC<{
  vt: ValueTransferType | null;
  hidden: boolean;
  width: number;
  top: number;
  onClose: () => void;
}> = ({ vt, hidden, width, top, onClose }) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(vt ? 0 : 1)).current;
  const [shown, setShown] = useState<ValueTransferType | null>(vt);

  useEffect(() => {
    if (vt) {
      setShown(vt);
    }
    const anim = reduced
      ? Animated.timing(x, {
          toValue: vt ? 0 : 1,
          duration: 0,
          useNativeDriver: nativeDriver,
        })
      : Animated.spring(x, {
          toValue: vt ? 0 : 1,
          ...spring(0.35),
          useNativeDriver: nativeDriver,
        });
    anim.start(({ finished }) => {
      if (finished && !vt) {
        setShown(null);
      }
    });
  }, [vt, x, reduced]);

  useKeys(
    useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      },
      [onClose],
    ),
  );

  if (!shown) {
    return null;
  }
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        right: 0,
        bottom: 0,
        width,
        backgroundColor: '#141416',
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderLeftColor: '#ffffff1f',
        boxShadow: '-16px 0 40px rgba(0, 0, 0, 0.45)',
        opacity: reduced
          ? x.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
          : 1,
        transform: [
          {
            translateX: x.interpolate({
              inputRange: [0, 1],
              outputRange: [0, reduced ? 0 : width + 40],
            }),
          },
        ],
      }}
    >
      <View
        style={[
          t.row,
          {
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingTop: 16,
          },
        ]}
      >
        <Text style={[t.headline, { color: colors.fgDefault }]}>Details</Text>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityLabel="Close details"
          style={({ pressed }) => ({
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? '#3a3a3c' : '#2c2c2e',
          })}
        >
          <X size={15} color={colors.fgMuted} strokeWidth={2.6} />
        </Pressable>
      </View>
      <TxDetail key={shown.txid} vt={shown} hidden={hidden} compact />
    </Animated.View>
  );
};
