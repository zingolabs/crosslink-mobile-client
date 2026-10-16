import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ScannerAddress from './ScannerAddress';
import { RouteEnum } from '../../../app/AppState';
import { screenProps } from '../../../.storybook/screenProps';

/** QR scanner for a recipient address. Camera preview is stubbed on web. */
const meta = {
  title: 'Send & Receive/ScannerAddress',
  component: ScannerAddress,
  args: screenProps(RouteEnum.ScannerAddress, {
    setAddress: () => {},
    active: true,
  }),
} satisfies Meta<typeof ScannerAddress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {};

export const Inactive: Story = {
  args: screenProps(RouteEnum.ScannerAddress, {
    setAddress: () => {},
    active: false,
  }),
};
