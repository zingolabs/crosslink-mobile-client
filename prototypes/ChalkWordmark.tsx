/// <reference lib="dom" />
import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, TextStyle, View } from 'react-native';

import { useTheme } from '../app/theme';
import ChalkText from './ChalkText';
import pixelSquare from './fonts/GeistPixel-Square.woff2';
import pixelCircle from './fonts/GeistPixel-Circle.woff2';
import pixelGrid from './fonts/GeistPixel-Grid.woff2';
import pixelLine from './fonts/GeistPixel-Line.woff2';
import pixelTriangle from './fonts/GeistPixel-Triangle.woff2';

const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?' +
  [
    'family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900',
    'family=Instrument+Serif:ital@0;1',
    'family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700',
    'family=Playfair+Display:ital,wght@0,400..900;1,400..900',
    'family=Space+Grotesk:wght@300..700',
    'family=Syne:wght@400..800',
    'family=Archivo+Black',
    'family=Bricolage+Grotesque:opsz,wght@12..96,200..800',
    'family=JetBrains+Mono:wght@100..800',
    'family=DM+Serif+Display:ital@0;1',
    'family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900',
    'family=Italiana',
    'family=Libre+Caslon+Display',
    'family=Amatic+SC:wght@400;700',
    'family=Rock+Salt',
    'family=Walter+Turncoat',
    'family=Londrina+Sketch',
    'family=Rubik+Dirt',
    'family=Shadows+Into+Light+Two',
    'family=Permanent+Marker',
    'family=Gloria+Hallelujah',
    'family=Orbitron:wght@400..900',
    'family=Audiowide',
    'family=Michroma',
    'family=Syncopate:wght@400;700',
    'family=Major+Mono+Display',
    'family=Bruno+Ace+SC',
    'family=Tektur:wght@400..900',
    'family=Chakra+Petch:wght@300;400;500;600;700',
    'family=Zen+Dots',
    'family=Turret+Road:wght@400;500;700;800',
    'family=Oxanium:wght@200..800',
    'family=Rajdhani:wght@300;400;500;600;700',
    'family=Cabin+Sketch:wght@400;700',
    'family=Fredericka+the+Great',
    'family=Caveat:wght@400..700',
    'family=Unbounded:wght@200..900',
    'family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800',
    'display=swap',
  ].join('&');

const LINK_ID = 'chalk-wordmark-fonts';
const PIXEL_ID = 'geist-pixel-faces';
const PIXEL_FACES: Array<[string, string]> = [
  ['Geist Pixel Square', pixelSquare],
  ['Geist Pixel Circle', pixelCircle],
  ['Geist Pixel Grid', pixelGrid],
  ['Geist Pixel Line', pixelLine],
  ['Geist Pixel Triangle', pixelTriangle],
];
const PIXEL_CSS = PIXEL_FACES.map(
  ([family, src]) =>
    `@font-face { font-family: "${family}"; src: url(${src}) format("woff2"); font-display: swap; }`,
).join('\n');

