import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import CustomIndexer from './CustomIndexer';
import { ChainNameEnum } from '../../AppState';

const meta = {
  title: 'Onboarding/CustomIndexer',
  component: CustomIndexer,
  args: {
    setIndexerServer: async () => {},
    closeServers: () => {},
  },
} satisfies Meta<typeof CustomIndexer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Type `host:port`. The probe runs by itself once the value is complete. */
export const Default: Story = {};

/** Opened from Settings with regtest preselected. */
export const Regtest: Story = {
  args: { initialNetwork: ChainNameEnum.regtestChainName },
};
