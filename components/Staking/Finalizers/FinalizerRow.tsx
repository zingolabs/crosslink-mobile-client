import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';

import { StakeType } from '../../../app/AppState';
import {
  curve,
  duration,
  radiusPill,
  space,
  text,
  useTheme,
} from '../../../app/theme';
import Utils from '../../../app/utils';
import LifehashDisc from '../../Components/LifehashDisc';
import { formatBalance } from '../../Components/SummaryPanel';

export const FINALIZER_ROW_HEIGHT = 60;

const CSS_EASE_OUT = cubicBezier(curve[0], curve[1], curve[2], curve[3]);
const MASK = '••••';

type FinalizerRowProps = {
  stake: StakeType;
  detail: string;
  privacy: boolean;
  last: boolean;
  onPress: (finalizer: string) => void;
  share?: number;
  testID?: string;
};

const FinalizerRow: React.FC<FinalizerRowProps> = ({
  stake,
  detail,
  privacy,
  last,
  onPress,
  share,
  testID,
}) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  const amount = privacy ? MASK : formatBalance(stake.votingPower);
  const label = Utils.trimToSmall(stake.finalizer, 6);
  const barred = share !== undefined;
  const pct = barred ? Math.min(100, Math.max(0, share * 100)) : 0;
  const fill = `${pct}%` as `${number}%`;

  const press: CSSTransitionProperties = {
    transitionProperty: ['backgroundColor'],
    transitionDuration: reduced ? '0ms' : `${duration.press}ms`,
    transitionTimingFunction: CSS_EASE_OUT,
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${detail}${barred ? '' : `, ${amount}`}`}
      onPress={() => onPress(stake.finalizer)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
    >
      <Animated.View
        style={[
          styles.row,
          pressed
            ? [styles.rowIdle, { backgroundColor: colors.bgPress }]
            : styles.rowIdle,
          press,
        ]}
      >
        <LifehashDisc finalizer={stake.finalizer} size={36} />
        <View style={styles.body}>
          <Text
            numberOfLines={1}
            style={[text.body, { color: colors.fgDefault }]}
          >
            {label}
          </Text>
          {barred && (
            <View style={[styles.track, { backgroundColor: colors.bgFaint }]}>
              <View
                style={[
                  styles.fill,
                  { width: fill, backgroundColor: colors.bgAccent },
                ]}
              />
            </View>
          )}
          <Text style={[text.footnote, { color: colors.fgSubtle }]}>
            {detail}
          </Text>
        </View>
        {!barred && (
          <Text
            numberOfLines={1}
            style={[text.numeral, { color: colors.fgDefault }]}
          >
            {amount}
          </Text>
        )}
      </Animated.View>
      {!last && (
        <View
          style={[styles.hairline, { backgroundColor: colors.borderFaint }]}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: FINALIZER_ROW_HEIGHT,
    paddingHorizontal: 10,
    paddingVertical: space.sm,
  },
  rowIdle: {
    backgroundColor: 'transparent',
  },
  body: {
    flex: 1,
    gap: space.xs,
  },
  track: {
    height: 4,
    borderRadius: radiusPill,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radiusPill,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
});

export default React.memo(FinalizerRow);
