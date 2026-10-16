import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import {
  Dithering,
  DitheringShapes,
  DitheringTypes,
} from './shaders/PaperShaders';
import { Frame, neutral, range } from './shaders/storyFrame';

type DitherArgs = {
  colorBack: string;
  colorFront: string;
  shape: keyof typeof DitheringShapes;
  type: keyof typeof DitheringTypes;
  pxSize: number;
  speed: number;
  withButtons: boolean;
};

const DitherStory: React.FC<DitherArgs> = ({ withButtons, ...rest }) => (
  <Frame withButtons={withButtons}>
    <Dithering {...rest} />
  </Frame>
);

/** Paper's dithering shader (WebGL, web only). Two colors: back and front. */
const meta = {
  title: 'Prototypes/Paper shaders/Dithering',
  component: DitherStory,
  argTypes: {
    colorBack: { control: 'color' },
    colorFront: { control: 'color' },
    shape: { control: 'select', options: Object.keys(DitheringShapes) },
    type: { control: 'select', options: Object.keys(DitheringTypes) },
    pxSize: range(1, 8, 0.5),
    speed: range(0, 3, 0.05),
    withButtons: { control: 'boolean' },
  },
  args: {
    colorBack: neutral.back,
    colorFront: neutral.subtle,
    shape: 'sphere',
    type: '4x4',
    pxSize: 2,
    speed: 1,
    withButtons: true,
  },
} satisfies Meta<typeof DitherStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sphere: Story = {};
export const Simplex: Story = { args: { shape: 'simplex', type: '8x8' } };
export const Warp: Story = { args: { shape: 'warp', pxSize: 3 } };
export const Wave: Story = { args: { shape: 'wave', type: '2x2' } };
export const Bright: Story = {
  args: { colorFront: neutral.white, pxSize: 1.5 },
};
