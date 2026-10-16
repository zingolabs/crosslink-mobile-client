import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Pools from './Pools';
import { RouteEnum } from '../../app/AppState';
import { mockScreenNavigation } from '../../.storybook/mockNavigation';
import { mockTotalBalance } from '../../__mocks__/dataMocks/mockTotalBalance';

/**
 * NOTE: this screen is currently registered in no navigator, so it is
 * unreachable in the running app. The story is the only way to see it.
 */
const meta = {
  title: 'Unreachable/Pools',
  component: Pools,
  args: {
    navigation: mockScreenNavigation,
    route: { key: 'pools-story', name: RouteEnum.Pools, params: undefined },
  },
} satisfies Meta<typeof Pools>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllPoolsFunded: Story = {
  parameters: {
    context: { orchardPool: true, saplingPool: true, transparentPool: true },
  },
};

export const OnlyOrchard: Story = {
  parameters: {
    context: { orchardPool: true, saplingPool: false, transparentPool: false },
  },
};

export const WithPendingAndShielding: Story = {
  parameters: { context: { somePending: true, shieldingAmount: 0.05 } },
};

export const EmptyWallet: Story = {
  parameters: {
    context: {
      totalBalance: {
        ...mockTotalBalance,
        totalTransparentBalance: 0,
        confirmedTransparentBalance: 0,
        totalSaplingBalance: 0,
        confirmedSaplingBalance: 0,
        totalOrchardBalance: 0,
        confirmedOrchardBalance: 0,
        totalSpendableBalance: 0,
      },
    },
  },
};
