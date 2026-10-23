import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ChalkColumns, { ChalkColumnsProps } from './ChalkColumns';
import { Frame, range } from './shaders/storyFrame';

type ChalkArgs = ChalkColumnsProps & { withButtons: boolean };

const ChalkStory: React.FC<ChalkArgs> = ({ withButtons, ...props }) => (
  <Frame withButtons={withButtons}>
    <ChalkColumns {...props} />
  </Frame>
);

/**
 * Chalk on black paper, drawn in a fragment shader (web only). Strokes are
 * signed-distance boxes; a per-pixel paper tooth decides where the chalk
 * sticks, and a noisy edge offset gives the ragged outline. Dashes are
 * generated per lane and row from a hash, so the drawing is procedural and
 * can drift upward over time.
 */
const meta = {
  title: 'Prototypes/Chalk columns',
  component: ChalkStory,
  argTypes: {
    colorBack: { control: 'color' },
    colorChalk: { control: 'color' },
    grain: range(0, 1, 0.01),
    roughness: range(0, 4, 0.1),
    pressure: range(0.2, 1.5, 0.01),
    density: range(0, 1.5, 0.01),
    spread: range(0, 3, 0.05),
    glow: range(0, 2, 0.05),
    baseline: range(0.1, 0.5, 0.01),
    columnTop: range(0.3, 0.8, 0.01),
    columnWidth: range(2, 14, 0.5),
    pairGap: range(6, 30, 1),
    spacing: range(0.4, 1.4, 0.02),
    rise: range(0, 4, 0.1),
    seed: range(1, 50, 1),
    spanTop: range(0, 0.3, 0.01),
    spanBottom: range(0, 0.3, 0.01),
    speed: range(0, 3, 0.05),
    withButtons: { control: 'boolean' },
  },
  args: {
    colorBack: '#0b0b0b',
    colorChalk: '#ebe9e2',
    grain: 1,
    roughness: 1.5,
    pressure: 0.8,
    density: 0.8,
    spread: 1,
    glow: 1,
    baseline: 0.3,
    columnTop: 0.56,
    columnWidth: 6.5,
    pairGap: 14,
    spacing: 1,
    rise: 0,
    seed: 1,
    spanTop: 0.18,
    spanBottom: 0,
    speed: 1,
    withButtons: true,
  },
} satisfies Meta<typeof ChalkStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Still: Story = { args: { speed: 0, withButtons: false } };
export const Dense: Story = {
  args: { density: 1.3, spread: 1.6, pressure: 1 },
};
export const Sparse: Story = {
  args: { density: 0.45, spread: 0.6, pressure: 0.7, glow: 0.6 },
};
export const Smooth: Story = {
  args: { grain: 0.3, roughness: 0.4, glow: 1.5 },
};
