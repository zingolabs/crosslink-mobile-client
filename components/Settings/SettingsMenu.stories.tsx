import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import SettingsMenu from './SettingsMenu';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';

/** The settings root that actually ships (the old Settings screen is dead). */
const meta = {
  title: 'Settings/SettingsMenu',
  component: SettingsMenu,
  args: {
    ...screenProps(RouteEnum.SettingsMenu),
    onClickOKChangeWallet: async () => {},
  },
} satisfies Meta<typeof SettingsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A view-only wallet has no seed to reveal. */
export const ReadOnlyWallet: Story = {
  parameters: { context: { readOnly: true } },
};
