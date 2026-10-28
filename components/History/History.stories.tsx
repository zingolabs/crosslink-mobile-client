import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import History from './History';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';
import { mockValueTransfers } from '../../__mocks__/dataMocks/mockValueTransfers';
import { RPCValueTransferStatusEnum } from '../../app/wallet/enums/RPCValueTransferStatusEnum';

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

/** The newest transfer is still in the mempool: the loader takes the time slot. */
export const SomePending: Story = {
  parameters: {
    context: {
      valueTransfers: [
        {
          ...mockValueTransfers[0],
          txid: 'pending-txid',
          confirmations: 0,
          status: RPCValueTransferStatusEnum.mempool,
          time: Math.floor(Date.now() / 1000),
        },
        ...mockValueTransfers,
      ],
    },
  },
};

export const PrivacyOn: Story = { parameters: { context: { privacy: true } } };

export const Offline: Story = {
  parameters: { context: { netInfo: { isConnected: false, type: 'none' } } },
};
