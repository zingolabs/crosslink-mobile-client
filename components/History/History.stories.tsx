import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import History from './History';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';

/** The Home tab. */
const meta = {
  title: 'Main/History',
  component: History,
  args: {
    ...screenProps(RouteEnum.History),
    setShieldingAmount: () => {},
    setScrollToTop: () => {},
    scrollToTop: false,
    setScrollToBottom: () => {},
  },
} satisfies Meta<typeof History>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTransfers: Story = {};

/** Nothing received yet — the empty illustration should show. */
export const Empty: Story = {
  parameters: { context: { valueTransfers: [], valueTransfersTotal: 0 } },
};

/** Before the first sync completes the list is null, not empty. */
export const NotLoadedYet: Story = {
  parameters: { context: { valueTransfers: null, valueTransfersTotal: null } },
};

export const SomePending: Story = {
  parameters: { context: { somePending: true } },
};

export const PrivacyOn: Story = { parameters: { context: { privacy: true } } };

export const Offline: Story = {
  parameters: { context: { netInfo: { isConnected: false, type: 'none' } } },
};
