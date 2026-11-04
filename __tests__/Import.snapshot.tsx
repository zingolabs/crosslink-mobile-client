/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Import from '../app/setup/components/Import';
import { appStore, defaultLoadedDomains } from '../app/store';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

// test suite
describe('Component Import - test', () => {
  //snapshot test
  test('Import - snapshot', () => {
    const state = defaultLoadedDomains;
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const onCancel = jest.fn();
    const onOK = jest.fn();
    appStore.setState(state);
    const importSeed = render(
      <Import
        actionButtonsDisabled={false}
        onClickCancel={onCancel}
        onClickOK={onOK}
      />,
    );
    expect(importSeed.toJSON()).toMatchSnapshot();
  });
});
