import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import ClockActiveWithCheck from '../../assets/icons/clock-active-with-check.svg';
import TriangleYellow from '../../assets/icons/triangle-yellow.svg';
import { useAppLoadedWallet } from '../../app/context';
import RegText from '../Components/RegText';
import { formatSeconds } from '../../app/utils/Utils';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { duration, radiusPill, text, useTheme } from '../../app/theme';

const TAG_HEIGHT = 50;
const COLLAPSED_SIZE = 52;
const EXPANDED_WIDTH = 210;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CENTER_LEFT = (SCREEN_WIDTH - EXPANDED_WIDTH) / 2;

const StakingDayBubble: React.FC = () => {
  const { colors } = useTheme();
  const {
    stakingDay,
    timeToStakingDaySeconds: timeToStakingDay,
    timeLeftStakingDaySeconds: timeLeftStakingDay,
  } = useAppLoadedWallet();

  const [expanded, setExpanded] = useState(false);
  const [anchorX, setAnchorX] = useState(0);

  const rightAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.25)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(-8)).current;

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

  const isCalculating = useMemo(() => {
    const value = stakingDay ? timeLeftStakingDay : timeToStakingDay;
    return value === 0;
  }, [stakingDay, timeLeftStakingDay, timeToStakingDay]);

  const mainValue = stakingDay
    ? formatSeconds(timeLeftStakingDay)
    : formatSeconds(timeToStakingDay);
  const title = stakingDay ? 'Staking day active' : 'Staking day inactive';
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
            <RegText
              numberOfLines={1}
              ellipsizeMode="clip"
              style={isCalculating ? text.caption2 : text.subheadline}
            >
              {isCalculating ? 'calculating...' : mainValue}
            </RegText>

            <RegText
              numberOfLines={1}
              style={[text.caption1, { color: colors.fgMuted }]}
            >
              {title}
            </RegText>
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
