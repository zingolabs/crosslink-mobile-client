import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Info from './Info';
import { ChainNameEnum, CurrencyEnum, RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';
import { mockInfo } from '../../__mocks__/dataMocks/mockInfo';

/** NOTE: registered in no navigator — unreachable in the running app. */
const meta = {
  title: 'Unreachable/Info',
  component: Info,
  args: screenProps(RouteEnum.Info),
} satisfies Meta<typeof Info>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoCurrency: Story = {
  parameters: { context: { currency: CurrencyEnum.noCurrency } },
};

export const OnMainnet: Story = {
  parameters: {
    context: {
      info: { ...mockInfo, chainName: ChainNameEnum.mainChainName },
    },
  },
};
