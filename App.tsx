/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo } from 'react';
import { BackHandler, LogBox, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  createNavigationContainerRef,
  LinkingOptions,
  NavigationContainer,
  ParamListBase,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoadedApp } from './app/LoadedApp';
import { LoadingApp } from './app/LoadingApp';
import { AppStackParamList } from './app/types';
import { ThemeProvider, navigationTheme, useTheme } from './app/theme';
import { RouteEnum } from './app/AppState';
import ReactScanGate from './app/devtools/ReactScan';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

const Stack = createNativeStackNavigator<AppStackParamList>();

const navigationRef = createNavigationContainerRef<AppStackParamList>();

const linking: LinkingOptions<AppStackParamList> = {
  prefixes: ['delegator://'],
  config: {
    screens: {
      [RouteEnum.LoadingApp]: 'loading',
      [RouteEnum.LoadedApp]: {
        screens: {
          [RouteEnum.MainTabs]: {
            screens: {
              [RouteEnum.StakingHome]: 'reminder-opened',
            },
          },
        },
      } as ParamListBase,
    },
  },
};

const AppContent: React.FunctionComponent = () => {
  const { colors } = useTheme();
  const theme = useMemo(() => navigationTheme(colors), [colors]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }
      return true;
    });

    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={colors.bgCanvas} />
      <NavigationContainer ref={navigationRef} theme={theme} linking={linking}>
        <Stack.Navigator
          initialRouteName={RouteEnum.LoadingApp}
          screenOptions={{ headerShown: false, animation: 'fade' }}
        >
          <Stack.Screen name={RouteEnum.LoadingApp}>
            {props => <LoadingApp {...props} />}
          </Stack.Screen>
          <Stack.Screen name={RouteEnum.LoadedApp}>
            {props => (
              <SafeAreaView style={{ flex: 1 }}>
                <LoadedApp {...props} />
              </SafeAreaView>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const App: React.FunctionComponent = () => (
  <ReactScanGate>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  </ReactScanGate>
);

export default App;
