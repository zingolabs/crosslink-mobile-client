import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { text, useTheme } from '../../app/theme';

type BoldTextProps = {
  style?: StyleProp<TextStyle>;
  children: string | string[];
  testID?: string;
  selectable?: boolean;
};

/** Emphasized text: the ramp's `headline` weight. */
const BoldText: React.FunctionComponent<BoldTextProps> = ({
  style,
  children,
  testID,
  selectable,
}) => {
  const { colors } = useTheme();

  return (
    <Text
      testID={testID}
      style={[styles.base, { color: colors.fgDefault }, style]}
      selectable={selectable}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    ...text.headline,
  },
});

export default BoldText;
