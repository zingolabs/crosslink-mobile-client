import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  useAnimatedValue,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { useWalletData } from '../../../app/store';
import StakingDayCountdownText from './StakingDayCountdownText';
import ClockActiveWithCheck from '../../../assets/icons/clock-active-with-check.svg';
import TriangleYellow from '../../../assets/icons/triangle-yellow.svg';
import { duration, radiusPill, useTheme } from '../../../app/theme';

type StakingDayStatusBarProps = {};

const TAG_HEIGHT = 50;
const COLLAPSED_WIDTH = 52;
const EXPANDED_WIDTH = 210;

const StakingDayStatusBar: React.FC<StakingDayStatusBarProps> = () => {
  const { colors } = useTheme();
  const { stakingDay } = useWalletData();
  const focused = useIsFocused();

  const [expanded, setExpanded] = useState(false);

  const widthAnim = useAnimatedValue(COLLAPSED_WIDTH);
  const contentOpacity = useAnimatedValue(0);
  const contentTranslate = useAnimatedValue(-8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
        duration: duration.list,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(contentOpacity, {
        toValue: expanded ? 1 : 0,
        duration: expanded ? 180 : 100,
        delay: expanded ? 70 : 0,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslate, {
        toValue: expanded ? 0 : -8,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [expanded, widthAnim, contentOpacity, contentTranslate]);

  return (
    <Pressable onPress={() => setExpanded(prev => !prev)}>
      <Animated.View style={[styles.wrapper, { width: widthAnim }]}>
        {/* Status as a flat tint: DESIGN.md forbids gradients. */}
        <View
          style={[
            styles.container,
            {
              backgroundColor: stakingDay
                ? colors.bgSuccessTint
                : colors.bgWarningTint,
            },
          ]}
        >
          <View style={styles.iconWrapper}>
            {stakingDay ? (
              <ClockActiveWithCheck width={28} height={28} />
            ) : (
              <TriangleYellow width={28} height={28} />
            )}
          </View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.textOverlay,
              {
                opacity: contentOpacity,
                transform: [{ translateX: contentTranslate }],
              },
            ]}
          >
            <StakingDayCountdownText active={expanded && focused} />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    height: TAG_HEIGHT,
    overflow: 'hidden',
  },
  container: {
    height: TAG_HEIGHT,
    borderTopLeftRadius: 0,
    borderTopRightRadius: radiusPill,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: radiusPill,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  iconWrapper: {
    position: 'absolute',
    left: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  textOverlay: {
    position: 'absolute',
    left: 50,
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default React.memo(StakingDayStatusBar);
