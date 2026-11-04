/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import Info from '../components/Info';
import { appStore, defaultLoadedDomains } from '../app/store';
import { CurrencyEnum, RouteEnum } from '../app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SessionStackParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

// don't delete -> mocking in Spanish.
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: ',', // es
      groupingSeparator: '.', // es
    };
  },
}));

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
  //unit test
  test('Info - price with es (,) decimal point', () => {
    const state = defaultLoadedDomains;
    state.info = mockInfo;
    state.zecPrice = mockZecPrice;
    state.currency = CurrencyEnum.USDCurrency;
    const props = makeDrawerProps();
    appStore.setState(state);
    render(<Info {...props} />);
    screen.getByText('$ 33,33');
  });
});
