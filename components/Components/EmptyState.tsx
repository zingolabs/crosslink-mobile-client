import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  CSSAnimationProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';

import { text, useTheme } from '../../app/theme';
import ChalkLoop, { ChalkLoopName } from './ChalkLoop';
import { SUMMARY_RADIUS } from './SummaryPanel';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

type EmptyStateProps = {
  art: ChalkLoopName;
  title: string;
  body?: string;
};

/** Centered chalk loop with a headline and one optional line under it. */
const EmptyState: React.FC<EmptyStateProps> = ({ art, title, body }) => {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const appear: CSSAnimationProperties = {
    animationName: reducedMotion
      ? { from: { opacity: 0 }, to: { opacity: 1 } }
      : {
          from: { opacity: 0, transform: [{ translateY: 12 }] },
          to: { opacity: 1, transform: [{ translateY: 0 }] },
        },
    animationDuration: reducedMotion ? 200 : 450,
    animationTimingFunction: EASE_OUT,
  };

  return (
    <Animated.View style={[styles.root, appear]}>
      <ChalkLoop name={art} />
      <Text style={[text.headline, styles.title, { color: colors.fgDefault }]}>
        {title}
      </Text>
      {!!body && (
        <Text
          style={[text.subheadline, styles.body, { color: colors.fgSubtle }]}
        >
          {body}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: SUMMARY_RADIUS,
    paddingBottom: 80,
  },
  title: {
    marginTop: 4,
    textAlign: 'center',
  },
  body: {
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 260,
  },
});

export default EmptyState;
