import { DefaultTheme, Theme } from '@react-navigation/native';

import { ThemeColors } from './tokens';

/** Projects the token layer onto the React Navigation `Theme` shape. */
export const navigationTheme = (colors: ThemeColors): Theme => ({
  ...DefaultTheme,
  dark: true,
  colors: {
    primary: colors.bgAccent,
    background: colors.bgCanvas,
    card: colors.bgCanvas,
    text: colors.fgDefault,
    border: colors.borderFaint,
    notification: '',
  },
});
