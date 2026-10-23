import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ValueTransferDetail from './ValueTransferDetail';
import { RouteEnum } from '../../../app/AppState';
import { screenProps } from '../../../.storybook/screenProps';
import { mockValueTransfers } from '../../../__mocks__/dataMocks/mockValueTransfers';

const [sent, memoToSelf] = mockValueTransfers;

const meta = {
  title: 'Transaction/ValueTransferDetail',
  component: ValueTransferDetail,
  args: screenProps(RouteEnum.ValueTransferDetail, {
    vt: sent,
    totalLength: mockValueTransfers.length,
  }),
} satisfies Meta<typeof ValueTransferDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sent: Story = {};

/** A memo-only transfer has no amount and no counterparty address. */
export const MemoToSelf: Story = {
  args: screenProps(RouteEnum.ValueTransferDetail, {
    vt: memoToSelf,
    totalLength: mockValueTransfers.length,
  }),
};

/** Zero confirmations — the pending state. */
export const Pending: Story = {
  args: screenProps(RouteEnum.ValueTransferDetail, {
    vt: { ...sent, confirmations: 0 },
    totalLength: mockValueTransfers.length,
  }),
};

export const PrivacyOn: Story = { parameters: { context: { privacy: true } } };
