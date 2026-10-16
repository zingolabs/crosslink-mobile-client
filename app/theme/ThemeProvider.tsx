// Exposes the token layer through `useTheme()`. Every consumer imports the
// hook from here, not from React Navigation: the navigation theme only
// carries the six colors React Navigation knows about.
import React, { createContext, useContext } from 'react';

import { ThemeColors, tokens } from './tokens';

export type AppTheme = {
  colors: ThemeColors;
};

const appTheme: AppTheme = { colors: tokens };

const ThemeContext = createContext<AppTheme>(appTheme);

export const ThemeProvider: React.FunctionComponent<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ThemeContext.Provider value={appTheme}>{children}</ThemeContext.Provider>
);

export const useTheme = () => useContext(ThemeContext);
