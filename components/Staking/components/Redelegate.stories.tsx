import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Redelegate from './Redelegate';
import { RouteEnum } from '../../../app/AppState';
import { screenProps } from '../../../.storybook/screenProps';
import {
  mockFinalizerA,
  mockGlobalStaked,
  mockWalletBonds,
} from '../../../.storybook/mockStaking';

const meta = {
  title: 'Staking/Redelegate',
  component: Redelegate,
  args: screenProps(RouteEnum.Redelegate, {
    finalizer: mockFinalizerA,
    txid: 'bond-txid-active-0001',
    staked: 0.5,
  }),
  parameters: {
    context: { walletBonds: mockWalletBonds, globalStaked: mockGlobalStaked },
  },
} satisfies Meta<typeof Redelegate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Only one finalizer exists, so there is nowhere to move the stake. */
export const NoAlternativeFinalizer: Story = {
  parameters: {
    context: {
      walletBonds: mockWalletBonds,
      globalStaked: [mockGlobalStaked[0]],
    },
  },
};
