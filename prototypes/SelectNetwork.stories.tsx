import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import SelectNetwork from './SelectNetwork';

/**
 * The earlier network chooser, kept as a reference. Two cards lead to the
 * indexer list and to the custom form. Regtest is the flask in the header.
 */
const meta = {
  title: 'Prototypes/Select network',
  component: SelectNetwork,
  args: {
    fromSettings: false,
    disabled: false,
    onAvailable: () => {},
    onCustom: () => {},
    onRegtest: () => {},
    onBack: () => {},
  },
} satisfies Meta<typeof SelectNetwork>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstLaunch: Story = {};

export const FromSettings: Story = { args: { fromSettings: true } };

export const Checking: Story = { args: { disabled: true } };
