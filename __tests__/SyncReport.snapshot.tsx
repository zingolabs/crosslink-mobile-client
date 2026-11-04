/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import SyncReport from '../components/SyncReport';
import { appStore, defaultLoadedDomains } from '../app/store';
import { mockWallet } from '../__mocks__/dataMocks/mockWallet';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import mockSyncingStatus from '../__mocks__/dataMocks/mockSyncingStatus';
import { mockNetInfo } from '../__mocks__/dataMocks/mockNetInfo';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SessionStackParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.SyncReport
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'About-1',
      name: RouteEnum.SyncReport,
      params: undefined,
    },
  };
}
// test suite
describe('Component SyncReport - test', () => {
  //snapshot test
  const state = defaultLoadedDomains;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.wallet = mockWallet;
  state.syncingStatus = mockSyncingStatus;
  state.netInfo = mockNetInfo;
  const props = makeDrawerProps();
  test('SyncReport - snapshot', () => {
    appStore.setState(state);
    const sync = render(<SyncReport {...props} />);
    expect(sync.toJSON()).toMatchSnapshot();
  });
});
