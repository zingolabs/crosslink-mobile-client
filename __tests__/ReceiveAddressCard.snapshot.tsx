/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import ReceiveAddressCard from '../components/Receive/components/ReceiveAddressCard';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { ScreenEnum } from '../app/AppState';

// test suite
describe('Component ReceiveAddressCard - test', () => {
  //snapshot test
  test('ReceiveAddressCard - snapshot', () => {
    const set = jest.fn();
    const card = render(
      <ReceiveAddressCard
        address={mockAddresses[0]}
        screenName={ScreenEnum.Receive}
        show={set}
        onChangeTab={set}
      />,
    );
    expect(card.toJSON()).toMatchSnapshot();
  });
});
