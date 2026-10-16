import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  CSSTransitionProperties,
  Easing,
  FadeInUp,
  ReduceMotion,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronRight,
  faFlask,
  faServer,
  faSliders,
} from '@fortawesome/free-solid-svg-icons';

import { HeaderIconButton, HeaderTitle } from '../components/Header';
import { radiusPill, text, useTheme } from '../app/theme';

export type SelectNetworkProps = {
  fromSettings?: boolean;
  disabled?: boolean;
  onAvailable: () => void;
  onCustom: () => void;
  onRegtest: () => void;
  onBack?: () => void;
};

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const CARDS_ENTER = FadeInUp.duration(320)
  .easing(Easing.bezier(0.23, 1, 0.32, 1))
  .reduceMotion(ReduceMotion.System);

type NetworkCardProps = {
  title: string;
  subtitle: string;
  icon: typeof faServer;
  tint: 'accent' | 'neutral';
  disabled: boolean;
  onPress: () => void;
};

const NetworkCard: React.FC<NetworkCardProps> = ({
  title,
  subtitle,
  icon,
  tint,
  disabled,
  onPress,
}) => {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const transition: CSSTransitionProperties = {
    transitionProperty: ['transform', 'opacity'],
    transitionDuration: reducedMotion ? '0ms' : '130ms',
    transitionTimingFunction: EASE_OUT,
  };

  const badge =
    tint === 'accent'
      ? { backgroundColor: colors.bgAccentTint, iconColor: colors.fgAccent }
      : { backgroundColor: colors.bgFaint, iconColor: colors.fgDefault };

  return (
    <View style={styles.cardWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        pressRetentionOffset={16}
      >
        {({ pressed }) => (
          <Animated.View
            style={[
              styles.card,
              { backgroundColor: colors.bgSurface },
              transition,
              disabled && styles.disabled,
              pressed &&
                !disabled &&
                (reducedMotion ? styles.pressedStill : styles.cardPressed),
            ]}
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
              <Text
                style={[styles.cardSubtitle, { color: colors.fgSubtle }]}
                numberOfLines={2}
                maxFontSizeMultiplier={1.6}
              >
                {subtitle}
              </Text>
            </View>

            <View style={styles.chevron}>
              <FontAwesomeIcon
                icon={faChevronRight}
                size={14}
                color={colors.fgSubtle}
              />
            </View>
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
};

const SelectNetwork: React.FC<SelectNetworkProps> = ({
  fromSettings = false,
  disabled = false,
  onAvailable,
  onCustom,
  onRegtest,
  onBack = () => {},
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const regtestButton = (
    <HeaderIconButton
      icon={faFlask}
      disabled={disabled}
      onPress={onRegtest}
      accessibilityLabel="Use regtest"
      accessibilityHint="Connects to a local regtest indexer"
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
      {fromSettings ? (
        <HeaderTitle
          title="Select network"
          goBack={onBack}
          ExtraComponent={regtestButton}
        />
      ) : (
        <View style={styles.bareHeader}>{regtestButton}</View>
      )}

      <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
        {!fromSettings && (
          <Text
            style={[styles.largeTitle, { color: colors.fgDefault }]}
            maxFontSizeMultiplier={1.4}
          >
            Select network
          </Text>
        )}

        <Text
          style={[
            styles.lede,
            { color: colors.fgSubtle },
            fromSettings && styles.ledeCentered,
          ]}
          maxFontSizeMultiplier={1.6}
        >
          Choose the network this wallet will operate on.
        </Text>

        <Animated.View entering={CARDS_ENTER}>
          <NetworkCard
            title="Available servers"
            subtitle="Choose from available indexers"
            icon={faServer}
            tint="accent"
            disabled={disabled}
            onPress={onAvailable}
          />

          <NetworkCard
            title="Custom"
            subtitle="Connect to your own testnet indexer"
            icon={faSliders}
            tint="neutral"
            disabled={disabled}
            onPress={onCustom}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  bareHeader: {
    height: 48,
    marginTop: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  largeTitle: {
    ...text.largeTitle,
    marginTop: 8,
  },
  lede: {
    ...text.subheadline,
    marginTop: 6,
    marginBottom: 24,
  },
  ledeCentered: {
    textAlign: 'center',
    marginTop: 14,
  },
  cardWrap: {
    width: '100%',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 18,
    transform: [{ scale: 1 }],
    opacity: 1,
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
  chevron: {
    marginLeft: 12,
  },
});

export default SelectNetwork;
