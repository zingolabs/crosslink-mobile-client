import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { text, useTheme } from '../../app/theme';

type FadeTextProps = {
  style?: StyleProp<TextStyle>;
  children: string | string[];
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  selectable?: boolean;
};

/** Muted secondary text: labels beside values, captions under rows. */
const FadeText: React.FunctionComponent<FadeTextProps> = ({
  style,
  children,
  numberOfLines,
  ellipsizeMode,
  selectable,
}) => {
  const { colors } = useTheme();

  return (
    <Text
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      style={[styles.base, { color: colors.fgMuted }, style]}
      selectable={selectable}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    ...text.body,
  },
});

export default FadeText;
