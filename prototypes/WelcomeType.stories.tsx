import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import WelcomeType, { welcomeVariants } from './WelcomeType';

/**
 * Typographic explorations for the Welcome screen. Eight directions that
 * differ in scale, face, case, alignment and copy. Buttons and header are
 * unchanged from StartMenu.
 */
const meta = {
  title: 'Prototypes/Welcome type',
  component: WelcomeType,
  argTypes: {
    variant: { control: 'select', options: welcomeVariants },
    background: { control: 'inline-radio', options: ['flat', 'vaporSun'] },
  },
  args: {
    variant: 'octave',
    background: 'flat',
    actionButtonsDisabled: false,
    createNewWallet: () => {},
    getwalletToRestore: () => {},
    openServers: () => {},
  },
} satisfies Meta<typeof WelcomeType>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 64/32/16 scale, heavy lowercase wordmark, bottom-left. */
export const Octave: Story = {};
/** Serif greeting with round forms. */
export const Rounds: Story = { args: { variant: 'rounds' } };
/** Monospace status readout. */
export const Ledger: Story = { args: { variant: 'ledger' } };
/** Centered italic serif headline with an eyebrow. */
export const Editorial: Story = { args: { variant: 'editorial' } };
/** Three words, 1:2:1 weight rhythm, wide tracking. */
export const Stack: Story = { args: { variant: 'stack' } };
/** Small type, lots of space. */
export const Whisper: Story = { args: { variant: 'whisper' } };
/** Giant cropped Z in surface tone behind a compact title. */
export const Glyph: Story = { args: { variant: 'glyph' } };
/** Rotated wordmark along the left edge. */
export const Spine: Story = { args: { variant: 'spine' } };
/** Octave over the vapor sun. */
export const OctaveVaporSun: Story = { args: { background: 'vaporSun' } };
