import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Receive from './Receive';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';

const meta = {
  title: 'Send & Receive/Receive',
  component: Receive,
  args: {
    ...screenProps(RouteEnum.Receive),
    setSecurityOption: async () => {},
  },
} satisfies Meta<typeof Receive>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PrivacyOn: Story = { parameters: { context: { privacy: true } } };

/** Addresses not fetched yet. */
export const NoAddresses: Story = {
  parameters: { context: { addresses: null } },
};

export const ReadOnlyWallet: Story = {
  parameters: { context: { readOnly: true } },
};
