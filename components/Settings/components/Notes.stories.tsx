import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Notes } from './Notes';

/** Static release-notes screen. Takes no props. */
const meta = {
  title: 'Settings/Notes',
  component: Notes,
} satisfies Meta<typeof Notes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
