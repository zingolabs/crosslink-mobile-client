import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import AddressList from './AddressList';
import { AddressKindEnum, RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';

/** NOTE: registered in no navigator — unreachable in the running app. */
const meta = {
  title: 'Unreachable/AddressList',
  component: AddressList,
  args: screenProps(RouteEnum.AddressList, {
    addressKind: AddressKindEnum.u,
    setIndex: () => {},
  }),
} satisfies Meta<typeof AddressList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unified: Story = {};

export const Transparent: Story = {
  args: screenProps(RouteEnum.AddressList, {
    addressKind: AddressKindEnum.t,
    setIndex: () => {},
  }),
};

export const NoAddresses: Story = {
  parameters: { context: { addresses: [] } },
};
