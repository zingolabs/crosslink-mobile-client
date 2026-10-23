import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ScheduledActionDetail from './ScheduledActionDetail';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';
import {
  mockScheduledActions,
  mockWalletBonds,
} from '../../.storybook/mockStaking';

const [stakeAction, unstakeAction] = mockScheduledActions;

const meta = {
  title: 'Staking/ScheduledActionDetail',
  component: ScheduledActionDetail,
  args: {
    ...screenProps(RouteEnum.ScheduledActionDetail, { item: stakeAction }),
    stakeTransaction: async () => 'storybook-txid',
    beginUnstakeTransaction: async () => 'storybook-txid',
    withdrawBondTransaction: async () => 'storybook-txid',
    redelegateTransaction: async () => 'storybook-txid',
  },
  parameters: {
    context: {
      scheduledActions: mockScheduledActions,
      walletBonds: mockWalletBonds,
    },
  },
} satisfies Meta<typeof ScheduledActionDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ScheduledStake: Story = {};

export const ScheduledUnstake: Story = {
  args: screenProps(RouteEnum.ScheduledActionDetail, { item: unstakeAction }),
};

/** Staking day is open, so the action can actually be executed. */
export const OnStakingDay: Story = {
  parameters: {
    context: {
      scheduledActions: mockScheduledActions,
      walletBonds: mockWalletBonds,
      stakingDay: true,
    },
  },
};
