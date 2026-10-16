import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import VaporSun from './VaporSun';

const range = (min: number, max: number, step: number) => ({
  control: { type: 'range' as const, min, max, step },
});

/**
 * The vapor-sun background drawn with react-native-svg: banded sun, halftone
 * glow, glowing horizon and a perspective grid that fades into the canvas.
 */
const meta = {
  title: 'Prototypes/Vapor sun',
  component: VaporSun,
  argTypes: {
    canvas: { control: 'color' },
    ink: { control: 'color' },
    horizon: range(0.2, 0.6, 0.01),
    sunRadius: range(40, 180, 1),
    bands: range(4, 30, 1),
    bandGap: range(0, 1, 0.01),
    sunGlow: range(0, 1, 0.01),
    halftoneOpacity: range(0, 1, 0.01),
    halftoneSpacing: range(3, 16, 0.5),
    halftoneRadius: range(0.5, 5, 0.1),
    gridOpacity: range(0, 1, 0.01),
    gridColumns: range(3, 30, 1),
    gridRows: range(3, 30, 1),
    gridDepth: range(0.1, 0.6, 0.01),
    gridFade: range(0, 0.6, 0.01),
    horizonGlow: range(0, 1, 0.01),
  },
  args: {
    canvas: '#0f0f0f',
    ink: '#ffffff',
    horizon: 0.35,
    sunRadius: 96,
    bands: 14,
    bandGap: 0.45,
    sunGlow: 0.4,
    halftoneOpacity: 0.35,
    halftoneSpacing: 7,
    halftoneRadius: 1.9,
    gridOpacity: 0.5,
    gridColumns: 13,
    gridRows: 12,
    gridDepth: 0.26,
    gridFade: 0.15,
    horizonGlow: 0.9,
  },
} satisfies Meta<typeof VaporSun>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Subtle: Story = {
  args: {
    sunGlow: 0.3,
    halftoneOpacity: 0.2,
    gridOpacity: 0.3,
    horizonGlow: 0.6,
  },
};

export const HighHorizon: Story = { args: { horizon: 0.28, sunRadius: 80 } };
