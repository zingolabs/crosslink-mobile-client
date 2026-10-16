import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Insight from './Insight';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';

/** NOTE: registered in no navigator — unreachable in the running app. */
const meta = {
  title: 'Unreachable/Insight',
  component: Insight,
  args: screenProps(RouteEnum.Insight),
} satisfies Meta<typeof Insight>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoTransfers: Story = {
  parameters: { context: { valueTransfers: [], valueTransfersTotal: 0 } },
};

export const PrivacyOn: Story = { parameters: { context: { privacy: true } } };
