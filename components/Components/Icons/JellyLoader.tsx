import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  CSSAnimationProperties,
  useReducedMotion,
} from 'react-native-reanimated';

import { radiusPill, useTheme } from '../../../app/theme';

type JellyLoaderProps = {
  size?: number;
  color?: string;
  speed?: number;
};

const JellyLoader: React.FC<JellyLoaderProps> = ({
  size = 20,
  color,
  speed = 900,
}) => {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const blob = size / 2;
  const shift = blob * 0.75;
  const fill = color ?? colors.fgSubtle;

  const rotate: CSSAnimationProperties = {
    animationName: {
      0: { transform: [{ rotate: '0deg' }] },
      0.49999: { transform: [{ rotate: '0deg' }] },
      0.5: { transform: [{ rotate: '90deg' }] },
      0.99999: { transform: [{ rotate: '90deg' }] },
      1: { transform: [{ rotate: '0deg' }] },
    },
    animationDuration: reducedMotion ? 0 : speed * 2,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  };

  const shiftLeft: CSSAnimationProperties = {
    animationName: {
      0: { transform: [{ scale: 1 }, { translateX: 0 }] },
      0.5: { transform: [{ scale: 0.65 }, { translateX: -shift }] },
      1: { transform: [{ scale: 1 }, { translateX: 0 }] },
    },
    animationDuration: reducedMotion ? 0 : speed,
    animationTimingFunction: 'ease',
    animationIterationCount: 'infinite',
  };

  const shiftRight: CSSAnimationProperties = {
    ...shiftLeft,
    animationName: {
      0: { transform: [{ scale: 1 }, { translateX: 0 }] },
      0.5: { transform: [{ scale: 0.65 }, { translateX: shift }] },
      1: { transform: [{ scale: 1 }, { translateX: 0 }] },
    },
  };

  const blobStyle = {
    width: blob,
    height: blob,
    left: blob / 2,
    backgroundColor: fill,
  };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.frame, { width: size, height: blob }]}
    >
      <Animated.View style={[styles.container, rotate]}>
        <Animated.View style={[styles.blob, blobStyle, shiftLeft]} />
        <Animated.View style={[styles.blob, blobStyle, shiftRight]} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ rotate: '0deg' }],
  },
  blob: {
    position: 'absolute',
    top: 0,
    borderRadius: radiusPill,
    transform: [{ scale: 1 }, { translateX: 0 }],
  },
});

export default JellyLoader;
