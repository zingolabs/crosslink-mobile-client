import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Settings } from '.';
import { RouteEnum, SelectServerEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';

/**
 * NOTE: registered in no navigator. Superseded by SettingsMenu, which exposes
 * only seed / servers / debug / notes. Everything else here is unreachable:
 * currency, language, send-all, donation, privacy, rescan menu, performance.
 */
const meta = {
  title: 'Unreachable/Settings',
  component: Settings,
  args: {
    ...screenProps(RouteEnum.Settings),
    toggleMenuDrawer: () => {},
    setServerOption: async () => {},
    setCurrencyOption: async () => {},
    setLanguageOption: async () => {},
    setSendAllOption: async () => {},
    setDonationOption: async () => {},
    setSecurityOption: async () => {},
    setSelectServerOption: async () => {},
    setRescanMenuOption: async () => {},
    setRecoveryWalletInfoOnDeviceOption: async () => {},
    setPerformanceLevelOption: async () => {},
  },
} satisfies Meta<typeof Settings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomServer: Story = {
  parameters: { context: { selectIndexerServer: SelectServerEnum.custom } },
};

export const OfflineMode: Story = {
  parameters: { context: { selectIndexerServer: SelectServerEnum.offline } },
};

export const ReadOnlyWallet: Story = {
  parameters: { context: { readOnly: true } },
};
