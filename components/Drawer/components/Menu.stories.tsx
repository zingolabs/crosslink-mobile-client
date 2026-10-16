import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Menu from './Menu';
import { ScreenEnum } from '../../../app/AppState';

/**
 * NOTE: the drawer was removed when the app moved to bottom tabs, so this menu
 * is unreachable. It is the old entry point to About / Settings / Info / Seed /
 * Rescan / Sync Report / Fund Pools — most of the other unreachable screens.
 */
const meta = {
  title: 'Unreachable/Drawer Menu',
  component: Menu,
  args: {
    onItemSelected: () => {},
    screenName: ScreenEnum.History,
    toggleMenuDrawer: () => {},
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A view-only wallet shows "wallet UFVK" instead of "wallet seed". */
export const ReadOnlyWallet: Story = {
  parameters: { context: { readOnly: true } },
};
