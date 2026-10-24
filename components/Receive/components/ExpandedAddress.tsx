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
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import RegText from '../../Components/RegText';
import { duration, mono, space, text, useTheme } from '../../../app/theme';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

type ExpandedAddressProps = {
  address: string;
  closeSheet: () => void;
  onCopy?: () => void;
  title?: string;
  button?: string;
  setHeightLayout: (h: number) => void;
};

const ExpandedAddress: React.FunctionComponent<ExpandedAddressProps> = ({
  address,
  closeSheet,
  onCopy,
  title,
  button,
  setHeightLayout,
}) => {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  const press: CSSTransitionProperties = {
    transitionProperty: ['backgroundColor'],
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
      <RegText style={styles.title}>{title ? title : ''}</RegText>
      <View style={[styles.card, { backgroundColor: colors.bgCanvas }]}>
        <View style={styles.body}>
          <Text style={[mono, styles.address, { color: colors.fgMuted }]}>
            {address}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onCopy && onCopy();
              closeSheet();
            }}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            pressRetentionOffset={space.lg}
          >
            <Animated.View
              style={[
                styles.copyButton,
                {
                  backgroundColor: pressed ? colors.bgPress : colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
                press,
              ]}
            >
              <Text style={[text.callout, { color: colors.fgMuted }]}>
                {button}
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
  body: {
    alignItems: 'flex-start',
  },
  address: {
    marginBottom: space.xl,
  },
  copyButton: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: 5,
    borderWidth: 1,
    alignSelf: 'center',
  },
});

export default ExpandedAddress;
