import React from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';
import Button from '../Button';
import { mono } from '../../../app/theme';

type AddressProps = {
  address: string;
  startLength?: number;
  endLength?: number;
  onPress?: () => void;
  style?: StyleProp<TextStyle>;
  // Overrides the button surface (e.g. to inline it in a compact row).
  containerStyle?: StyleProp<ViewStyle>;
};

const Address: React.FunctionComponent<AddressProps> = ({
  address,
  startLength = 10,
  endLength = 10,
  onPress,
  style,
  containerStyle,
}) => {
  if (!address) {
    return null;
  }

  const shortAddress = `${address.slice(0, startLength)}...${address.slice(-endLength)}`;

  return (
    <Button
      variant="ghost"
      fullWidth={false}
      onPress={onPress ? onPress : () => console.log('onPress')}
      title={shortAddress}
      textStyle={[mono, style]}
      style={containerStyle}
    />
  );
};

export default Address;
