/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { Header } from '../components/Header';
import {
  SessionDomainsProvider,
  defaultLoadedDomains,
} from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { ScreenEnum } from '../app/AppState';

// test suite
describe('Component Header - test', () => {
  //snapshot test
  test('Header Simple - snapshot', () => {
    const state = defaultLoadedDomains;
    state.translate = mockTranslate;
    const close = jest.fn();
    const about = render(
      <SessionDomainsProvider value={state}>
        <Header
          title="title"
          screenName={ScreenEnum.About}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          closeScreen={close}
        />
      </SessionDomainsProvider>,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
  test('Header Complex - snapshot', () => {
    const state = defaultLoadedDomains;
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const onFunction = jest.fn();
    const header = render(
      <SessionDomainsProvider value={state}>
        <Header
          title="title"
          screenName={ScreenEnum.History}
          testID="valuetransfer text"
          toggleMenuDrawer={onFunction}
          addLastSnackbar={onFunction}
          setShieldingAmount={onFunction}
        />
      </SessionDomainsProvider>,
    );
    expect(header.toJSON()).toMatchSnapshot();
  });
});
