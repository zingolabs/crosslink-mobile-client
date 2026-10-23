import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import Launching from './Launching';
import { LaunchingModeEnum } from '../../AppState';
import { mockContextLoading } from '../../../.storybook/mockContext';

const meta = {
  title: 'Onboarding/Launching',
  component: Launching,
  args: {
    empty: true,
    translate: mockContextLoading.translate,
    firstLaunchingMessage: LaunchingModeEnum.opening,
    biometricsFailed: false,
  },
} satisfies Meta<typeof Launching>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Opening: Story = {};

export const Installing: Story = {
  args: { firstLaunchingMessage: LaunchingModeEnum.installing },
};

export const Updating: Story = {
  args: { firstLaunchingMessage: LaunchingModeEnum.updating },
};

/** Shown while LoadedApp reads settings — the spinner has a background. */
export const NotEmpty: Story = { args: { empty: false } };

/** Device auth failed; the retry button is the only way forward. */
export const BiometricsFailed: Story = {
  args: { biometricsFailed: true, tryAgain: () => {} },
};

export const WithMessage: Story = {
  args: { message: 'Restoring wallet from seed…' },
};
