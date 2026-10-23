import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { MeshGradient } from './shaders/PaperShaders';
import {
  Frame,
  colorArgTypes,
  neutral,
  pickColors,
  range,
} from './shaders/storyFrame';

type MeshArgs = {
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  distortion: number;
  swirl: number;
  grainMixer: number;
  grainOverlay: number;
  speed: number;
  withButtons: boolean;
};

const MeshStory: React.FC<MeshArgs> = ({
  distortion,
  swirl,
  grainMixer,
  grainOverlay,
  speed,
  withButtons,
  ...colors
}) => (
  <Frame withButtons={withButtons}>
    <MeshGradient
      colors={pickColors(colors, 5)}
      distortion={distortion}
      swirl={swirl}
      grainMixer={grainMixer}
      grainOverlay={grainOverlay}
      speed={speed}
    />
  </Frame>
);

/** Paper's mesh gradient shader (WebGL, web only). Empty color slots are skipped. */
const meta = {
  title: 'Prototypes/Paper shaders/Mesh gradient',
  component: MeshStory,
  argTypes: {
    ...colorArgTypes(5),
    distortion: range(0, 1, 0.01),
    swirl: range(0, 1, 0.01),
    grainMixer: range(0, 1, 0.01),
    grainOverlay: range(0, 1, 0.01),
    speed: range(0, 3, 0.05),
    withButtons: { control: 'boolean' },
  },
  args: {
    color1: neutral.back,
    color2: neutral.surface,
    color3: neutral.faint,
    color4: neutral.subtle,
    color5: '',
    distortion: 0.8,
    swirl: 0.1,
    grainMixer: 0.3,
    grainOverlay: 0.3,
    speed: 0.5,
    withButtons: true,
  },
} satisfies Meta<typeof MeshStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Swirl: Story = {
  args: {
    swirl: 0.6,
    distortion: 0.04,
    color1: '#080808',
    color2: '#0e0e0e',
    color3: '#141414',
    color4: '#1c1c1c',
    grainMixer: 0,
    speed: 0.15,
  },
};
export const Grainy: Story = { args: { grainOverlay: 0.8, grainMixer: 0.6 } };
export const Contrast: Story = {
  args: {
    color1: neutral.ink,
    color2: neutral.back,
    color3: neutral.muted,
    color4: neutral.white,
  },
};
