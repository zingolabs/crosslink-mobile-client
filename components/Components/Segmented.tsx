import React, { useState } from 'react';
import {
  LayoutChangeEvent,
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

import { text, useTheme } from '../../app/theme';

type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
};

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex(o => o.value === value),
  );
  const segment = width / options.length;

  const slide: CSSTransitionProperties = {
    transitionProperty: 'transform',
    transitionDuration: reducedMotion ? '0ms' : '250ms',
    transitionTimingFunction: EASE_OUT,
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: colors.bgSurface }]}
      onLayout={(e: LayoutChangeEvent) =>
        setWidth(e.nativeEvent.layout.width - 4)
      }
    >
      {width > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            { width: segment, backgroundColor: colors.bgFaint },
            slide,
            { transform: [{ translateX: index * segment }] },
          ]}
        />
      )}
      {options.map(o => (
        <Pressable
          key={o.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.value === value }}
          onPress={() => onChange(o.value)}
          style={styles.segment}
        >
          <Text
            style={[
              styles.label,
              {
                color: o.value === value ? colors.fgDefault : colors.fgSubtle,
              },
            ]}
            maxFontSizeMultiplier={1.4}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  thumb: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  segment: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...text.subheadline,
    fontWeight: '600',
  },
});

export default Segmented;
