import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import {
  GrainGradient,
  GrainGradientShape,
  GrainGradientShapes,
} from './shaders/PaperShaders';
import {
  Frame,
  colorArgTypes,
  neutral,
  pickColors,
  range,
} from './shaders/storyFrame';

type GrainArgs = {
  colorBack: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  shape: GrainGradientShape;
  softness: number;
  intensity: number;
  noise: number;
  speed: number;
  scale: number;
  withButtons: boolean;
};

const GrainStory: React.FC<GrainArgs> = ({
  colorBack,
  shape,
  softness,
  intensity,
  noise,
  speed,
  scale,
  withButtons,
  ...colors
}) => (
  <Frame withButtons={withButtons}>
    <GrainGradient
      colorBack={colorBack}
      colors={pickColors(colors, 5)}
      fit={GrainGradientShapes[shape] > 3 ? 'contain' : 'none'}
      shape={shape}
      softness={softness}
      intensity={intensity}
      noise={noise}
      speed={speed}
      scale={scale}
    />
  </Frame>
);

/**
 * Paper's grain gradient shader, ported to a WebGL canvas (web only).
 * Seven animated shapes, grainy edges, quantised bands. Empty color slots
 * are skipped, so two to five colors work.
 */
const meta = {
  title: 'Prototypes/Paper shaders/Grain gradient',
  component: GrainStory,
  argTypes: {
    colorBack: { control: 'color' },
    ...colorArgTypes(5),
    shape: { control: 'select', options: Object.keys(GrainGradientShapes) },
    softness: range(0, 1, 0.01),
    intensity: range(0, 1, 0.01),
    noise: range(0, 1, 0.01),
    speed: range(0, 3, 0.05),
    scale: range(0.2, 3, 0.05),
    withButtons: { control: 'boolean' },
  },
  args: {
    colorBack: neutral.back,
    color1: neutral.surface,
    color2: neutral.faint,
    color3: neutral.subtle,
    color4: '',
    color5: '',
    shape: 'corners',
    softness: 0.5,
    intensity: 0.5,
    noise: 0.25,
    speed: 1,
    scale: 1,
    withButtons: true,
  },
} satisfies Meta<typeof GrainStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Corners: Story = {};
export const Wave: Story = {
  args: { shape: 'wave', softness: 0.7, intensity: 0.15, noise: 0.5 },
};
export const Dots: Story = {
  args: { shape: 'dots', scale: 0.6, softness: 1, intensity: 1, noise: 0.7 },
};
export const Truchet: Story = {
  args: { shape: 'truchet', softness: 0, intensity: 0.2, noise: 1 },
};
export const Ripple: Story = {
  args: {
    shape: 'ripple',
    scale: 0.5,
    colorBack: neutral.ink,
    color1: neutral.back,
    color2: neutral.surface,
    color3: neutral.faint,
    color4: neutral.muted,
  },
};
export const Blob: Story = {
  args: {
    shape: 'blob',
    scale: 1.3,
    softness: 0,
    intensity: 0.15,
    noise: 0.5,
    color1: neutral.faint,
    color2: neutral.muted,
    color3: neutral.white,
  },
};
export const Sphere: Story = {
  args: {
    shape: 'sphere',
    noise: 0.4,
    color1: neutral.faint,
    color2: neutral.muted,
    color3: neutral.white,
  },
};
