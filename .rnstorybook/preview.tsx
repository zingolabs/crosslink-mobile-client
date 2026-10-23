import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { Preview } from '@storybook/react-native';
import { withBackgrounds } from '@storybook/addon-ondevice-backgrounds';

import { ThemeProvider, navigationTheme, tokens } from '../app/theme';
import { AppContextLoaded, AppContextLoading } from '../app/AppState';
import {
  ContextAppLoadedProvider,
  ContextAppLoadingProvider,
} from '../app/context';
import {
  mockContextLoaded,
  mockContextLoading,
} from '../.storybook/mockContext';

const Stack = createNativeStackNavigator();
const theme = navigationTheme(tokens);

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: tokens.bgCanvas,
  },
});

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: tokens.bgCanvas },
        { name: 'card', value: tokens.bgSurface },
      ],
    },
  },

  decorators: [
    withBackgrounds,

    Story => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),

    (Story, ctx) => {
      const value: AppContextLoaded = {
        ...mockContextLoaded,
        ...(ctx.parameters.context ?? {}),
      };
      const loadingValue: AppContextLoading = {
        ...mockContextLoading,
        ...(ctx.parameters.contextLoading ?? {}),
      };
      return (
        <ContextAppLoadedProvider value={value}>
          <ContextAppLoadingProvider value={loadingValue}>
            <Story />
          </ContextAppLoadingProvider>
        </ContextAppLoadedProvider>
      );
    },

    (Story, ctx) => {
      if (ctx.parameters.phoneFrame === false) {
        return (
          <SafeAreaProvider>
            <View style={styles.fill}>
              <Story />
            </View>
          </SafeAreaProvider>
        );
      }

      const params = (ctx.args as any)?.route?.params;
      return (
        <GestureHandlerRootView style={styles.fill}>
          <SafeAreaProvider>
            <NavigationContainer theme={theme}>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name={ctx.name ?? 'Story'} initialParams={params}>
                  {() => <Story />}
                </Stack.Screen>
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      );
    },
  ],
};

export default preview;
