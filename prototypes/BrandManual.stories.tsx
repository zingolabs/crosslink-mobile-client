import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import BrandManual from './BrandManual';

/**
 * The whole brand on one scrollable page, driven by `app/theme/tokens.ts`.
 * Edit a token and this page updates. Add a section here when a new
 * primitive lands.
 */
const meta = {
  title: 'Prototypes/Brand Manual',
  component: BrandManual,
  // Not a screen: render full width, without the phone frame.
  parameters: { phoneFrame: false },
} satisfies Meta<typeof BrandManual>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Manual: Story = {};
