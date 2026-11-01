import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Import from './Import';

/** The `Import` route of the loading stack: restore from seed phrase or view key. */
const meta = {
  title: 'Onboarding/Import',
  component: Import,
  args: {
    actionButtonsDisabled: false,
    onClickOK: () => {},
    onClickCancel: () => {},
  },
} satisfies Meta<typeof Import>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Restoring: Story = { args: { actionButtonsDisabled: true } };
