import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { FinalizerDetail } from './FinalizerDetail';
import { RouteEnum } from '../../../app/AppState';
import { screenProps } from '../../../.storybook/screenProps';
import {
  mockFinalizerA,
  mockGlobalStaked,
  mockStaked,
  mockWalletBonds,
} from '../../../.storybook/mockStaking';

const meta = {
  title: 'Staking/FinalizerDetail',
  component: FinalizerDetail,
  args: screenProps(RouteEnum.FinalizerDetail, {
    finalizer: mockFinalizerA,
    lifehash: '',
  }),
  parameters: {
    context: {
      globalStaked: mockGlobalStaked,
      staked: mockStaked,
      walletBonds: mockWalletBonds,
    },
  },
} satisfies Meta<typeof FinalizerDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A finalizer this wallet has no position with. */
export const NotStakedWith: Story = {
  parameters: {
    context: {
      globalStaked: mockGlobalStaked,
      staked: [],
      walletBonds: [],
    },
  },
};
