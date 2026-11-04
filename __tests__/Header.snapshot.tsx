/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { Header } from '../components/Header';
import { appStore, defaultLoadedDomains } from '../app/store';
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
    appStore.setState(state);
    const about = render(
      <Header
        title="title"
        screenName={ScreenEnum.About}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
        closeScreen={close}
      />,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
  test('Header Complex - snapshot', () => {
    const state = defaultLoadedDomains;
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const onFunction = jest.fn();
    appStore.setState(state);
    const header = render(
      <Header
        title="title"
        screenName={ScreenEnum.History}
        testID="valuetransfer text"
        toggleMenuDrawer={onFunction}
        addLastSnackbar={onFunction}
        setShieldingAmount={onFunction}
      />,
    );
    expect(header.toJSON()).toMatchSnapshot();
  });
});
