/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { Preview } from '@storybook/react-native-web-vite';

import { ThemeProvider, navigationTheme, tokens } from '../app/theme';
import { AppContextLoaded, AppContextLoading } from '../app/AppState';
import {
  ContextAppLoadedProvider,
  ContextAppLoadingProvider,
} from '../app/context';
import { mockContextLoaded, mockContextLoading } from './mockContext';

const Stack = createNativeStackNavigator();
const theme = navigationTheme(tokens);

const CANVAS = tokens.bgCanvas;
const CANVAS_CSS = `html, body, #storybook-root { background: ${CANVAS}; height: 100%; margin: 0; }`;

const PHONE_WIDTH = 390;

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
  },
  canvas: {
    flex: 1,
    backgroundColor: CANVAS,
    alignItems: 'center',
  },
  screen: {
    flex: 1,
    width: PHONE_WIDTH,
    backgroundColor: CANVAS,
  },
});

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: tokens.bgCanvas },
        { name: 'card', value: tokens.bgSurface },
      ],
    },
    controls: { matchers: { color: /(background|color)$/i } },
  },

  decorators: [
    /**
     * Supplies both app contexts. A story narrows either with:
     *   parameters: { context: { totalBalance: null } }
     *   parameters: { contextLoading: { netInfo: { isConnected: false } } }
     */
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

    /**
     * Layout.
     *
     * Screens render as a real screen inside a real navigator, at phone width.
     * Passing `navigation`/`route` as args is not enough: many screens and
     * their children read them through `useNavigation()` / `useRoute()`, and
     * RecyclerListView throws when its parent measures 0.
     *
     * Full-page work (the brand manual) opts out with
     *   parameters: { phoneFrame: false }
     * and fills the viewport instead.
     */
    (Story, ctx) => {
      const phoneFrame = ctx.parameters.phoneFrame !== false;

      if (!phoneFrame) {
        return (
          <SafeAreaProvider>
            <style>{CANVAS_CSS}</style>
            <View
              style={{ width: '100%', height: '100%', backgroundColor: CANVAS }}
            >
              <Story />
            </View>
          </SafeAreaProvider>
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = (ctx.args as any)?.route?.params;
      return (
        <GestureHandlerRootView style={styles.root}>
          <style>{CANVAS_CSS}</style>
          <SafeAreaProvider>
            <View style={styles.canvas}>
              <View style={styles.screen}>
                <NavigationContainer theme={theme}>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen
                      name={ctx.name ?? 'Story'}
                      initialParams={params}
                    >
                      {() => <Story />}
                    </Stack.Screen>
                  </Stack.Navigator>
                </NavigationContainer>
              </View>
            </View>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      );
    },
  ],
};

export default preview;
