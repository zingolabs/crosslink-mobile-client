import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Staking from './Staking';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';
import {
  mockGlobalStaked,
  mockScheduledActions,
  mockStaked,
  mockWalletBonds,
} from '../../.storybook/mockStaking';

/** The Staking tab. `route.params.tab` selects the sub-tab. */
const meta = {
  title: 'Main/Staking',
  component: Staking,
  args: screenProps(RouteEnum.StakingHome, { tab: 'active' as const }),
  parameters: {
    context: {
      staked: mockStaked,
      globalStaked: mockGlobalStaked,
      walletBonds: mockWalletBonds,
      scheduledActions: mockScheduledActions,
    },
  },
} satisfies Meta<typeof Staking>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveTab: Story = {};

export const MyStakeTab: Story = {
  args: screenProps(RouteEnum.StakingHome, { tab: 'my' as const }),
};

export const ScheduledTab: Story = {
  args: screenProps(RouteEnum.StakingHome, { tab: 'scheduled' as const }),
};

/** Nothing staked and nothing scheduled. */
export const NothingStaked: Story = {
  parameters: {
    context: {
      staked: [],
      globalStaked: mockGlobalStaked,
      walletBonds: [],
      scheduledActions: [],
    },
  },
};

/** Staking day is open — the bubble and status bar change. */
export const OnStakingDay: Story = {
  parameters: {
    context: {
      staked: mockStaked,
      globalStaked: mockGlobalStaked,
      walletBonds: mockWalletBonds,
      scheduledActions: mockScheduledActions,
      stakingDay: true,
      timeLeftStakingDaySeconds: 3600,
      blocksLeftStakingDay: 120,
      blocksTotalStakingDay: 1152,
    },
  },
};
