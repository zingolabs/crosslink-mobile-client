import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ListedIndexers from './ListedIndexers';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

const latencies: Record<string, number | null> = {
  'https://zec.rocks:443': 180,
  'https://na.zec.rocks:443': 42,
  'https://eu.zec.rocks:443': 95,
  'https://ai.zec.rocks:443': null,
};

const pingServer = async (uri: string) => {
  const ms = latencies[uri] ?? null;
  await wait(ms ?? 1500);
  return ms;
};

const meta = {
  title: 'Onboarding/ListedIndexers',
  component: ListedIndexers,
  args: {
    indexerList: Object.keys(latencies).map(url => ({ url })),
    previousServer: 'https://zec.rocks:443',
    setIndexerServer: async () => {},
    closeServers: () => {},
    pingServer,
  },
} satisfies Meta<typeof ListedIndexers>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Indexers are probed on mount. */
export const Default: Story = {};

/** Every probe is still in flight. */
export const Checking: Story = {
  args: { pingServer: () => new Promise(() => {}) },
};

/** Nothing responds, so the only action is to check again. */
export const AllOffline: Story = {
  args: { pingServer: async () => null },
};

/** The aggregator returned nothing. */
export const EmptyList: Story = { args: { indexerList: [] } };
