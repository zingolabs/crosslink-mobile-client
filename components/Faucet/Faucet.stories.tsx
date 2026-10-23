import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Faucet from './Faucet';
import { ChainNameEnum, RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';
import { mockInfo } from '../../__mocks__/dataMocks/mockInfo';

/** Testnet-only faucet request screen. */
const meta = {
  title: 'Send & Receive/Faucet',
  component: Faucet,
  args: screenProps(RouteEnum.Faucet),
} satisfies Meta<typeof Faucet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnRegtest: Story = {
  parameters: {
    context: {
      info: { ...mockInfo, chainName: ChainNameEnum.regtestChainName },
    },
  },
};

export const Offline: Story = {
  parameters: { context: { netInfo: { isConnected: false, type: 'none' } } },
};
