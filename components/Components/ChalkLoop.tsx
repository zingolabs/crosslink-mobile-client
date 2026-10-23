import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  CSSAnimationProperties,
  steps,
  useReducedMotion,
} from 'react-native-reanimated';

/**
 * Pre-rendered chalk loops, one grid sprite sheet each: a two-second
 * cycle at 24 fps, 48 frames, 8 per row. Rendered offline by
 * prototypes/txList/art/generate.mjs; nothing is drawn at runtime.
 */
const SHEETS = {
  orbit: {
    source: require('../../assets/art/orbit-24.png'),
    frames: 48,
    cols: 8,
  },
  pair: {
    source: require('../../assets/art/pair-24.png'),
    frames: 48,
    cols: 8,
  },
} as const;

export type ChalkLoopName = keyof typeof SHEETS;

const CYCLE_MS = 2000;

type ChalkLoopProps = {
  name: ChalkLoopName;
  size?: number;
};

/**
 * Steps the sheet through a window: rows step over the whole cycle and
 * columns step within each row. Reduced motion holds the first frame.
 */
const ChalkLoop: React.FC<ChalkLoopProps> = ({ name, size = 200 }) => {
  const reduced = useReducedMotion();
  const sheet = SHEETS[name];
  const rows = sheet.frames / sheet.cols;
  const down: CSSAnimationProperties = {
    animationName: {
      from: { transform: [{ translateY: 0 }] },
      to: { transform: [{ translateY: -size * rows }] },
    },
    animationDuration: CYCLE_MS,
    animationTimingFunction: steps(rows),
    animationIterationCount: 'infinite',
    animationPlayState: reduced ? 'paused' : 'running',
  };
  const across: CSSAnimationProperties = {
    animationName: {
      from: { transform: [{ translateX: 0 }] },
      to: { transform: [{ translateX: -size * sheet.cols }] },
    },
    animationDuration: CYCLE_MS / rows,
    animationTimingFunction: steps(sheet.cols),
    animationIterationCount: 'infinite',
    animationPlayState: reduced ? 'paused' : 'running',
  };
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.window, { width: size, height: size }]}
    >
      <Animated.View style={down}>
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

const styles = StyleSheet.create({
  window: { overflow: 'hidden' },
});

export default ChalkLoop;
