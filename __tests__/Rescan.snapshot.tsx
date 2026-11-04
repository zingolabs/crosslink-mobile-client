/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Rescan from '../components/Rescan';
import { appStore, defaultLoadedDomains } from '../app/store';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockWallet } from '../__mocks__/dataMocks/mockWallet';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SessionStackParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.Rescan
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Rescan,
      params: undefined,
    },
  };
}
// test suite
describe('Component Rescan - test', () => {
  //snapshot test
  const state = defaultLoadedDomains;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.wallet = mockWallet;
  const onRescan = jest.fn();
  const props = makeDrawerProps();
  test('Rescan - snapshot', () => {
    appStore.setState(state);
    const rescan = render(<Rescan {...props} doRescan={onRescan} />);
    expect(rescan.toJSON()).toMatchSnapshot();
  });
});
