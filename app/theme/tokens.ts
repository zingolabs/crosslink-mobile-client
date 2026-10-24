// The semantic token layer: the single declaration of every app color.
// Flat camelCase, prefixed by surface (fg = text/icon, border, bg).
// Roles on the neutral scale, lightest to darkest:
//   default > muted > subtle > faint

export type ThemeColors = {
  bgCanvas: string;
  bgSurface: string;
  bgChrome: string;
  /** Momentary press state on rows and cards. */
  bgPress: string;

  fgDefault: string;

  fgMuted: string;
  borderMuted: string;
  bgMuted: string;

  fgSubtle: string;
  borderSubtle: string;

  fgFaint: string;
  borderFaint: string;
  bgFaint: string;

  fgAccent: string;
  borderAccent: string;
  bgAccent: string;
  fgAccentDisabled: string;
  bgAccentTint: string;
  borderAccentDisabled: string;

  /** A raised, lighter take on the surface: focused fields. */
  bgSurfaceRaised: string;

  fgSuccess: string;
  bgSuccessTint: string;

  fgSyncing: string;
  bgSyncing: string;

  fgWarning: string;
  fgWarningEmphasis: string;
  fgWarningMuted: string;
  borderWarning: string;
  bgWarning: string;
  bgWarningTint: string;

  fgDanger: string;
  borderDanger: string;
  bgDanger: string;
  bgDangerTint: string;
};

export const tokens: ThemeColors = {
  bgCanvas: '#0b0b0b',
  bgSurface: '#222223',
  bgChrome: '#0f0f0f',
  bgPress: 'rgba(255, 255, 255, 0.06)',

  fgDefault: '#ffffff',

  fgMuted: '#b4b4b4',
  borderMuted: '#b4b4b4',
  bgMuted: '#b4b4b4',

  fgSubtle: '#8D8D8D',
  borderSubtle: '#8D8D8D',

  fgFaint: '#3C3C3D',
  borderFaint: '#3C3C3D',
  bgFaint: '#3C3C3D',

  fgAccent: '#1c78d2',
  borderAccent: '#1c78d2',
  bgAccent: '#1c78d2',
  bgAccentTint: '#1c78d226',
  fgAccentDisabled: '#b4b4b4',
  borderAccentDisabled: '#b4b4b4',

  bgSurfaceRaised: '#2c2c2e',

  fgSuccess: '#30D158',
  bgSuccessTint: '#30d15833',

  fgSyncing: '#ebff5a',
  bgSyncing: '#ebff5a',

  fgWarning: '#F99D00',
  fgWarningEmphasis: '#E1AA1B',
  fgWarningMuted: '#FEE587',
  borderWarning: '#65491C',
  bgWarning: '#262527',
  bgWarningTint: '#f99d004d',

  fgDanger: '#FE383C',
  borderDanger: '#FE383C',
  bgDanger: '#FE383C',
  bgDangerTint: '#fe383c33',
};
