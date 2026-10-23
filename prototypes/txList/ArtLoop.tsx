/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Image, View } from 'react-native';
import Animated, {
  CSSAnimationProperties,
  steps,
  useReducedMotion,
} from 'react-native-reanimated';

import { ART, ArtKey } from './TxList';
import { FPS_OPTIONS, LOOPS, LOOP_SECONDS, LoopFps } from './art/loops/index';

export const DEFAULT_FPS: LoopFps = 8;

/** Snaps any requested rate to a sheet that exists. */
export const nearestFps = (fps: number): LoopFps =>
  FPS_OPTIONS.reduce((best, f) =>
    Math.abs(f - fps) < Math.abs(best - fps) ? f : best,
  );

/**
 * Plays a pre-rendered chalk loop by stepping a grid sprite sheet through
 * a window: rows step over the whole cycle, columns step within each row.
 * The cycle is always LOOP_SECONDS; `fps` picks a sheet with more or fewer
 * frames in it. `still` and reduced motion show the single frame instead.
 */
const ArtLoop: React.FC<{
  art: ArtKey;
  size?: number;
  still?: boolean;
  fps?: number;
}> = ({ art, size = 200, still = false, fps = DEFAULT_FPS }) => {
  const reduced = useReducedMotion();
  const sheet = LOOPS[art]?.[nearestFps(fps)];
  if (!sheet || still || reduced) {
    return (
      <Image
        source={ART[art]}
        accessibilityIgnoresInvertColors
        style={{ width: size, height: size }}
      />
    );
  }
  const rows = sheet.frames / sheet.cols;
  const cycle = LOOP_SECONDS * 1000;
  const down: CSSAnimationProperties = {
    animationName: {
      from: { transform: [{ translateY: 0 }] },
      to: { transform: [{ translateY: -size * rows }] },
    },
    animationDuration: cycle,
    animationTimingFunction: steps(rows),
    animationIterationCount: 'infinite',
  };
  const across: CSSAnimationProperties = {
    animationName: {
      from: { transform: [{ translateX: 0 }] },
      to: { transform: [{ translateX: -size * sheet.cols }] },
    },
    animationDuration: cycle / rows,
    animationTimingFunction: steps(sheet.cols),
    animationIterationCount: 'infinite',
  };
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Animated.View key={`${art}-${sheet.frames}`} style={down}>
        <Animated.View style={across}>
          <Image
            source={sheet.source}
            accessibilityIgnoresInvertColors
            style={{ width: size * sheet.cols, height: size * rows }}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default ArtLoop;
