/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ViewProps } from 'react-native';

// Native blur has no web equivalent. A translucent overlay keeps the layout
// and still communicates "content is obscured".
export const BlurView: React.FC<ViewProps & { blurAmount?: number }> = ({
  style,
  children,
  ...rest
}) => (
  <View
    {...rest}
    style={[style, { backgroundColor: 'rgba(15,15,15,0.85)' }]}
    // @ts-expect-error web-only style hint
    dataSet={{ storybookStub: 'BlurView' }}
  >
    {children}
  </View>
);

export const VibrancyView = BlurView;
export default { BlurView, VibrancyView };
