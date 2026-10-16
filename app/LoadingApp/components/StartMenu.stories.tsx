import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import StartMenu from './StartMenu';

/** First screen of onboarding — the `screen === 1` branch of LoadingApp. */
const meta = {
  title: 'Onboarding/StartMenu',
  component: StartMenu,
  args: {
    actionButtonsDisabled: false,
    walletExists: false,
    playIntro: true,
    openCurrentWallet: () => {},
    createNewWallet: () => {},
    getwalletToRestore: () => {},
    openServers: () => {},
  },
} satisfies Meta<typeof StartMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fresh install: no wallet on device, so "open current wallet" is hidden. */
export const FirstInstall: Story = {};

export const WalletExists: Story = {
  args: { walletExists: true, playIntro: false },
};

/** Returning from a loaded wallet: same screen, no intro. */
export const ReturnFromWallet: Story = { args: { playIntro: false } };

/** While a server check is in flight every action is locked. */
export const ActionsDisabled: Story = {
  args: { walletExists: true, playIntro: false, actionButtonsDisabled: true },
};

export const Offline: Story = {
  args: { walletExists: true, playIntro: false },
  parameters: {
    contextLoading: { netInfo: { isConnected: false, type: 'none' } },
  },
};
