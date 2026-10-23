import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Computing from './Computing';
import {
  RouteEnum,
  SendPageStateClass,
  ToAddrClass,
} from '../../AppState';
import { screenProps } from '../../../.storybook/screenProps';

const sendPageStatePar = new SendPageStateClass(new ToAddrClass(0));

/** Shown while a transaction is being built and broadcast. */
const meta = {
  title: 'Transaction/Computing',
  component: Computing,
  args: screenProps(RouteEnum.Computing, { sendPageStatePar }),
} satisfies Meta<typeof Computing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
