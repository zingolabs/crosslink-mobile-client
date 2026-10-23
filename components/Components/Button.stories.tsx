/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Button from './Button';
import { tokens } from '../../app/theme';

const Canvas: React.FunctionComponent<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { width, height } = useWindowDimensions();
  return (
    <View
      style={{
        width,
        height,
        backgroundColor: tokens.bgCanvas,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {children}
    </View>
  );
};

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { title: 'Send', onPress: () => {}, fullWidth: false },
  parameters: { phoneFrame: false },
  decorators: [
    // The app canvas fills the whole viewport; the button sits on it at its
    // natural width, the way it appears inside a screen. The explicit
    // window size matters: Storybook's root has no height of its own, so
    // `flex: 1` alone collapses to the button.
    Story => (
      <Canvas>
        <Story />
      </Canvas>
    ),
  ],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Ghost: Story = { args: { variant: 'ghost' } };

export const Danger: Story = { args: { variant: 'danger' } };

export const Disabled: Story = { args: { disabled: true } };

export const Loading: Story = { args: { loading: true } };

/** Long labels are the usual overflow case in translated builds. */
export const LongLabel: Story = {
  args: { title: 'Confirm and broadcast this transaction now' },
};

/** The default inside screens: stretches to the parent width. */
export const FullWidth: Story = { args: { fullWidth: true } };
