import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ChooseIndexer from './ChooseIndexer';

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
  title: 'Onboarding/ChooseIndexer',
  component: ChooseIndexer,
  args: {
    indexerList: Object.keys(latencies).map(url => ({ url })),
    pingServer,
  },
} satisfies Meta<typeof ChooseIndexer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pushed from the welcome screen. The listed card probes on mount. */
export const Default: Story = {};

/** Every probe is still in flight. */
export const Checking: Story = {
  args: { pingServer: () => new Promise(() => {}) },
};

/** Nothing responds. */
export const AllOffline: Story = {
  args: { pingServer: async () => null },
};

/** The aggregator returned nothing. */
export const EmptyList: Story = { args: { indexerList: [] } };
