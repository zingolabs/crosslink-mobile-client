import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import NewSeed from './NewSeed';
import { mockWallet } from '../../../__mocks__/dataMocks/mockWallet';

/** `screen === 2` — shown once, in a modal, right after wallet creation. */
const meta = {
  title: 'Onboarding/NewSeed',
  component: NewSeed,
  args: { onClickOK: () => {} },
} satisfies Meta<typeof NewSeed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OldBirthday: Story = {
  parameters: {
    contextLoading: { wallet: { ...mockWallet, birthday: 419200 } },
  },
};
