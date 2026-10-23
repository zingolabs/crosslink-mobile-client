import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ScannerUfvk from './ScannerUfvk';

/**
 * NOTE: imported by nothing — unreachable in the running app.
 * The camera preview is stubbed on web.
 */
const meta = {
  title: 'Unreachable/ScannerUfvk',
  component: ScannerUfvk,
  args: { setUfvkText: () => {}, closeModal: () => {} },
} satisfies Meta<typeof ScannerUfvk>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
