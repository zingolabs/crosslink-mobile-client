// Stands in for app/theme in tests. Wired by the moduleNameMapper entries in
// jest.config.js, so `useTheme()` returns the snapshot-baselined palette.
import React from 'react';

import { mockTheme } from './dataMocks/mockTheme';

export const useTheme = () => mockTheme;
export const ThemeProvider = ({ children }: { children: React.ReactNode }) =>
  children;
export const navigationTheme = () => mockTheme;
export const tokens = mockTheme.colors;

// Not themed, so re-export the real value: the mock shadows the whole
// `app/theme` barrel, and a missing export would render as `undefined`.
export { radiusPill, radiusCard } from '../app/theme/radii';
export { space } from '../app/theme/spacing';
export { curve, duration } from '../app/theme/motion';
export { fontFamily, text, mono } from '../app/theme/typography';
