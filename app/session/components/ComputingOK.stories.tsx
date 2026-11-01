import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ComputingOK from './ComputingOK';
import { RouteEnum } from '../../AppState';
import { screenProps } from '../../../.storybook/screenProps';

/** Success screen after a broadcast. */
const meta = {
  title: 'Transaction/ComputingOK',
  component: ComputingOK,
  args: screenProps(RouteEnum.ComputingOK, {
    txid: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  }),
} satisfies Meta<typeof ComputingOK>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Guard against a missing txid — the screen should not render "undefined". */
export const NoTxid: Story = {
  args: screenProps(RouteEnum.ComputingOK, { txid: '' }),
};
