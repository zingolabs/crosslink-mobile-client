/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Pools from '../components/Pools';
import { appStore, defaultLoadedDomains } from '../app/store';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SessionStackParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.Pools
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Pools,
      params: undefined,
    },
  };
}
// test suite
describe('Component Pools - test', () => {
  //snapshot test
  const state = defaultLoadedDomains;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  const props = makeDrawerProps();
  test('Pools - snapshot', () => {
    appStore.setState(state);
    const pools = render(<Pools {...props} />);
    expect(pools.toJSON()).toMatchSnapshot();
  });
});
