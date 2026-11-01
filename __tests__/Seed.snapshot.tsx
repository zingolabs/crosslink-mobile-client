/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Seed from '../components/Seed';
import {
  SessionDomainsProvider,
  SetupDomainsProvider,
  defaultLoadedDomains,
  defaultSetupDomains,
} from '../app/context';
import { RouteEnum, SeedActionEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockWallet } from '../__mocks__/dataMocks/mockWallet';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SessionStackParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';
import NewSeed from '../app/setup/components/NewSeed';

function makeDrawerProps(
  a: SeedActionEnum,
): NativeStackScreenProps<SessionStackParamList, RouteEnum.Seed> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Seed,
      params: {
        action: a,
      },
    },
  };
}
// test suite
describe('Component Seed - test', () => {
  //snapshot test
  const stateLoaded = defaultLoadedDomains;
  stateLoaded.translate = mockTranslate;
  stateLoaded.wallet = mockWallet;
  stateLoaded.info = mockInfo;
  stateLoaded.totalBalance = mockTotalBalance;
  const onOk = jest.fn();
  let props = makeDrawerProps(SeedActionEnum.view);
  test('Seed View - snapshot', () => {
    const seed = render(
      <SessionDomainsProvider value={stateLoaded}>
        <Seed {...props} />
      </SessionDomainsProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  props = makeDrawerProps(SeedActionEnum.change);
  test('Seed Change - snapshot', () => {
    const seed = render(
      <SessionDomainsProvider value={stateLoaded}>
        <Seed {...props} />
      </SessionDomainsProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  props = makeDrawerProps(SeedActionEnum.server);
  test('Seed Server - snapshot', () => {
    const seed = render(
      <SessionDomainsProvider value={stateLoaded}>
        <Seed {...props} />
      </SessionDomainsProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  props = makeDrawerProps(SeedActionEnum.backup);
  test('Seed Backup - snapshot', () => {
    const seed = render(
      <SessionDomainsProvider value={stateLoaded}>
        <Seed {...props} />
      </SessionDomainsProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  const contextLoading = defaultSetupDomains;
  contextLoading.translate = mockTranslate;
  contextLoading.wallet = mockWallet;
  //contextLoading.totalBalance = mockTotalBalance;
  test('Seed New - snapshot', () => {
    const seed = render(
      <SetupDomainsProvider value={contextLoading}>
        <NewSeed onClickOK={onOk} />
      </SetupDomainsProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
});
