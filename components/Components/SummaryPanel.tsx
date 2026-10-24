import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';

import {
  useTheme,
  text,
  space,
  radiusCard,
  curve,
  duration,
} from '../../app/theme';

export const SUMMARY_RADIUS = radiusCard;

const HEADER_H = 44;
// Pre-rendered, dithered bgSurface->bgChrome ramp (scripts/build-panel-gradient.mjs).
// Android's gradient shader bands on this dark ramp; the PNG stretches smooth.
const PANEL_GRADIENT = require('../../assets/images/panel-gradient.png');
const EASE_OUT = cubicBezier(curve[0], curve[1], curve[2], curve[3]);
const MASK = '••••';
const ZATS = 1e8;
const DISPLAY_STEP_ZATS = 1e4;

/** Four decimals, truncated, never fewer than two; tiny amounts whole. */
export const formatBalance = (n: number) => {
  const zats = Math.round(Math.abs(n) * ZATS);
  const shown =
    zats < DISPLAY_STEP_ZATS
      ? zats
      : Math.trunc(zats / DISPLAY_STEP_ZATS) * DISPLAY_STEP_ZATS;
  let [whole, frac = ''] = (shown / ZATS).toFixed(8).split('.');
  frac = frac.replace(/0+$/, '');
  if (frac.length < 2) {
    frac = frac.padEnd(2, '0');
  }
  whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${whole}.${frac}`;
};

type IconActionProps = {
  title: string;
  icon: React.ReactNode;
  prominent?: boolean;
  onPress: () => void;
  testID?: string;
};

/** A 56pt circle with a caption. The prominent one carries the accent. */
export const IconAction: React.FC<IconActionProps> = ({
  title,
  icon,
  prominent = false,
  onPress,
  testID,
}) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const press: CSSTransitionProperties = {
    transitionProperty: ['transform'],
    transitionDuration: reduced ? '0ms' : `${duration.press}ms`,
    transitionTimingFunction: EASE_OUT,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={{ top: 8, left: 8, right: 8, bottom: 32 }}
      pressRetentionOffset={16}
      style={styles.action}
    >
      <Animated.View
        style={[
          styles.circle,
          { backgroundColor: prominent ? colors.bgAccent : colors.bgFaint },
          press,
          pressed && !reduced && styles.circlePressed,
        ]}
      >
        {icon}
      </Animated.View>
      <Text style={[text.caption, { color: colors.fgDefault }]}>{title}</Text>
    </Pressable>
  );
};

type SummaryPanelProps = {
  amount: number;
  unit: string;
  settled: boolean;
  connected: boolean;
  privacy: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  secondary?: React.ReactNode;
  actions: React.ReactNode;
  testID?: string;
};

/**
 * The raised summary card at the top of a tab. The list below scrolls
 * under its rounded bottom edge. The figure sits at 56pt with the unit
 * small beside it, dimmed with a spinner until the first sync settles.
 */
const SummaryPanel: React.FC<SummaryPanelProps> = ({
  amount,
  unit,
  settled,
  connected,
  privacy,
  leading,
  trailing,
  secondary,
  actions,
  testID,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const gradient = `linear-gradient(to bottom, ${colors.bgSurface}, ${colors.bgChrome})`;
  const figure = privacy ? MASK : formatBalance(amount);

  return (
    <View
      testID={testID}
      style={[
        styles.panel,
        {
          paddingTop: insets.top + HEADER_H + 20,
          backgroundColor: colors.bgSurface,
        },
        Platform.OS === 'android'
          ? null
          : Platform.OS === 'web'
            ? ({ backgroundImage: gradient } as object)
            : { experimental_backgroundImage: gradient },
      ]}
    >
      {Platform.OS === 'android' && (
        <Image
          source={PANEL_GRADIENT}
          resizeMode="stretch"
          style={styles.panelGradient}
        />
      )}
      <View style={[styles.bar, { top: insets.top }]}>
        <View style={styles.barSide}>{leading}</View>
        <View style={[styles.barSide, styles.barTrailing]}>{trailing}</View>
      </View>

      <View style={styles.figureRow}>
        <View style={styles.accessory} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={`${figure} ${unit}${settled ? '' : ', syncing'}`}
          style={[
            text.display,
            styles.figure,
            { color: colors.fgDefault },
            !settled && styles.unsettled,
          ]}
        >
          {figure}
          <Text
            style={[text.unit, { color: colors.fgMuted }]}
          >{` ${unit}`}</Text>
        </Text>
        <View style={styles.accessory}>
          {!connected ? (
            <WifiOff size={18} strokeWidth={2.2} color={colors.fgMuted} />
          ) : (
            !settled && <ActivityIndicator color={colors.fgMuted} />
          )}
        </View>
      </View>

      {secondary}

      <View style={styles.actions}>{actions}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    zIndex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: space.xxxl,
    borderBottomLeftRadius: SUMMARY_RADIUS,
    borderBottomRightRadius: SUMMARY_RADIUS,
    borderCurve: 'continuous',
    boxShadow: '0 6px 16px -10px rgba(0, 0, 0, 0.45)',
  },
  panelGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 16,
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'visible',
  },
  barSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  barTrailing: {
    justifyContent: 'flex-end',
  },
  figureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
  },
  accessory: {
    width: 28,
    alignItems: 'center',
  },
  figure: {
    flexShrink: 1,
  },
  unsettled: {
    opacity: 0.4,
  },
  actions: {
    flexDirection: 'row',
    gap: space.xl,
    marginTop: space.xxl,
  },
  action: {
    width: 72,
    alignItems: 'center',
    gap: space.sm,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: radiusCard,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 1 }],
  },
  circlePressed: {
    transform: [{ scale: 0.97 }],
  },
});

export default SummaryPanel;
