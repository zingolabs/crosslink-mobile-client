import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import SyncReport from './SyncReport';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';
import { mockSyncingStatus } from '../../__mocks__/dataMocks/mockSyncingStatus';

/**
 * NOTE: registered in no navigator. Header.tsx:371,409 and
 * WalletSummaryHeader.tsx:107 still navigate here, and do nothing.
 */
const meta = {
  title: 'Unreachable/SyncReport',
  component: SyncReport,
  args: screenProps(RouteEnum.SyncReport),
} satisfies Meta<typeof SyncReport>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Syncing: Story = {};

export const Finished: Story = {
  parameters: {
    context: {
      syncingStatus: { ...mockSyncingStatus, in_progress: false },
    },
  },
};

export const Offline: Story = {
  parameters: { context: { netInfo: { isConnected: false, type: 'none' } } },
};

export const OnCellular: Story = {
  parameters: {
    context: {
      netInfo: {
        isConnected: true,
        type: 'cellular',
        isConnectionExpensive: true,
      },
    },
  },
};
