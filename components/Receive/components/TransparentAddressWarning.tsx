import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';

import { useAppLoadedActions } from '../../../app/context';
import { TriangleAlert } from '../../Components/Icons/TriangleAlert';
import { ShieldIcon } from '../../Components/Icons/ShieldIcon';
import RegText from '../../Components/RegText';
import { duration, space, text, useTheme } from '../../../app/theme';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

type TransparentAddressWarningProps = {
  // Switches the receive screen back to the unified address tab.
  onChangeTab: (index: number) => void;
};

// Shown when the selected receive address is transparent: explains the
// privacy trade-off and offers a one-tap switch back to the unified tab.
const TransparentAddressWarning: React.FunctionComponent<
  TransparentAddressWarningProps
> = ({ onChangeTab }) => {
  const { translate } = useAppLoadedActions();
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = React.useState<boolean>(false);

  const press: CSSTransitionProperties = {
    transitionProperty: ['transform', 'opacity'],
    transitionDuration: reducedMotion ? '0ms' : `${duration.press}ms`,
    transitionTimingFunction: EASE_OUT,
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgWarning,
          borderColor: colors.borderWarning,
        },
      ]}
    >
      <View style={styles.header}>
        <TriangleAlert
          color={colors.fgWarning}
          size={24}
          style={styles.icon}
        />
        <Text style={[styles.title, { color: colors.fgWarningEmphasis }]}>
          {translate('receive.transparent.warning.title') as string}
        </Text>
      </View>
      <RegText style={{ color: colors.fgWarningMuted }}>
        {translate('receive.transparent.warning.description') as string}
      </RegText>
      <Pressable
        accessibilityRole="button"
        onPress={() => onChangeTab(0)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        pressRetentionOffset={space.lg}
      >
        <Animated.View
          style={[
            styles.cta,
            { backgroundColor: colors.bgAccent },
            press,
            pressed && styles.ctaPressed,
          ]}
        >
          <ShieldIcon
            color={colors.bgCanvas}
            size={24}
            style={styles.ctaIcon}
          />
          <Text style={[styles.ctaLabel, { color: colors.bgCanvas }]}>
            {translate('receive.transparent.warning.button') as string}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '95%',
    borderRadius: 10,
    borderWidth: 1,
    padding: space.md,
    marginTop: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  icon: {
    marginRight: space.md,
  },
  title: {
    ...text.headline,
  },
  cta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: space.md,
    borderRadius: 5,
    marginTop: space.md,
  },
  ctaPressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.8,
  },
  ctaIcon: {
    marginRight: space.xs,
  },
  ctaLabel: {
    ...text.caption,
  },
});

export default TransparentAddressWarning;
