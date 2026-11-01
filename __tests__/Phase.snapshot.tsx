/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Session from '../app/session/Session';
import Setup from '../app/setup/Setup';
import { LifecycleProvider } from '../app/lifecycle';
import {
  lifecycle,
  BootInfo,
} from '../app/lifecycle/phase';
import { LaunchingModeEnum } from '../app/AppState';
import { IndexerNetworkEnum } from '../app/AppState/enums/IndexerNetworkEnum';
import { fallbackSettings } from '../app/settingsBootstrap';

jest.mock('react-native-localize', () => ({
  findBestLanguageTag: jest.fn().mockImplementation(supportedLocales => {
    return { languageTag: supportedLocales?.[0] || 'en', isRTL: false };
  }),
}));

jest.mock('i18n-js');

const boot: BootInfo = {  settings: fallbackSettings,
  launching: LaunchingModeEnum.opening,
  indexerNetwork: IndexerNetworkEnum.stable,
  indexerServerPinned: false,
};

function SessionAtActive() {
  return (
    <LifecycleProvider initial={lifecycle.active(boot, {
      walletKind: {
        readOnly: false,
        orchardPool: true,
        saplingPool: true,
        transparentPool: true,
      },
      launching: LaunchingModeEnum.opening,
    })}>
      <Session />
    </LifecycleProvider>
  );
}

function SetupAtMenu() {
  return (
    <LifecycleProvider initial={lifecycle.setup(boot, true, true, false)}>
      <Setup />
    </LifecycleProvider>
  );
}

describe('Session - snapshot', () => {
  test('Session - active', () => {
    const session = render(<SessionAtActive />);
    expect(session.toJSON()).toMatchSnapshot();
  });
});

describe('Setup - snapshot', () => {
  test('Setup - menu', () => {
    const setup = render(<SetupAtMenu />);
    expect(setup.toJSON()).toMatchSnapshot();
  });
});
