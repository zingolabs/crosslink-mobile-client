import React, { useMemo } from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
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
  knot: {
    source: require('../../assets/art/knot-24.png'),
    frames: 48,
    cols: 8,
  },
} as const;

export type ChalkLoopName = keyof typeof SHEETS;

const CYCLE_MS = 2000;

type ChalkLoopProps = {
  name: ChalkLoopName;
  size?: number;
  /**
   * Softens the chalk (iOS Image.blurRadius). Android ignores it.
   */
  blurRadius?: number;
};

/**
 * Steps the sheet through a window. Both axes are keyframed on ONE
 * animation, with steps(1, 'end') per keyframe so each sprite frame
 * holds discrete - the earlier two-animation version jumped to a stray
 * cell whenever the row and column clocks drifted apart.
 * Reduced motion holds the first frame.
 */
const ChalkLoop: React.FC<ChalkLoopProps> = ({ name, size = 200, blurRadius }) => {
  const reduced = useReducedMotion();
  const sheet = SHEETS[name];
  const rows = sheet.frames / sheet.cols;

  // Memoized: a fresh animation object per render would restart the loop
  // on every sync-tick re-render and visibly reset the drawing.
  const cycle: CSSAnimationProperties = useMemo(() => {
    const keyframes: Record<string, ViewStyle> = {};
    for (let f = 0; f < sheet.frames; f += 1) {
      keyframes[`${((f / sheet.frames) * 100).toFixed(4)}%`] = {
        transform: [
          { translateX: -(f % sheet.cols) * size },
          { translateY: -Math.floor(f / sheet.cols) * size },
        ],
        animationTimingFunction: steps(1, 'end'),
      } as ViewStyle;
    }
    return {
      animationName: keyframes as CSSAnimationProperties['animationName'],
      animationDuration: CYCLE_MS,
      animationIterationCount: 'infinite',
      animationPlayState: reduced ? 'paused' : 'running',
    };
  }, [sheet, size, reduced]);

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.window, { width: size, height: size }]}
    >
      <Animated.View style={cycle}>
        <Image
          source={sheet.source}
          accessibilityIgnoresInvertColors
          blurRadius={blurRadius}
          style={{ width: size * sheet.cols, height: size * rows }}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  window: { overflow: 'hidden' },
});

export default ChalkLoop;
