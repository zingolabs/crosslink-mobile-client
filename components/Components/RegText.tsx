import React from 'react';
import { Text, TextStyle, StyleProp, TextProps } from 'react-native';
import { text, useTheme } from '../../app/theme';

type RegTextProps = TextProps & {
  style?: StyleProp<TextStyle>;
  color?: string;
  children: React.ReactNode;
};

/** Body text. A thin wrapper over the typography ramp's `body` style. */
const RegText: React.FunctionComponent<RegTextProps> = ({
  style,
  color,
  children,
  ...props
}) => {
  const { colors } = useTheme();

  return (
    <Text
      {...props}
      style={[text.body, { color: color || colors.fgDefault }, style]}
    >
      {children}
    </Text>
  );
};

export default RegText;
