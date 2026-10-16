import React from 'react';
import { View, ViewProps } from 'react-native';

/**
 * react-native-linear-gradient calls `requireNativeComponent`, which
 * react-native-web does not provide. Renders the first gradient colour as a
 * flat fill so layout and contrast stay representative.
 */
type Props = ViewProps & { colors?: string[] };

const LinearGradient: React.FC<Props> = ({ colors, style, children, ...rest }) => (
  <View {...rest} style={[style, { backgroundColor: colors?.[0] }]}>
    {children}
  </View>
);

export default LinearGradient;
export { LinearGradient };
