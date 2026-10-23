import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import DebugInfo from './DebugInfo';
import { RouteEnum } from '../../../app/AppState';
import { screenProps } from '../../../.storybook/screenProps';

const meta = {
  title: 'Settings/DebugInfo',
  component: DebugInfo,
  args: screenProps(RouteEnum.DebugInfo),
} satisfies Meta<typeof DebugInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLastError: Story = {
  parameters: { context: { lastError: 'Error: sync failed at block 2000000' } },
};
