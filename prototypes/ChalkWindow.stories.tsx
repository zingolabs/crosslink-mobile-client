import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { ChalkMasks } from './ChalkColumns';
import ChalkWelcome from './ChalkWelcome';
import { wordmarkVariantNames } from './ChalkWordmark';
import { range } from './shaders/storyFrame';

/**
 * The drawing lives inside a soft window and fades into the paper instead
 * of stopping at a hard edge. Five mask shapes, each with a feather and a
 * padding control, over the static welcome with a Geist Pixel wordmark.
 */
const meta = {
  title: 'Prototypes/Chalk columns/Window',
  component: ChalkWelcome,
  argTypes: {
    mask: { control: 'select', options: Object.keys(ChalkMasks) },
    maskFeather: range(0, 0.4, 0.01),
    maskPad: range(-0.1, 0.2, 0.01),
    wordmark: { control: 'select', options: wordmarkVariantNames },
    rainTop: range(0.5, 1, 0.01),
    columnTop: range(0.3, 0.8, 0.01),
    density: range(0, 1.5, 0.01),
    glow: range(0, 2, 0.05),
    seed: range(1, 50, 1),
  },
  args: {
    intro: false,
    showHeader: false,
    wordmark: 'pixelSquare',
    mask: 'window',
    maskFeather: 0.12,
    maskPad: 0.02,
    baseline: 0.3,
    columnTop: 0.55,
    rainTop: 0.97,
    density: 0.75,
    pressure: 0.82,
    glow: 0.5,
    spanTop: 0.1,
    seed: 4,
    createNewWallet: () => {},
    getwalletToRestore: () => {},
    openServers: () => {},
  },
} satisfies Meta<typeof ChalkWelcome>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HardEdge: Story = { args: { mask: 'none' } };
export const VerticalBand: Story = {
  args: { mask: 'vertical', maskFeather: 0.16 },
};
export const Ellipse: Story = { args: { mask: 'ellipse', maskFeather: 0.14 } };
export const Window: Story = { args: { mask: 'window' } };
export const Dissolve: Story = {
  args: { mask: 'dissolve', maskFeather: 0.16 },
};
export const TopFade: Story = { args: { mask: 'top', maskFeather: 0.2 } };
export const WideWindow: Story = {
  args: { mask: 'window', maskFeather: 0.22, maskPad: 0.08 },
};
export const TightDissolve: Story = {
  args: { mask: 'dissolve', maskFeather: 0.1, maskPad: -0.03 },
};
