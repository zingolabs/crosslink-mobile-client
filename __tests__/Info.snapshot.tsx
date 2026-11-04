/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, RenderResult } from '@testing-library/react-native';
import Info from '../components/Info';
import { appStore, defaultLoadedDomains } from '../app/store';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SessionStackParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.Info
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Info,
      params: undefined,
    },
  };
}
// test suite
describe('Component Info - test', () => {
  //snapshot test
  test('Info - snapshot', () => {
    const state = defaultLoadedDomains;
    state.info = mockInfo;
    state.zecPrice = mockZecPrice;
    state.translate = mockTranslate;
    state.totalBalance = mockTotalBalance;
    const props = makeDrawerProps();
    appStore.setState(state);
    const info: RenderResult = render(<Info {...props} />);
    expect(info.toJSON()).toMatchSnapshot();
  });
});
