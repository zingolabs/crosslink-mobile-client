import React from 'react';
import {
  Pressable,
  StyleSheet,
  Platform,
  TextStyle,
  ColorValue,
  ViewStyle,
  View,
} from 'react-native';
import { radiusPill, useTheme } from '../../../app/theme';
import BlurInText from '../BlurInText';

type NativePrimaryFallbackProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  tintColor?: ColorValue;
  testID?: string;
};

const NativePrimaryFallback: React.FC<NativePrimaryFallbackProps> = ({
  title,
  onPress,
  disabled,
  style,
  textStyle,
  tintColor,
  testID,
}) => {
  const { colors } = useTheme();

  const primary = disabled ? colors.bgSurface : (tintColor ?? colors.bgAccent);

  return (
    <View style={[styles.container, style]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: primary },
          pressed && !disabled && styles.primaryPressed,
          disabled && styles.primaryDisabled,
        ]}
      >
        <BlurInText
          style={[styles.primaryText, { color: colors.bgCanvas }, textStyle]}
          numberOfLines={1}
        >
          {title}
        </BlurInText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  primary: {
    borderRadius: radiusPill,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',

    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    }),
  },
  primaryPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  primaryDisabled: {
    opacity: 0.55,
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '600',
  },
});

export default NativePrimaryFallback;
