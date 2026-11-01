/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { report } from './reporting';
import { useTheme } from './theme';
import Button from '../components/Components/Button';
import RegText from '../components/Components/RegText';
import FadeText from '../components/Components/FadeText';

type FallbackProps = {
  error: unknown;
  resetErrorBoundary: () => void;
};

const renderAppFallback = (props: FallbackProps) => <AppFallback {...props} />;
const renderScreenFallback = (props: FallbackProps) => (
  <ScreenFallback {...props} />
);

/** Full-screen fallback for a crashed React tree. */
const AppFallback: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const message = error instanceof Error ? error.message : String(error);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        padding: 24,
      }}
    >
      <RegText style={{ color: colors.fgDefault }}>
        {'Something went wrong.'}
      </RegText>
      <FadeText numberOfLines={3}>{message}</FadeText>
      <Button title={'Try again'} onPress={resetErrorBoundary} />
    </View>
  );
};

/** Inline fallback for a crashed tab or screen; the rest of the app keeps working. */
const ScreenFallback: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  const { colors } = useTheme();
  const message = error instanceof Error ? error.message : String(error);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
      }}
    >
      <RegText style={{ color: colors.fgDefault }}>
        {'This screen failed to load.'}
      </RegText>
      <FadeText numberOfLines={3}>{message}</FadeText>
      <Button title={'Try again'} onPress={resetErrorBoundary} />
    </View>
  );
};

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

/**
 * Last-resort boundary at the app root. Without it an uncaught render
 * exception unmounts the whole tree and the user sees an empty screen
 * with no way back.
 */
export const AppErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
}) => (
  <ReactErrorBoundary
    fallbackRender={renderAppFallback}
    onError={error => report(error)}
  >
    {children}
  </ReactErrorBoundary>
);

/**
 * Boundary for one screen (a tab, for example). A crash is contained in
 * that screen and can be retried without restarting the app.
 */
export const ScreenErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
}) => (
  <ReactErrorBoundary
    fallbackRender={renderScreenFallback}
    onError={error => report(error)}
  >
    {children}
  </ReactErrorBoundary>
);
