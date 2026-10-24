// The spacing scale, taken from the home screen: the gaps between the
// summary figure, the action circles, and the list rows.
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export type SpaceName = keyof typeof space;
