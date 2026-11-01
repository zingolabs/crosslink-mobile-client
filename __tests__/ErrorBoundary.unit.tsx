/**
 * @format
 */

import 'react-native';
import React, { useState } from 'react';

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegText from '../components/Components/RegText';
import Button from '../components/Components/Button';

import { AppErrorBoundary, ScreenErrorBoundary } from '../app/ErrorBoundary';

jest.mock('../app/reporting', () => ({
  report: jest.fn(),
}));

const Broken: React.FC = () => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test('ScreenErrorBoundary shows the fallback when a child crashes', () => {
    const screen = render(
      <ScreenErrorBoundary>
        <Broken />
      </ScreenErrorBoundary>,
    );
    expect(screen.getByText('This screen failed to load.')).toBeTruthy();
    expect(screen.getByText(/boom/)).toBeTruthy();
  });

  test('ScreenErrorBoundary recovers when the child works again', async () => {
    const Toggle: React.FC<{
      children: (broken: boolean) => React.ReactNode;
    }> = ({ children }) => {
      const [broken, setBroken] = useState(true);
      return (
        <>
          {children(broken)}
          <Button title={'fix'} onPress={() => setBroken(false)} />
        </>
      );
    };

    const screen = render(
      <Toggle>
        {broken => (
          <ScreenErrorBoundary>
            {broken ? <Broken /> : <RegText>{'working'}</RegText>}
          </ScreenErrorBoundary>
        )}
      </Toggle>,
    );

    expect(screen.getByText('This screen failed to load.')).toBeTruthy();

    // fix the child first, then reset the boundary
    fireEvent(screen.getByText('fix'), 'press');
    fireEvent(screen.getByText('Try again'), 'press');
    await waitFor(() => expect(screen.queryByText('working')).toBeTruthy());
  });

  test('AppErrorBoundary reports the error and renders the app fallback', () => {
    const { report } = jest.requireMock('../app/reporting') as {
      report: jest.Mock;
    };

    const screen = render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong.')).toBeTruthy();
    expect(report).toHaveBeenCalled();
  });

  test('children render unchanged when nothing crashes', () => {
    const screen = render(
      <AppErrorBoundary>
        <ScreenErrorBoundary>
          <RegText>{'all fine'}</RegText>
        </ScreenErrorBoundary>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('all fine')).toBeTruthy();
  });
});
