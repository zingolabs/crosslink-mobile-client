import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Distribution from './Distribution';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';
import { mockGlobalStaked, mockStaked } from '../../.storybook/mockStaking';

/** Network-wide voting power distribution. */
const meta = {
  title: 'Staking/Distribution',
  component: Distribution,
  args: screenProps(RouteEnum.Distribution),
  parameters: {
    context: { globalStaked: mockGlobalStaked, staked: mockStaked },
  },
} satisfies Meta<typeof Distribution>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoStakeOnNetwork: Story = {
  parameters: { context: { globalStaked: [], staked: [] } },
};

/** One finalizer holds everything — the extreme layout case. */
export const SingleFinalizer: Story = {
  parameters: {
    context: { globalStaked: [mockGlobalStaked[0]], staked: mockStaked },
  },
};
