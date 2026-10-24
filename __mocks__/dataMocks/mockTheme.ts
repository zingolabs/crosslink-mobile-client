import type { AppTheme, ThemeColors } from '../../app/theme';

// These values predate the token layer and differ from the real palette on
// purpose: the snapshot suites are baselined on them.
const colors: ThemeColors = {
  bgCanvas: '#011401',
  bgSurface: '#222223',
  bgChrome: '#040C17',
  bgPress: 'rgba(255, 255, 255, 0.06)',

  fgDefault: '#c3c3c3',

  fgMuted: '#888888',
  borderMuted: '#888888',
  bgMuted: '#888888',

  fgSubtle: '#888888',
  borderSubtle: '#888888',

  fgFaint: '#ffffff',
  borderFaint: '#ffffff',
  bgFaint: '#ffffff',

  fgAccent: '#18bd18',
  borderAccent: '#18bd18',
  bgAccent: '#18bd18',
  bgAccentTint: '#18bd1826',
  fgAccentDisabled: '#5a8c5a',
  borderAccentDisabled: '#5a8c5a',

  fgSuccess: '#30D158',

  fgSyncing: '#ebff5a',
  bgSyncing: '#ebff5a',

  fgWarning: '#F99D00',
  fgWarningEmphasis: '#E1AA1B',
  fgWarningMuted: '#FEE587',
  borderWarning: '#65491C',
  bgWarning: '#262527',

  fgDanger: '#dc2626',
  borderDanger: '#dc2626',
  bgDanger: '#dc2626',
};

export const mockTheme: AppTheme = { colors };
