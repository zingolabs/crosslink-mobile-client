/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { Import } from '../app/LoadingApp';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

// test suite
describe('Component Import - test', () => {
  //snapshot test
  test('Import - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const onCancel = jest.fn();
    const onOK = jest.fn();
    const importSeed = render(
      <ContextAppLoadedProvider value={state}>
        <Import
          actionButtonsDisabled={false}
          onClickCancel={onCancel}
          onClickOK={onOK}
        />
      </ContextAppLoadedProvider>,
    );
    expect(importSeed.toJSON()).toMatchSnapshot();
  });
});
