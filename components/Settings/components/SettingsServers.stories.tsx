import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import SettingsServers from './SettingsServers';
import { RouteEnum, SelectServerEnum } from '../../../app/AppState';
import { screenProps } from '../../../.storybook/screenProps';

const meta = {
  title: 'Settings/SettingsServers',
  component: SettingsServers,
  args: {
    ...screenProps(RouteEnum.SettingsServers),
    navigateToLoadingApp: async () => {},
  },
} satisfies Meta<typeof SettingsServers>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FromList: Story = {};

export const CustomServer: Story = {
  parameters: { context: { selectIndexerServer: SelectServerEnum.custom } },
};

export const AutoSelect: Story = {
  parameters: { context: { selectIndexerServer: SelectServerEnum.auto } },
};

export const OfflineMode: Story = {
  parameters: { context: { selectIndexerServer: SelectServerEnum.offline } },
};
