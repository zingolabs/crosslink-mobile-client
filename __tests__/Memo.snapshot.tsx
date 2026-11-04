/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Memo from '../components/Memo';
import { appStore, defaultLoadedDomains } from '../app/store';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SessionStackParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.Memo
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Memo,
      params: {
        message: '',
        includeUAMessage: true,
        setMessage: jest.fn(),
      },
    },
  };
}
// test suite
describe('Component Memo - test', () => {
  //snapshot test
  test('Memo - snapshot', () => {
    const state = defaultLoadedDomains;
    state.translate = mockTranslate;
    const props = makeDrawerProps();
    appStore.setState(state);
    const memo = render(<Memo {...props} />);
    expect(memo.toJSON()).toMatchSnapshot();
  });
});
