import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Confirm from './Confirm';
import {
  RouteEnum,
  SendPageStateClass,
  ToAddrClass,
} from '../../../app/AppState';
import { screenProps } from '../../../.storybook/screenProps';
import { mockAddresses } from '../../../__mocks__/dataMocks/mockAddresses';

/**
 * NOTE: imported by nothing — unreachable in the running app.
 * Send.tsx:767 now fires a plain Alert *after* broadcast, so the user no
 * longer sees fee or privacy level before signing.
 */
const toAddr = new ToAddrClass(0);
toAddr.to = mockAddresses[0].address;
toAddr.amount = '0.25';
toAddr.memo = 'Thanks!';

const sendPageState = new SendPageStateClass(toAddr);

const parseAddressInfoJSON = {
  status: 'success',
  chain_name: 'test',
  address_kind: 'unified',
  receivers_available: ['orchard', 'sapling'],
} as never;

const meta = {
  title: 'Unreachable/Confirm',
  component: Confirm,
  args: screenProps(RouteEnum.Confirm, {
    calculatedFee: 0.0001,
    parseAddressInfoJSON,
    donationAmount: 0,
    confirmSend: async () => {},
    sendAllAmount: false,
    calculateFeeWithPropose: async () => {},
    sendPageState,
  }),
} satisfies Meta<typeof Confirm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDonation: Story = {
  args: screenProps(RouteEnum.Confirm, {
    calculatedFee: 0.0001,
    parseAddressInfoJSON,
    donationAmount: 0.0001,
    confirmSend: async () => {},
    sendAllAmount: false,
    calculateFeeWithPropose: async () => {},
    sendPageState,
  }),
};

export const SendAll: Story = {
  args: screenProps(RouteEnum.Confirm, {
    calculatedFee: 0.0001,
    parseAddressInfoJSON,
    donationAmount: 0,
    confirmSend: async () => {},
    sendAllAmount: true,
    calculateFeeWithPropose: async () => {},
    sendPageState,
  }),
};

export const PrivacyOn: Story = { parameters: { context: { privacy: true } } };
