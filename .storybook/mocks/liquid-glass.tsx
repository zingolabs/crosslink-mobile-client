import React from 'react';
import { View, ViewProps } from 'react-native';

// The iOS 26 liquid-glass effect has no web equivalent. Components fall back
// to their non-glass path, which is what Android already renders.
export const isLiquidGlassSupported = false;

export const LiquidGlassView: React.FC<ViewProps> = props => <View {...props} />;
export const LiquidGlassContainerView: React.FC<ViewProps> = props => (
  <View {...props} />
);
