import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ComputingError from './ComputingError';
import { RouteEnum } from '../../AppState';
import { screenProps } from '../../../.storybook/screenProps';

/** Failure screen after a broadcast attempt. */
const meta = {
  title: 'Transaction/ComputingError',
  component: ComputingError,
  args: screenProps(RouteEnum.ComputingError, {
    error: 'Insufficient balance to cover the fee',
  }),
} satisfies Meta<typeof ComputingError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Long RPC errors are the realistic case — check wrapping. */
export const LongError: Story = {
  args: screenProps(RouteEnum.ComputingError, {
    error:
      'Error: proposal failed: insufficient funds: available 0.00012345 ZEC, required 0.50010000 ZEC including a fee of 0.00010000 ZEC across 3 transparent and 2 orchard inputs',
  }),
};