export const useWebFonts = () => {
  useEffect(() => {
    if (Platform.OS !== 'web' || document.getElementById(LINK_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = PIXEL_ID;
    style.textContent = PIXEL_CSS;
    document.head.appendChild(style);
    const link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    link.href = GOOGLE_FONTS;
    document.head.appendChild(link);
  }, []);
};

export type WordmarkSpec = {
  text?: string;
  kern?: number[];
  chalk?: boolean;
  style: TextStyle;
  eyebrow?: string;
  eyebrowStyle?: TextStyle;
};

export const wordmarkVariants = {
  system: {
    style: {
      fontSize: 40,
      lineHeight: 44,
      fontWeight: '800',
      letterSpacing: -1.5,
    },
  },
  fraunces: {
    style: {
      fontFamily: 'Fraunces',
      fontSize: 48,
      lineHeight: 52,
      fontWeight: '500',
      fontStyle: 'italic',
      letterSpacing: -0.5,
    },
  },
  instrument: {
    style: {
      fontFamily: 'Instrument Serif',
      fontSize: 58,
      lineHeight: 60,
      fontWeight: '400',
      letterSpacing: -1,
    },
  },
  instrumentItalic: {
    style: {
      fontFamily: 'Instrument Serif',
      fontSize: 58,
      lineHeight: 60,
      fontWeight: '400',
      fontStyle: 'italic',
      letterSpacing: -0.5,
    },
  },
  cormorant: {
    style: {
      fontFamily: 'Cormorant Garamond',
      fontSize: 60,
      lineHeight: 62,
      fontWeight: '300',
      letterSpacing: 2,
    },
  },
  playfair: {
    style: {
      fontFamily: 'Playfair Display',
      fontSize: 46,
      lineHeight: 52,
      fontWeight: '700',
      fontStyle: 'italic',
      letterSpacing: -0.5,
    },
  },
  spaceGrotesk: {
    style: {
      fontFamily: 'Space Grotesk',
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '500',
      letterSpacing: 7,
    },
  },
  syne: {
    text: 'DELEGATOR',
    style: {
      fontFamily: 'Syne',
      fontSize: 36,
      lineHeight: 42,
      fontWeight: '800',
      letterSpacing: 1,
    },
  },
  archivo: {
    text: 'DELEGATOR',
    style: {
      fontFamily: 'Archivo Black',
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: 5,
    },
  },
  bricolage: {
    style: {
      fontFamily: 'Bricolage Grotesque',
      fontSize: 46,
      lineHeight: 50,
      fontWeight: '800',
      letterSpacing: -2,
    },
  },
  mono: {
    text: 'd e l e g a t o r',
    style: {
      fontFamily: 'JetBrains Mono',
      fontSize: 22,
      lineHeight: 30,
      fontWeight: '300',
      letterSpacing: 2,
    },
  },
  dmSerif: {
    style: {
      fontFamily: 'DM Serif Display',
      fontSize: 52,
      lineHeight: 56,
      letterSpacing: -0.5,
    },
  },
  bodoni: {
    style: {
      fontFamily: 'Bodoni Moda',
      fontSize: 52,
      lineHeight: 56,
      fontWeight: '500',
      letterSpacing: 0,
    },
  },
  italiana: {
    text: 'DELEGATOR',
    style: {
      fontFamily: 'Italiana',
      fontSize: 44,
      lineHeight: 50,
      letterSpacing: 9,
    },
  },
  sketch: {
    style: {
      fontFamily: 'Cabin Sketch',
      fontSize: 50,
      lineHeight: 56,
      fontWeight: '700',
      letterSpacing: 0,
    },
  },
  fredericka: {
    style: {
      fontFamily: 'Fredericka the Great',
      fontSize: 50,
      lineHeight: 56,
      letterSpacing: 1,
    },
  },
  caveat: {
    style: {
      fontFamily: 'Caveat',
      fontSize: 60,
      lineHeight: 64,
      fontWeight: '600',
      letterSpacing: 0,
    },
  },
  unbounded: {
    style: {
      fontFamily: 'Unbounded',
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
  },
  newsreader: {
    style: {
      fontFamily: 'Newsreader',
      fontSize: 58,
      lineHeight: 62,
      fontWeight: '300',
      fontStyle: 'italic',
      letterSpacing: -0.5,
    },
  },
  plaque: {
    kern: [-0.3, -0.3, -0.3, -0.4, 0.1, -0.4, -1.2, -0.6, 0],
    style: {
      fontFamily: 'Newsreader',
      fontSize: 54,
      lineHeight: 58,
      fontWeight: '400',
      letterSpacing: -1.2,
    },
  },
  plaqueInstrument: {
    kern: [0.3, -0.4, -0.4, -0.6, 0.4, -0.6, -1.6, -0.8, 0],
    style: {
      fontFamily: 'Instrument Serif',
      fontSize: 60,
      lineHeight: 60,
      fontWeight: '400',
      letterSpacing: -1.2,
    },
  },
  plaqueFraunces: {
    kern: [0.2, -0.3, -0.3, -0.4, 0.3, -0.4, -1.2, -0.6, 0],
    style: {
      fontFamily: 'Fraunces',
      fontSize: 54,
      lineHeight: 60,
      fontWeight: '400',
      letterSpacing: -1.5,
    },
  },
  plaqueCormorant: {
    kern: [0, -0.2, -0.2, -0.3, 0.2, -0.3, -0.8, -0.4, 0],
    style: {
      fontFamily: 'Cormorant Garamond',
      fontSize: 62,
      lineHeight: 64,
      fontWeight: '400',
      letterSpacing: 0.5,
    },
  },
  plaqueItaliana: {
    text: 'DELEGATOR',
    style: {
      fontFamily: 'Italiana',
      fontSize: 40,
      lineHeight: 48,
      letterSpacing: 10,
    },
  },
  chalkAmatic: {
    chalk: true,
    style: {
      fontFamily: 'Amatic SC',
      fontSize: 72,
      lineHeight: 76,
      fontWeight: '700',
      letterSpacing: 2,
    },
  },
  chalkRockSalt: {
    chalk: true,
    style: {
      fontFamily: 'Rock Salt',
      fontSize: 36,
      lineHeight: 60,
      letterSpacing: 1,
    },
  },
  chalkWalter: {
    chalk: true,
    style: {
      fontFamily: 'Walter Turncoat',
      fontSize: 50,
      lineHeight: 60,
      letterSpacing: 1,
    },
  },
  chalkLondrina: {
    chalk: true,
    style: {
      fontFamily: 'Londrina Sketch',
      fontSize: 62,
      lineHeight: 66,
      letterSpacing: 1,
    },
  },
  chalkFredericka: {
    chalk: true,
    style: {
      fontFamily: 'Fredericka the Great',
      fontSize: 54,
      lineHeight: 60,
      letterSpacing: 1,
    },
  },
  chalkCabin: {
    chalk: true,
    style: {
      fontFamily: 'Cabin Sketch',
      fontSize: 54,
      lineHeight: 60,
      fontWeight: '700',
    },
  },
  chalkMarker: {
    chalk: true,
    style: {
      fontFamily: 'Permanent Marker',
      fontSize: 48,
      lineHeight: 60,
      letterSpacing: 0.5,
    },
  },
  chalkGloria: {
    chalk: true,
    style: {
      fontFamily: 'Gloria Hallelujah',
      fontSize: 46,
      lineHeight: 60,
    },
  },
  chalkShadows: {
    chalk: true,
    style: {
      fontFamily: 'Shadows Into Light Two',
      fontSize: 52,
      lineHeight: 60,
      letterSpacing: 1,
    },
  },
  chalkGrotesk: {
    chalk: true,
    style: {
      fontFamily: 'Space Grotesk',
      fontSize: 52,
      lineHeight: 60,
      fontWeight: '700',
      letterSpacing: -1,
    },
  },
  chalkSerif: {
    chalk: true,
    style: {
      fontFamily: 'Newsreader',
      fontSize: 56,
      lineHeight: 60,
      fontWeight: '500',
      letterSpacing: -1,
    },
  },
  chalkSystem: {
    chalk: true,
    style: {
      fontFamily: 'system-ui',
      fontSize: 50,
      lineHeight: 60,
      fontWeight: '800',
      letterSpacing: -1.5,
    },
  },
  futOrbitron: {
    chalk: true,
    text: 'DELEGATOR',
    style: {
      fontFamily: 'Orbitron',
      fontSize: 38,
      lineHeight: 60,
      fontWeight: '700',
      letterSpacing: 4,
    },
  },
  futAudiowide: {
    chalk: true,
    style: {
      fontFamily: 'Audiowide',
      fontSize: 40,
      lineHeight: 60,
      fontWeight: '400',
      letterSpacing: 2,
    },
  },
  futMichroma: {
    chalk: true,
    text: 'DELEGATOR',
    style: {
      fontFamily: 'Michroma',
      fontSize: 30,
      lineHeight: 60,
      fontWeight: '400',
      letterSpacing: 5,
    },
  },
  futSyncopate: {
    chalk: true,
    text: 'DELEGATOR',
    style: {
      fontFamily: 'Syncopate',
      fontSize: 30,
      lineHeight: 60,
      fontWeight: '700',
      letterSpacing: 4,
    },
  },
  futMajorMono: {
    chalk: true,
    style: {
      fontFamily: 'Major Mono Display',
      fontSize: 40,
      lineHeight: 60,
      fontWeight: '400',
      letterSpacing: 2,
    },
  },
  futBrunoAce: {
    chalk: true,
    text: 'DELEGATOR',
    style: {
      fontFamily: 'Bruno Ace SC',
      fontSize: 34,
      lineHeight: 60,
      fontWeight: '400',
      letterSpacing: 3,
    },
  },
  futTektur: {
    chalk: true,
    style: {
      fontFamily: 'Tektur',
      fontSize: 44,
      lineHeight: 60,
      fontWeight: '500',
      letterSpacing: 1,
    },
  },
  futChakra: {
    chalk: true,
    style: {
      fontFamily: 'Chakra Petch',
      fontSize: 46,
      lineHeight: 60,
      fontWeight: '600',
      letterSpacing: 1,
    },
  },
  futZenDots: {
    chalk: true,
    text: 'DELEGATOR',
    style: {
      fontFamily: 'Zen Dots',
      fontSize: 30,
      lineHeight: 60,
      fontWeight: '400',
      letterSpacing: 4,
    },
  },
  futTurret: {
    chalk: true,
    style: {
      fontFamily: 'Turret Road',
      fontSize: 46,
      lineHeight: 60,
      fontWeight: '700',
      letterSpacing: 1,
    },
  },
  futOxanium: {
    chalk: true,
    style: {
      fontFamily: 'Oxanium',
      fontSize: 46,
      lineHeight: 60,
      fontWeight: '600',
      letterSpacing: 1,
    },
  },
  futRajdhani: {
    chalk: true,
    style: {
      fontFamily: 'Rajdhani',
      fontSize: 54,
      lineHeight: 60,
      fontWeight: '600',
      letterSpacing: 2,
    },
  },
  pixelSquare: {
    text: 'Delegator',
    style: {
      fontFamily: 'Geist Pixel Square',
      fontSize: 44,
      lineHeight: 52,
      letterSpacing: 1,
    },
  },
  pixelCircle: {
    text: 'Delegator',
    style: {
      fontFamily: 'Geist Pixel Circle',
      fontSize: 44,
      lineHeight: 52,
      letterSpacing: 1,
    },
  },
  pixelGrid: {
    text: 'Delegator',
    style: {
      fontFamily: 'Geist Pixel Grid',
      fontSize: 44,
      lineHeight: 52,
      letterSpacing: 1,
    },
  },
  pixelLine: {
    text: 'Delegator',
    style: {
      fontFamily: 'Geist Pixel Line',
      fontSize: 44,
      lineHeight: 52,
      letterSpacing: 1,
    },
  },
  pixelTriangle: {
    text: 'Delegator',
    style: {
      fontFamily: 'Geist Pixel Triangle',
      fontSize: 44,
      lineHeight: 52,
      letterSpacing: 1,
    },
  },
  pixelChalk: {
    chalk: true,
    text: 'Delegator',
    style: {
      fontFamily: 'Geist Pixel Square',
      fontSize: 44,
      lineHeight: 52,
      letterSpacing: 1,
    },
  },
} satisfies Record<string, WordmarkSpec>;

export type WordmarkVariant = keyof typeof wordmarkVariants;
export const wordmarkVariantNames = Object.keys(
  wordmarkVariants,
) as WordmarkVariant[];

export const Wordmark: React.FC<{
  variant: WordmarkVariant;
  color?: string;
}> = ({ variant, color }) => {
  useWebFonts();
  const { colors } = useTheme();
  const ink = color ?? colors.fgDefault;
  const spec: WordmarkSpec = wordmarkVariants[variant];
  const label = spec.text ?? 'delegator';
  const base = spec.style.letterSpacing ?? 0;
  const kerned = useMemo(
    () =>
      spec.kern
        ? label.split('').map((ch, i) => ({
            ch,
            style: { letterSpacing: base + (spec.kern?.[i] ?? 0) },
          }))
        : null,
    [spec, label, base],
  );
  if (spec.chalk) {
    return (
      <View style={styles.root}>
        <ChalkText text={label} style={spec.style} color={ink} />
      </View>
    );
  }
  return (
    <View style={styles.root}>
      {spec.eyebrow ? (
        <Text style={[{ color: colors.fgSubtle }, spec.eyebrowStyle]}>
          {spec.eyebrow}
        </Text>
      ) : null}
      <Text style={[{ color: ink }, spec.style]}>
        {kerned
          ? kerned.map((k, i) => (
              <Text key={i} style={k.style}>
                {k.ch}
              </Text>
            ))
          : label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
});
