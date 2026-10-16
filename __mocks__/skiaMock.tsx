import React from 'react';
import { View } from 'react-native';

const Nothing: React.FC<React.PropsWithChildren<unknown>> = () => null;

export const Canvas: React.FC<React.PropsWithChildren<{ style?: unknown }>> = ({
  children,
}) => <View>{children}</View>;
export const Fill = Nothing;
export const Group = Nothing;
export const Shader = Nothing;
export const Text = Nothing;
export const RoundedRect = Nothing;
export const Blur = Nothing;
export const Skia = { RuntimeEffect: { Make: () => null } };
export const useClock = () => ({ value: 0 });
export const useFont = () => null;
