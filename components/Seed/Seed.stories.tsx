import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Seed from './Seed';
import { RouteEnum, SeedActionEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';
import { mockWallet } from '../../__mocks__/dataMocks/mockWallet';

const meta = {
  title: 'Settings/Seed',
  component: Seed,
  args: screenProps(RouteEnum.Seed, { action: SeedActionEnum.view }),
} satisfies Meta<typeof Seed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const View: Story = {};

export const PrivacyOn: Story = { parameters: { context: { privacy: true } } };

/** A view-only wallet holds a UFVK instead of a seed phrase. */
export const ReadOnlyWallet: Story = {
  parameters: { context: { readOnly: true } },
};

export const OldBirthday: Story = {
  parameters: { context: { wallet: { ...mockWallet, birthday: 419200 } } },
};
