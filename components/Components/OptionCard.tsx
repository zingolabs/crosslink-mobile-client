import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

import { radiusPill, text, useTheme } from '../../app/theme';

type OptionCardProps = {
  title: string;
  subtitle?: string;
  detail?: React.ReactNode;
  icon: IconDefinition;
  tint?: 'accent' | 'neutral';
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
};

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

const OptionCard: React.FC<OptionCardProps> = ({
  title,
  subtitle,
  detail,
  icon,
  tint = 'neutral',
  disabled = false,
  onPress,
  testID,
}) => {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  const press: CSSTransitionProperties = {
    transitionProperty: ['transform', 'opacity'],
    transitionDuration: reducedMotion ? '0ms' : '130ms',
    transitionTimingFunction: EASE_OUT,
  };

  const badge =
    tint === 'accent'
      ? { backgroundColor: colors.bgAccentTint, iconColor: colors.fgAccent }
      : { backgroundColor: colors.bgFaint, iconColor: colors.fgDefault };

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: colors.bgSurface },
        press,
        disabled && styles.disabled,
        pressed &&
          !disabled &&
          (reducedMotion ? styles.pressedStill : styles.cardPressed),
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        pressRetentionOffset={16}
        style={styles.head}
        testID={testID}
      >
        <View
          style={[styles.badge, { backgroundColor: badge.backgroundColor }]}
        >
          <FontAwesomeIcon icon={icon} size={20} color={badge.iconColor} />
        </View>

        <View style={styles.cardText}>
          <Text
            style={[styles.cardTitle, { color: colors.fgDefault }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.6}
          >
            {title}
          </Text>
          {detail !== undefined ? (
            <View style={styles.detail}>{detail}</View>
          ) : subtitle ? (
            <Text
              style={[styles.cardSubtitle, { color: colors.fgSubtle }]}
              numberOfLines={2}
              maxFontSizeMultiplier={1.6}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.chevron}>
          <FontAwesomeIcon
            icon={faChevronRight}
            size={14}
            color={colors.fgSubtle}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    transform: [{ scale: 1 }],
    opacity: 1,
    marginBottom: 12,
  },
  cardPressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.8,
  },
  pressedStill: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 28,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.10)',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...text.headline,
  },
  cardSubtitle: {
    ...text.footnote,
    marginTop: 2,
  },
  detail: {
    minHeight: 20,
    justifyContent: 'center',
  },
  chevron: {
    marginLeft: 12,
  },
});

export default OptionCard;
