import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { AddStakeScreen } from '..';
import { RouteEnum } from '../../../app/AppState';
import { screenProps } from '../../../.storybook/screenProps';
import {
  mockGlobalStaked,
  mockScheduledActions,
} from '../../../.storybook/mockStaking';

const meta = {
  title: 'Staking/AddStake',
  component: AddStakeScreen,
  args: screenProps(RouteEnum.Stake, {}),
  parameters: {
    context: {
      globalStaked: mockGlobalStaked,
      scheduledActions: mockScheduledActions,
    },
  },
} satisfies Meta<typeof AddStakeScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Staking day is open, so staking is actually possible. */
export const OnStakingDay: Story = {
  parameters: {
    context: {
      globalStaked: mockGlobalStaked,
      scheduledActions: mockScheduledActions,
      stakingDay: true,
    },
  },
};

export const NoBalance: Story = {
  parameters: {
    context: { globalStaked: mockGlobalStaked, totalBalance: null },
  },
};

export const NoFinalizersYet: Story = {
  parameters: { context: { globalStaked: [], scheduledActions: [] } },
};
