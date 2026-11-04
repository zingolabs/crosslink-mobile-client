/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import ValueTransferDetail from '../components/History/components/ValueTransferDetail';
import { appStore, defaultLoadedDomains } from '../app/store';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SessionStackParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(
  i: number,
): NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.ValueTransferDetail
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.ValueTransferDetail,
      params: {
        vt: mockValueTransfers[i],
        totalLength: mockValueTransfers.length,
      },
    },
  };
}
// test suite
describe('Component History ValueTransferDetail - test', () => {
  //unit test
  const state = defaultLoadedDomains;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.valueTransfers = mockValueTransfers;
  const props_0 = makeDrawerProps(0);
  test('History ValueTransferDetail - sent ValueTransfer with 2 addresses', () => {
    appStore.setState(state);
    render(<ValueTransferDetail {...props_0} />).toJSON();
    // rounded
    const num = screen.getAllByText('-0.12346');
    expect(num.length).toBe(1);
    screen.getByText('0.0001');
  });

  const props_1 = makeDrawerProps(1);
  test('History ValueTransferDetail - memo self sent ValueTransfer', () => {
    appStore.setState(state);
    render(<ValueTransferDetail {...props_1} />);
    const num = screen.getAllByText('0');
    expect(num.length).toBe(1);
    screen.getByText('0.0001');
  });

  const props_2 = makeDrawerProps(2);
  test('History ValueTransferDetail - self sent ValueTransfer', () => {
    appStore.setState(state);
    render(<ValueTransferDetail {...props_2} />);
    const num = screen.getAllByText('0');
    expect(num.length).toBe(1);
    screen.getByText('0.0001');
  });

  const props_3 = makeDrawerProps(3);
  test('History ValueTransferDetail - received ValueTransfer with 2 pools', () => {
    appStore.setState(state);
    render(<ValueTransferDetail {...props_3} />);
    const num = screen.getAllByText('0.77654');
    expect(num.length).toBe(1);
  });

  const props_4 = makeDrawerProps(4);
  test('History ValueTransferDetail - shield ValueTransfer', () => {
    appStore.setState(state);
    render(<ValueTransferDetail {...props_4} />);
    const num = screen.getAllByText('0.0009');
    expect(num.length).toBe(1);
    screen.getByText('0.0001');
  });

  const props_5 = makeDrawerProps(5);
  test('History ValueTransferDetail - Rejection ValueTransfer', () => {
    appStore.setState(state);
    render(<ValueTransferDetail {...props_5} />);
    const num = screen.getAllByText('-0.0009');
    expect(num.length).toBe(1);
    screen.getByText('0.0001');
  });
});
