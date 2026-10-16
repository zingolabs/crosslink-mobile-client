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
import { createStackNavigator } from '@react-navigation/stack';

import { LoadedApp } from './app/LoadedApp';
import { LoadingApp } from './app/LoadingApp';
import { AppStackParamList } from './app/types';
import { ThemeProvider, navigationTheme, useTheme } from './app/theme';
import { RouteEnum } from './app/AppState';
import { BackdropHost } from './app/Backdrop';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

const Stack = createStackNavigator<AppStackParamList>();

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
        <BackdropHost>
          <SafeAreaView style={{ flex: 1 }}>
            <Stack.Navigator
              initialRouteName={RouteEnum.LoadingApp}
              screenOptions={{ headerShown: false, animation: 'none' }}
            >
              <Stack.Screen
                name={RouteEnum.LoadingApp}
                options={{ cardStyle: { backgroundColor: 'transparent' } }}
              >
                {props => <LoadingApp {...props} />}
              </Stack.Screen>
              <Stack.Screen name={RouteEnum.LoadedApp}>
                {props => <LoadedApp {...props} />}
              </Stack.Screen>
            </Stack.Navigator>
          </SafeAreaView>
        </BackdropHost>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const App: React.FunctionComponent = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  </GestureHandlerRootView>
);

export default App;
