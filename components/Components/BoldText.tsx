import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '../../app/theme';

type BoldTextProps = {
  style?: TextStyle;
  children: string | string[];
  testID?: string;
  selectable?: boolean;
};

const BoldText: React.FunctionComponent<BoldTextProps> = ({
  style,
  children,
  testID,
  selectable,
}) => {
  const { colors } = useTheme();
  const totalStyle: TextStyle = {
    color: colors.fgDefault,
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.87,
    ...style,
  };

  return (
    <Text testID={testID} style={totalStyle} selectable={selectable}>
      {children}
    </Text>
  );
};

export default BoldText;
