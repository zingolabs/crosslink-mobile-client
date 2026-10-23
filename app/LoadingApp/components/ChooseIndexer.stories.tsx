import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ChooseIndexer from './ChooseIndexer';
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
  ],
  errors: [],
};

const discover = async () => {
  await wait(1200);
  return report;
};

const meta = {
  title: 'Onboarding/ChooseIndexer',
  component: ChooseIndexer,
  args: { discover },
} satisfies Meta<typeof ChooseIndexer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pushed from the welcome screen. Discovery runs on mount. */
export const Default: Story = {};

/** Discovery is still running. */
export const Discovering: Story = {
  args: { discover: () => new Promise(() => {}) },
};

/** Nothing responds. */
export const NoneReachable: Story = {
  args: { discover: async () => ({ indexers: [], errors: [] }) },
};
