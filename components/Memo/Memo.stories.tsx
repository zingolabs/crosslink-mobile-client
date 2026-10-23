import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Memo from './Memo';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';

/** NOTE: registered in no navigator — the send flow no longer opens it. */
const meta = {
  title: 'Unreachable/Memo',
  component: Memo,
  args: screenProps(RouteEnum.Memo, {
    message: '',
    includeUAMessage: false,
    setMessage: () => {},
  }),
} satisfies Meta<typeof Memo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithText: Story = {
  args: screenProps(RouteEnum.Memo, {
    message: 'Thanks for lunch',
    includeUAMessage: false,
    setMessage: () => {},
  }),
};

/** Including the reply address eats into the 512-byte budget. */
export const WithReplyAddress: Story = {
  args: screenProps(RouteEnum.Memo, {
    message: 'Reply to me',
    includeUAMessage: true,
    setMessage: () => {},
  }),
};
