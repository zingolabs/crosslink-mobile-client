import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import JellyLoader from './JellyLoader';

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const meta = {
  title: 'Components/JellyLoader',
  component: JellyLoader,
  args: {
    size: 40,
    speed: 900,
  },
  decorators: [
    Story => (
      <View style={styles.center}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof JellyLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const RowSize: Story = { args: { size: 20 } };

export const Accent: Story = { args: { color: '#1c78d2' } };

export const Slow: Story = { args: { speed: 1800 } };
