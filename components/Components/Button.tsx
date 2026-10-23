/* eslint-disable react-native/no-inline-styles */
// The app's one button. Pill, 50pt, SF-style label with tight tracking.
// Press feedback is a Reanimated CSS transition: it runs on the UI thread,
// starts on press-in, and needs no shared value for a two-state change.
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';

import { radiusPill, text, useTheme } from '../../app/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
};

// Strong ease-out: the visible part of the motion happens first.
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const isDisabled = disabled || loading;

  // iOS button styles: filled, tinted, plain. Danger is filled in red.
  const surfaces: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: colors.bgAccent },
    secondary: { backgroundColor: colors.bgAccentTint },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: colors.bgDanger },
  };

  const labels: Record<ButtonVariant, TextStyle> = {
    primary: { color: colors.bgCanvas },
    secondary: { color: colors.fgAccent },
    ghost: { color: colors.fgAccent },
    danger: { color: colors.fgDefault },
  };

  const spinnerColor = labels[variant].color;

  // Reduced motion keeps the pressed look, drops the movement.
  const transition: CSSTransitionProperties = {
    transitionProperty: ['transform', 'opacity'],
    transitionDuration: reducedMotion ? '0ms' : '120ms',
    transitionTimingFunction: EASE_OUT,
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      hitSlop={8}
      pressRetentionOffset={16}
      style={fullWidth && styles.fullWidth}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.base,
            surfaces[variant],
            transition,
            isDisabled && styles.disabled,
            pressed &&
              !isDisabled &&
              (reducedMotion ? styles.pressedStill : styles.pressed),
            style,
          ]}
        >
          <Animated.View
            style={[
              styles.labelWrap,
              {
                opacity: loading ? 0 : 1,
                transitionProperty: 'opacity',
                transitionDuration: reducedMotion ? '0ms' : '150ms',
                transitionTimingFunction: EASE_OUT,
              },
            ]}
          >
            <Text
              style={[styles.label, labels[variant], textStyle]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
            >
              {title}
            </Text>
          </Animated.View>
          {loading ? (
            <View style={styles.spinner} pointerEvents="none">
              <ActivityIndicator size="small" color={spinnerColor} />
            </View>
          ) : null}
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  base: {
    height: 50,
    paddingHorizontal: 20,
    borderRadius: radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 1 }],
    opacity: 1,
  },
  labelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...text.headline,
    textAlign: 'center',
  },
  spinner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Press-in: 3% smaller and a little dimmer, like a filled iOS button.
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.8,
  },
  pressedStill: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
});
