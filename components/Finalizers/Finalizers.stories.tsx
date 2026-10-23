import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Finalizers from './Finalizers';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';
import { mockGlobalStaked, mockStaked } from '../../.storybook/mockStaking';

/** Finalizer picker, presented as a modal from the staking flows. */
const meta = {
  title: 'Staking/Finalizers',
  component: Finalizers,
  args: screenProps(RouteEnum.Finalizers, {
    setFinalizer: () => {},
    scope: 'network' as const,
    exclude: '',
    goBackRoute: RouteEnum.Stake,
  }),
  parameters: {
    context: { globalStaked: mockGlobalStaked, staked: mockStaked },
  },
} satisfies Meta<typeof Finalizers>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NetworkScope: Story = {};

/** Only finalizers this wallet already stakes with. */
export const MyScope: Story = {
  args: screenProps(RouteEnum.Finalizers, {
    setFinalizer: () => {},
    scope: 'my' as const,
    exclude: '',
    goBackRoute: RouteEnum.Redelegate,
  }),
};

export const Empty: Story = {
  parameters: { context: { globalStaked: [], staked: [] } },
};
