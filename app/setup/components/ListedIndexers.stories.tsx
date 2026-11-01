import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ListedIndexers from './ListedIndexers';
import { IndexerReport } from '../../indexers';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

const report: IndexerReport = {
  indexers: [
    {
      uri: 'http://88.198.67.189:18234',
      latencyMs: 42,
      tipHeight: 78916,
      tipAgeSecs: 12,
      fromPeers: false,
    },
    {
      uri: 'http://45.63.75.9:18234',
      latencyMs: 95,
      tipHeight: 78916,
      tipAgeSecs: 30,
      fromPeers: true,
    },
    {
      uri: 'http://70.34.220.94:18234',
      latencyMs: 180,
      tipHeight: 78910,
      tipAgeSecs: 400,
      fromPeers: true,
    },
  ],
  errors: [],
};

const discover = async () => {
  await wait(1200);
  return report;
};

const meta = {
  title: 'Onboarding/ListedIndexers',
  component: ListedIndexers,
  args: {
    previousServer: 'http://45.63.75.9:18234',
    setIndexerServer: async () => {},
    closeServers: () => {},
    discover,
  },
} satisfies Meta<typeof ListedIndexers>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Discovery runs on mount and the previous server stays selected. */
export const Default: Story = {};

/** Discovery is still running. */
export const Discovering: Story = {
  args: { discover: () => new Promise(() => {}) },
};

/** Nothing responds, so the only action is to check again. */
export const NoneReachable: Story = {
  args: { discover: async () => ({ indexers: [], errors: [] }) },
};
