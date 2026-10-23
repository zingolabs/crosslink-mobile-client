import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import About from './About';
import { RouteEnum } from '../../app/AppState';
import { screenProps } from '../../.storybook/screenProps';

/** NOTE: registered in no navigator — unreachable in the running app. */
const meta = {
  title: 'Unreachable/About',
  component: About,
  args: screenProps(RouteEnum.About),
} satisfies Meta<typeof About>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
