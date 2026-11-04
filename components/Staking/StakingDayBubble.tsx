import React, { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  View,
  useAnimatedValue,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import ClockActiveWithCheck from '../../assets/icons/clock-active-with-check.svg';
import TriangleYellow from '../../assets/icons/triangle-yellow.svg';
import { useWalletData } from '../../app/store';
import StakingDayCountdownText from './components/StakingDayCountdownText';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { duration, radiusPill, useTheme } from '../../app/theme';

const TAG_HEIGHT = 50;
const COLLAPSED_SIZE = 52;
const EXPANDED_WIDTH = 210;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CENTER_LEFT = (SCREEN_WIDTH - EXPANDED_WIDTH) / 2;

const StakingDayBubble: React.FC = () => {
  const { colors } = useTheme();
  const { stakingDay } = useWalletData();
  const focused = useIsFocused();

  const [expanded, setExpanded] = useState(false);
  const [anchorX, setAnchorX] = useState(0);

  const rightAnim = useAnimatedValue(0);
  const scaleAnim = useAnimatedValue(0.25);
  const opacityAnim = useAnimatedValue(0);
  const contentOpacity = useAnimatedValue(0);
  const contentTranslate = useAnimatedValue(-8);

  const anchorCenterX = anchorX + COLLAPSED_SIZE / 2;
  const expandedStartLeft = anchorCenterX - EXPANDED_WIDTH / 2;

  useEffect(() => {
    if (expanded) {
      rightAnim.setValue(expandedStartLeft);
      scaleAnim.setValue(COLLAPSED_SIZE / EXPANDED_WIDTH);
      opacityAnim.setValue(1);
      contentOpacity.setValue(0);
      contentTranslate.setValue(-8);

      Animated.parallel([
        Animated.timing(rightAnim, {
          toValue: CENTER_LEFT,
          duration: duration.enter,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: duration.enter,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 180,
          delay: 80,
          useNativeDriver: false,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 90,
          useNativeDriver: false,
        }),
        Animated.timing(contentTranslate, {
          toValue: -8,
          duration: 120,
          useNativeDriver: false,
        }),
        Animated.timing(rightAnim, {
          toValue: expandedStartLeft,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: COLLAPSED_SIZE / EXPANDED_WIDTH,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 140,
          delay: 80,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [
    expanded,
    expandedStartLeft,
    rightAnim,
    scaleAnim,
    opacityAnim,
    contentOpacity,
    contentTranslate,
  ]);

  // Status as a flat tint: DESIGN.md forbids gradients.
  const bubbleTint = stakingDay ? colors.bgSuccessTint : colors.bgWarningTint;

  return (
    <View
      style={styles.root}
      onLayout={e => {
        setAnchorX(e.nativeEvent.layout.x);
      }}
    >
      {/* Small bubble */}
      <Pressable
        onPress={() => setExpanded(prev => !prev)}
        style={styles.anchorPressable}
      >
        <View style={[styles.smallBubble, { backgroundColor: bubbleTint }]}>
          {expanded ? (
            <FontAwesomeIcon icon={faXmark} size={22} color={colors.fgMuted} />
          ) : stakingDay ? (
            <ClockActiveWithCheck width={28} height={28} />
          ) : (
            <TriangleYellow width={28} height={28} />
          )}
        </View>
      </Pressable>

      {/* Expanded bubble */}
      <Animated.View
        pointerEvents={expanded ? 'auto' : 'none'}
        style={[
          styles.expandedLayer,
          {
            right: rightAnim,
            opacity: opacityAnim,
            transform: [{ scaleX: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.expandedBubble, { backgroundColor: bubbleTint }]}>
          <View style={styles.expandedIconWrapper}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    height: TAG_HEIGHT,
    justifyContent: 'center',
  },

  anchorPressable: {
    width: COLLAPSED_SIZE,
    height: COLLAPSED_SIZE,
    zIndex: 3,
  },

  smallBubble: {
    width: COLLAPSED_SIZE,
    height: COLLAPSED_SIZE,
    borderRadius: radiusPill,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  expandedLayer: {
    position: 'absolute',
    top: 0,
    width: EXPANDED_WIDTH,
    height: TAG_HEIGHT,
    zIndex: 2,
  },

  expandedBubble: {
    width: EXPANDED_WIDTH,
    height: TAG_HEIGHT,
    borderRadius: radiusPill,
    justifyContent: 'center',
    overflow: 'hidden',
  },

  expandedIconWrapper: {
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

export default React.memo(StakingDayBubble);
