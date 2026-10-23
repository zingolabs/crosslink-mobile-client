import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Send from './Send';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';

const meta = {
  title: 'Send & Receive/Send',
  component: Send,
  args: {
    ...screenProps(RouteEnum.Send),
    setShieldingAmount: () => {},
    setScrollToTop: () => {},
    setScrollToBottom: () => {},
    clearToAddr: () => {},
    sendTransaction: async () => 'storybook-txid',
    setServerOption: async () => {},
    setSecurityOption: async () => {},
  },
} satisfies Meta<typeof Send>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** No spendable funds — the send button must stay disabled. */
export const ZeroBalance: Story = {
  parameters: { context: { totalBalance: null } },
};

export const ReadOnlyWallet: Story = {
  parameters: { context: { readOnly: true } },
};

/** Transparent funds waiting to be shielded. */
export const WithShieldingAmount: Story = {
  parameters: { context: { shieldingAmount: 0.05 } },
};

export const SendAllEnabled: Story = {
  parameters: { context: { sendAll: true } },
};

export const DonationEnabled: Story = {
  parameters: { context: { donation: true } },
};

export const Offline: Story = {
  parameters: { context: { netInfo: { isConnected: false, type: 'none' } } },
};
