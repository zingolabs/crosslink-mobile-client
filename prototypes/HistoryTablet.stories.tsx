import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import HistoryTablet from './historyTablet/HistoryTablet';
import { tabletContext } from './historyTablet/data';

/**
 * The History tab on an 11" iPad in landscape. Split is the baseline
 * three-pane layout; the others add wallet summaries around it: privacy
 * and status, holdings over time, staking, the month in review, and a
 * widget overview. Flip with 1–6 or ←/→.
 */
const meta = {
  title: 'Prototypes/History tablet',
  component: HistoryTablet,
  parameters: {
    phoneFrame: false,
    context: tabletContext,
  },
  args: {
    onSend: fn(),
    onReceive: fn(),
    onFaucet: fn(),
    onShield: fn(),
    onStake: fn(),
  },
} satisfies Meta<typeof HistoryTablet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Landscape: Story = {};

export const PrivacyOn: Story = {
  parameters: { context: { privacy: true } },
};

export const Syncing: Story = {
  parameters: {
    context: {
      syncingStatus: {
        scan_ranges: [{ priority: 'Scanning', start_block: 0, end_block: 1 }],
        percentage_total_outputs_scanned: 62.4,
      },
    },
  },
};
