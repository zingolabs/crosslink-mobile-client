import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import CurrencyAmount from './CurrencyAmount';
import { CurrencyEnum } from '../../app/AppState';

const meta = {
  title: 'Primitives/CurrencyAmount',
  component: CurrencyAmount,
  args: { amtZec: 1.2345678, price: 32.5, currency: CurrencyEnum.USDCurrency },
  parameters: { phoneFrame: false },
} satisfies Meta<typeof CurrencyAmount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PrivacyOn: Story = { args: { privacy: true } };

/** No currency selected — the component should render nothing visible. */
export const NoCurrency: Story = { args: { currency: CurrencyEnum.noCurrency } };

export const NoPriceYet: Story = { args: { price: 0 } };
