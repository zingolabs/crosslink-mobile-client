import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';

import { useAppLoadedActions } from '../../../app/context';
import { TriangleAlert } from '../../Components/Icons/TriangleAlert';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import RegText from '../../Components/RegText';
import { duration, space, text, useTheme } from '../../../app/theme';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

type TransparentWarningProps = {
  onSuccess: () => void;
  closeSheet: () => void;
  setHeightLayout: (h: number) => void;
};

const TransparentWarning = ({
  onSuccess,
  closeSheet,
  setHeightLayout,
}: TransparentWarningProps) => {
  const { colors } = useTheme();
  const { translate } = useAppLoadedActions();
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  const press: CSSTransitionProperties = {
    transitionProperty: ['transform', 'opacity'],
    transitionDuration: reducedMotion ? '0ms' : `${duration.press}ms`,
    transitionTimingFunction: EASE_OUT,
  };

  return (
    <View
      onLayout={e => {
        const { height } = e.nativeEvent.layout;
        //console.log('LAYOUTTT', height);
        setHeightLayout(height + 70);
      }}
      style={{ backgroundColor: colors.bgCanvas }}
    >
      <TouchableOpacity
        onPress={() => {
          closeSheet();
        }}
      >
        <FontAwesomeIcon
          size={30}
          icon={faXmark}
          color={colors.fgDefault}
          style={styles.close}
        />
      </TouchableOpacity>
      <RegText style={styles.title}>
        {translate('receive.modal-transparent.title') as string}
      </RegText>
      <View style={[styles.card, { backgroundColor: colors.bgCanvas }]}>
        <View>
          <Text
            style={[text.callout, styles.message, { color: colors.fgMuted }]}
          >
            {translate('receive.modal-transparent.message') as string}
          </Text>
          <Text
            style={[
              text.callout,
              styles.recommendation,
              { color: colors.fgMuted },
            ]}
          >
            {translate('receive.modal-transparent.recommendation') as string}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onSuccess();
              closeSheet();
            }}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            pressRetentionOffset={space.lg}
          >
            <Animated.View
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.bgWarning,
                  borderColor: colors.borderWarning,
                },
                press,
                pressed && styles.actionPressed,
              ]}
            >
              <TriangleAlert
                size={15}
                style={styles.actionIcon}
                color={colors.fgWarningEmphasis}
              />

              <Text
                style={[text.caption1, { color: colors.fgWarningEmphasis }]}
              >
                {translate('receive.modal-transparent.button') as string}
              </Text>
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  close: {
    marginTop: space.md,
    marginRight: space.xl,
    alignSelf: 'flex-end',
  },
  title: {
    paddingHorizontal: space.md,
    alignSelf: 'center',
  },
  card: {
    width: '90%',
    padding: space.lg,
    borderRadius: 8,
    alignSelf: 'center',
  },
  message: {
    marginBottom: space.md,
  },
  recommendation: {
    marginBottom: space.lg,
  },
  actionButton: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.md,
    borderRadius: 8,
    borderWidth: 2,
  },
  actionPressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.8,
  },
  actionIcon: {
    marginRight: space.sm,
  },
});

export default TransparentWarning;
