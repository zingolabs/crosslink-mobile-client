import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ChalkWelcome from './ChalkWelcome';
import { wordmarkVariantNames } from './ChalkWordmark';
import { range } from './shaders/storyFrame';

/**
 * StartMenu with the chalk drawing as background. No welcome copy; the
 * wordmark sits where the small rectangle was, with the real header icon
 * and action buttons below. `intro` plays the draw-in timeline on mount and
 * fades the wordmark and buttons in after the baseline lands.
 */
const meta = {
  title: 'Prototypes/Chalk columns/Welcome',
  component: ChalkWelcome,
  argTypes: {
    intro: { control: 'boolean' },
    wordmark: { control: 'select', options: wordmarkVariantNames },
    actionButtonsDisabled: { control: 'boolean' },
    baseline: range(0.2, 0.5, 0.01),
    columnTop: range(0.3, 0.8, 0.01),
    density: range(0, 1.5, 0.01),
    pressure: range(0.2, 1.5, 0.01),
    glow: range(0, 2, 0.05),
    spanTop: range(0, 0.3, 0.01),
    seed: range(1, 50, 1),
  },
  args: {
    intro: true,
    wordmark: 'futMichroma',
    actionButtonsDisabled: false,
    baseline: 0.3,
    columnTop: 0.48,
    mask: 'dissolve',
    maskFeather: 0.1,
    maskPad: -0.03,
    rainTop: 0.9,
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

export const Intro: Story = {};
export const Static: Story = { args: { intro: false } };
