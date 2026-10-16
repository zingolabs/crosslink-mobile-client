import React from 'react';
import { View, ViewProps } from 'react-native';

export type ContextMenuOnPressNativeEvent = {
  index: number;
  name: string;
  indexPath: number[];
};

// Renders children only; the long-press menu itself is iOS-native.
const ContextMenu: React.FC<ViewProps & Record<string, unknown>> = ({
  children,
  ...rest
}) => <View {...(rest as ViewProps)}>{children}</View>;

export default ContextMenu;
