import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Rescan from './Rescan';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';

/** NOTE: registered in no navigator — unreachable in the running app. */
const meta = {
  title: 'Unreachable/Rescan',
  component: Rescan,
  args: { ...screenProps(RouteEnum.Rescan), doRescan: async () => {} },
} satisfies Meta<typeof Rescan>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Rescan needs a server, so the offline copy differs. */
export const Offline: Story = {
  parameters: { context: { netInfo: { isConnected: false, type: 'none' } } },
};
