import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '@callstack/liquid-glass';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { radiusPill, useTheme } from '../../app/theme';

type HeaderIconButtonProps = {
  icon: IconDefinition;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  testID?: string;
};

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  testID,
}) => {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const transition: CSSTransitionProperties = {
    transitionProperty: ['transform', 'opacity'],
    transitionDuration: reducedMotion ? '0ms' : '120ms',
    transitionTimingFunction: EASE_OUT,
  };

  const glyph = (
    <FontAwesomeIcon icon={icon} size={17} color={colors.fgDefault} />
  );

  if (isLiquidGlassSupported) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={styles.hit}
      >
        <LiquidGlassView
          key={disabled ? 'glass-disabled' : 'glass-enabled'}
          interactive={!disabled}
          effect="regular"
          colorScheme="system"
          style={[styles.glass, disabled && styles.disabled]}
        >
          {glyph}
        </LiquidGlassView>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      pressRetentionOffset={16}
      style={styles.hit}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.button,
            { backgroundColor: colors.bgSurface },
            transition,
            disabled && styles.disabled,
            pressed &&
              !disabled &&
              (reducedMotion ? styles.pressedStill : styles.pressed),
          ]}
        >
          {glyph}
        </Animated.View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    alignSelf: 'flex-start',
  },
  glass: {
    width: 44,
    height: 44,
    borderRadius: radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    transform: [{ scale: 1 }],
    opacity: 1,
  },
  pressed: {
    transform: [{ scale: 0.9 }],
    opacity: 0.7,
  },
  pressedStill: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});

export default HeaderIconButton;
