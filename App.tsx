import React from 'react';
import { LogBox, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Boot from './app/lifecycle/Boot';
import Setup from './app/setup/Setup';
import Opening from './app/setup/Opening';
import Session from './app/session/Session';
import { ThemeProvider, useTheme } from './app/theme';
import { LifecycleProvider, useLifecycle } from './app/lifecycle';
import ReactScanGate from './app/devtools/ReactScan';
import { unreachable } from './app/lifecycle/phase';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

const AppContent: React.FunctionComponent = () => {
  const { colors } = useTheme();
  const { lifecycle } = useLifecycle();

  return (
    <>
      <StatusBar backgroundColor={colors.bgCanvas} />
      {(() => {
        switch (lifecycle.phase) {
          case 'booting':
            return <Boot />;
          case 'setup':
            return <Setup />;
          case 'opening':
            return <Opening />;
          case 'active':
          case 'locked':
            return <Session />;
          default:
            return unreachable(lifecycle);
        }
      })()}
    </>
  );
};

const App: React.FunctionComponent = () => (
  <ReactScanGate>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <LifecycleProvider>
            <AppContent />
          </LifecycleProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  </ReactScanGate>
);

export default App;
