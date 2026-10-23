/* eslint-disable react-native/no-inline-styles */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View } from 'react-native';
import Animated, {
  CSSAnimationProperties,
  CSSTransitionProperties,
  Easing,
  FadeIn,
  FadeInDown,
  LinearTransition,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import moment from 'moment';
import {
  ArrowDownLeft,
  ArrowUpRight,
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
  ValueTransferKindEnum as K,
  ValueTransferType,
} from '../../app/AppState';
import { useTheme } from '../../app/theme';
import { useAppLoadedSettings } from '../../app/context';
import JellyLoader from '../../components/Components/Icons/JellyLoader';
import { FeedItem, isPending } from './feed';

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const CSS_EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
export const PRESSED = 'rgba(255, 255, 255, 0.06)';
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };
export const MASK = '••••';

export const label = (vt: ValueTransferType) => {
  const pending = isPending(vt);
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
      return 'Sent to self';
    case K.CreateBond:
      return pending ? 'Staking' : 'Staked';
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

export const isIncoming = (vt: ValueTransferType) =>
  vt.kind === K.Received || vt.kind === K.WithdrawBond;

export const isOutgoing = (vt: ValueTransferType) =>
  vt.kind === K.Sent || vt.kind === K.CreateBond;

export const signOf = (vt: ValueTransferType) =>
  isIncoming(vt) ? '+' : isOutgoing(vt) ? '−' : '';

export const KindIcon: React.FC<{
  vt: ValueTransferType;
  size?: number;
  color: string;
}> = ({ vt, size = 18, color }) => {
  const props = { size, color, strokeWidth: 2 };
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

export const at = (vt: ValueTransferType) => moment(vt.time * 1000);

export const clock = (vt: ValueTransferType) => at(vt).format('H:mm');

export const dayTitle = (vt: ValueTransferType) => {
  const d = at(vt);
  const today = moment().startOf('day');
  if (d.isSameOrAfter(today)) {
    return 'Today';
  }
  if (d.isSameOrAfter(today.clone().subtract(1, 'day'))) {
    return 'Yesterday';
  }
  if (d.isSameOrAfter(today.clone().subtract(6, 'days'))) {
    return d.format('dddd');
  }
  if (d.isSame(today, 'year')) {
    return d.format('D MMMM');
  }
  return d.format('D MMMM YYYY');
};

export type Section<T> = { key: string; title: string; items: T[] };

export const byDay = <T extends ValueTransferType>(items: T[]) => {
  const out: Section<T>[] = [];
  items.forEach(vt => {
    const key = at(vt).format('YYYY-MM-DD');
    const last = out[out.length - 1];
    if (last && last.key === key) {
      last.items.push(vt);
    } else {
      out.push({ key, title: dayTitle(vt), items: [vt] });
    }
  });
  return out;
};

const ZATS = 1e8;
const DISPLAY_STEP_ZATS = 1e4;

/**
 * The reference app's rule: show four decimals, truncated, unless the
 * amount is smaller than the step, then show it whole. Never fewer than
 * two decimals.
 */
export const formatZec = (n: number) => {
  const zats = Math.round(Math.abs(n) * ZATS);
  const shown =
    zats < DISPLAY_STEP_ZATS
      ? zats
      : Math.trunc(zats / DISPLAY_STEP_ZATS) * DISPLAY_STEP_ZATS;
  const fixed = (shown / ZATS).toFixed(8);
  let [whole, frac = ''] = fixed.split('.');
  frac = frac.replace(/0+$/, '');
  if (frac.length < 2) {
    frac = frac.padEnd(2, '0');
  }
  whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${whole}.${frac}`;
};

/**
 * Motion for the list.
 *
 *   enter(i)   first paint: a short fade, staggered down the first rows
 *   arrive     a transaction that just landed: fade and settle from above
 *   layout     rows below the new one slide down instead of jumping
 *   highlight  the new row tints, then clears
 *   press      the row tints under the finger
 *
 * Reduced motion keeps the fades and the tint, drops every translation.
 */
export const useMotion = () => {
  const reduced = useReducedMotion();
  const { colors } = useTheme();
  return useMemo(() => {
    const enter = (i: number) =>
      reduced
        ? FadeIn.duration(160).delay(Math.min(i, 8) * 20)
        : FadeInDown.duration(200)
            .delay(Math.min(i, 8) * 24)
            .easing(EASE_OUT)
            .withInitialValues({
              opacity: 0,
              transform: [{ translateY: -6 }],
            });
    const arrive = reduced
      ? FadeIn.duration(200)
      : FadeInDown.duration(280)
          .easing(EASE_OUT)
          .withInitialValues({
            opacity: 0,
            transform: [{ translateY: -10 }, { scale: 0.98 }],
          });
    const layout = reduced
      ? undefined
      : LinearTransition.duration(260).easing(EASE_OUT);
    const highlight: CSSAnimationProperties = {
      animationName: {
        from: { backgroundColor: colors.bgAccentTint },
        '35%': { backgroundColor: colors.bgAccentTint },
        to: { backgroundColor: 'transparent' },
      },
      animationDuration: 1600,
      animationTimingFunction: 'ease-out',
      animationFillMode: 'both',
    };
    const press: CSSTransitionProperties = {
      transitionProperty: ['backgroundColor'],
      transitionDuration: 120,
      transitionTimingFunction: CSS_EASE_OUT,
    };
    return { reduced, enter, arrive, layout, highlight, press };
  }, [reduced, colors.bgAccentTint]);
};

export type Motion = ReturnType<typeof useMotion>;

const FRESH_FOR = 2400;

export const isFresh = (it: FeedItem) =>
  !!it.arrivedAt && Date.now() - it.arrivedAt < FRESH_FOR;

/**
 * One animated row. `index` is the first-paint stagger slot; a row that
 * arrives after first paint gets the arrival animation instead.
 */
export const Row: React.FC<{
  item: FeedItem;
  index: number;
  motion: Motion;
  mountedAt: number;
  children: React.ReactNode;
}> = ({ item, index, motion, mountedAt, children }) => {
  const arrived = !!item.arrivedAt && item.arrivedAt > mountedAt;
  const entering = useMemo(
    () => (arrived ? motion.arrive : motion.enter(index)),
    [arrived, motion, index],
  );
  return (
    <Animated.View entering={entering} layout={motion.layout}>
      {children}
    </Animated.View>
  );
};

/** The row surface: press tint, and the arrival tint for a fresh row. */
export const RowSurface: React.FC<{
  item: FeedItem;
  motion: Motion;
  onPress?: () => void;
  children: React.ReactNode;
}> = ({ item, motion, onPress, children }) => {
  const fresh = isFresh(item);
  return (
    <Pressable onPress={onPress} pressRetentionOffset={16}>
      {({ pressed }) => (
        <Animated.View
          style={[
            { backgroundColor: pressed ? PRESSED : 'transparent' },
            motion.press,
            fresh && motion.highlight,
          ]}
        >
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
};

/**
 * While confirmations are zero the row shows the wallet's loader, the same
 * one the onboarding indexer picker uses, in place of the time.
 */
export const Pending: React.FC<{ size?: number; lineHeight?: number }> = ({
  size = 18,
  lineHeight = 18,
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ height: lineHeight, justifyContent: 'center' }}>
      <JellyLoader size={size} color={colors.fgSubtle} />
    </View>
  );
};

/** ZEC figure. Tabular so a column of them lines up. Masked under privacy. */
export const Amount: React.FC<{
  vt: ValueTransferType;
  color: string;
}> = ({ vt, color }) => {
  const { privacy } = useAppLoadedSettings();
  const style: TextStyle = {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.41,
    flexShrink: 0,
    color,
    ...tabular,
  };
  return (
    <Text style={style} numberOfLines={1}>
      {privacy ? MASK : `${signOf(vt)}${formatZec(vt.amount)}`}
    </Text>
  );
};

export const styles = StyleSheet.create({
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
