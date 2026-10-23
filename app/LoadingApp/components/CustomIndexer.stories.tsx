import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import CustomIndexer from './CustomIndexer';
import { Probe } from '../../indexers';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

const probe: Probe = async uri => {
  await wait(800);
  return {
    uri,
    latencyMs: 64,
    tipHeight: 78916,
    tipAgeSecs: 12,
    fromPeers: false,
  };
};

const meta = {
  title: 'Onboarding/CustomIndexer',
  component: CustomIndexer,
  args: {
    setIndexerServer: async () => {},
    closeServers: () => {},
    probe,
  },
} satisfies Meta<typeof CustomIndexer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Type `host:port`. The probe runs by itself once the value is complete. */
export const Default: Story = {};

/** The endpoint answers on another chain or not at all. */
export const Rejected: Story = {
  args: { probe: async () => null },
};
