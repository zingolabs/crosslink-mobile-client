import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import ZecAmount from './ZecAmount';
import { CurrencyNameEnum } from '../../app/AppState';

const meta = {
  title: 'Primitives/ZecAmount',
  component: ZecAmount,
  args: {
    amtZec: 1.2345678,
    currencyName: CurrencyNameEnum.ZEC,
    size: 24,
  },
  argTypes: {
    prefix: { control: 'inline-radio', options: [undefined, '+', '-'] },
  },
  parameters: { phoneFrame: false },
} satisfies Meta<typeof ZecAmount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Incoming: Story = { args: { prefix: '+' } };

export const Outgoing: Story = { args: { prefix: '-' } };

/** Privacy mode replaces the digits — check the blur, not the number. */
export const PrivacyOn: Story = { args: { privacy: true } };

export const Zero: Story = { args: { amtZec: 0 } };

/** Eight decimals is the maximum precision; watch for truncation. */
export const MaxPrecision: Story = { args: { amtZec: 21000000.12345678 } };
