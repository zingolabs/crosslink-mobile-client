// The typography token layer.
//
// Font family: the platform system font (SF Pro on iOS, Roboto on Android).
// It ships optical sizing and tracking tables, so `fontFamily` stays unset.
// Only the monospace face is named, per platform.
//
// Text styles: Apple's Dynamic Type styles at the default (Large) size,
// plus the home screen's figure styles. Tracking is size-specific:
// negative around body size, positive on titles and captions. Line
// heights are the system values.
import { Platform, TextStyle } from 'react-native';

export const fontFamily = {
  /** `undefined` selects the system font. */
  sans: undefined,
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

export type TextStyleName =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'display'
  | 'unit'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subheadline'
  | 'footnote'
  | 'caption'
  | 'caption1'
  | 'caption2'
  | 'numeral';

export const text: Record<TextStyleName, TextStyle> = {
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.37,
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: 0.38,
  },
  /** The balance figure on the home summary. Big, tight, tabular. */
  display: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '700',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  /** The currency unit beside the display figure. */
  unit: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
    letterSpacing: -0.32,
  },
  subheadline: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: -0.08,
  },
  /** Short labels under icons and beside values. */
  caption: {
    fontSize: 13,
    fontWeight: '500',
  },
  caption1: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0,
  },
  caption2: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '400',
    letterSpacing: 0.07,
  },
  /** Amounts at body size: headline weight, digits that line up. */
  numeral: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.41,
    fontVariant: ['tabular-nums'],
  },
};

/** Addresses, hashes, amounts that must line up. */
export const mono: TextStyle = {
  ...text.callout,
  fontFamily: fontFamily.mono,
  letterSpacing: 0,
};
