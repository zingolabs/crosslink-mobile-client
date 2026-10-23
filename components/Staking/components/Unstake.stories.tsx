import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Unstake } from '..';
import { RouteEnum } from '../../../app/AppState';
import { screenProps } from '../../../.storybook/screenProps';
import {
  mockFinalizerA,
  mockWalletBonds,
} from '../../../.storybook/mockStaking';

const meta = {
  title: 'Staking/Unstake',
  component: Unstake,
  args: screenProps(RouteEnum.Unstake, {
    finalizer: mockFinalizerA,
    txid: 'bond-txid-active-0001',
    staked: 0.5,
  }),
  parameters: { context: { walletBonds: mockWalletBonds } },
} satisfies Meta<typeof Unstake>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LargePosition: Story = {
  args: screenProps(RouteEnum.Unstake, {
    finalizer: mockFinalizerA,
    txid: 'bond-txid-active-0001',
    staked: 1234.56789,
  }),
};

/** No bond selected — params are optional at the type level. */
export const NoParams: Story = { args: screenProps(RouteEnum.Unstake) };
