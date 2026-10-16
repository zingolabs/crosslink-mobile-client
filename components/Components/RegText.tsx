import React from 'react';
import { Text, TextStyle, StyleProp, TextProps } from 'react-native';
import { useTheme } from '../../app/theme';

type RegTextProps = TextProps & {
  style?: StyleProp<TextStyle>;
  color?: string;
  children: React.ReactNode;
};

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
      style={[
        // eslint-disable-next-line react-native/no-inline-styles
        {
          color: color || colors.fgDefault,
          fontSize: 18,
          fontWeight: '600',
          opacity: 1,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

export default RegText;
