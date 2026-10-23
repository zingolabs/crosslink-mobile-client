import type { StorybookConfig } from '@storybook/react-native';

const main: StorybookConfig = {
  stories: [
    '../components/**/*.stories.?(ts|tsx)',
    '../app/**/*.stories.?(ts|tsx)',
    '../prototypes/**/*.stories.?(ts|tsx)',
  ],
  deviceAddons: [
    '@storybook/addon-ondevice-controls',
    '@storybook/addon-ondevice-actions',
    '@storybook/addon-ondevice-backgrounds',
  ],
};

export default main;
