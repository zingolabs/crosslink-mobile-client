import React, { useEffect, useMemo, useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import {
  Canvas,
  Fill,
  Group,
  Shader,
  Skia,
  Text as SkiaText,
  useClock,
  useFont,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { tokens } from '../../app/theme';
import { CHALK_SKSL } from './chalkSksl';
import type { ChalkReveal } from './useChalkIntro';

export const CHALK_INK = '#e4e1d8';
export const TITLE_SIZE = 44;
export const TITLE_LINE = 52;
export const TITLE_GAP = 56;
export const LINE_ABOVE_TITLE = 22;
const PAPER_HOLD = 0.25;
const PAPER_FADE = 1.2;
// surface pixels per logical point; device pixel ratio above this gets upscaled
const RENDER_SCALE = 2;

export type ChalkBackgroundProps = {
  width: number;
  height: number;
  actionsHeight: number;
  reveal: ChalkReveal;
  title?: string;
};

const paperAt = (t: number) => {
  'worklet';
  const x = Math.min(1, Math.max(0, (t - PAPER_HOLD) / PAPER_FADE));
  return x * x * (3 - 2 * x);
};

const rgba = (hex: string): number[] => {
  const h = hex.replace('#', '');
  const ch = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
  return [ch(0), ch(2), ch(4), 1];
};

export const chalkLayout = (height: number, actionsHeight: number) => {
  const titleBottom = height - actionsHeight - TITLE_GAP;
  const titleTop = titleBottom - TITLE_LINE;
  const baseline =
    height > 0 ? (height - (titleTop - LINE_ABOVE_TITLE)) / height : 0.3;
  return { titleTop, baseline };
};

const STATIC = {
  u_colorBack: rgba(tokens.bgCanvas),
  u_colorChalk: rgba(CHALK_INK),
  u_grain: 1,
  u_roughness: 1.5,
  u_pressure: 0.82,
  u_density: 0.75,
  u_spread: 1,
  u_glow: 0.5,
  u_columnTop: 0.48,
  u_columnWidth: 6.5,
  u_pairGap: 14,
  u_spacing: 1,
  u_seed: 4,
  u_spanTop: 0.1,
  u_spanBottom: 0,
  u_rainTop: 0.9,
  u_mask: 4,
  u_maskFeather: 0.1,
  u_maskPad: -0.03,
};

const ChalkBackground: React.FC<ChalkBackgroundProps> = ({
  width,
  height,
  actionsHeight,
  reveal,
  title = 'Delegator',
}) => {
  const effect = useMemo(() => Skia.RuntimeEffect.Make(CHALK_SKSL), []);
  const clock = useClock();
  const font = useFont(
    require('../../assets/fonts/GeistPixel-Square.ttf'),
    TITLE_SIZE,
  );
  const { titleTop, baseline } = chalkLayout(height, actionsHeight);
  const pixelRatio = PixelRatio.get();
  const scale = Math.min(1, RENDER_SCALE / pixelRatio);
  const surfaceWidth = Math.round(width * scale);
  const surfaceHeight = Math.round(height * scale);
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    if (reveal.frozen) {
      setFrozen(true);
    }
  }, [reveal.frozen]);

  const uniforms = useDerivedValue(
    () => ({
      ...STATIC,
      u_resolution: [surfaceWidth, surfaceHeight],
      u_pixelRatio: pixelRatio,
      u_time: clock.value / 1000,
      u_paper: paperAt(clock.value / 1000),
      u_baseline: baseline,
      u_lights: reveal.lights.value,
      u_columns: reveal.columns.value,
      u_line: reveal.line.value,
      u_flash: reveal.flash.value,
    }),
    [surfaceWidth, surfaceHeight, baseline, pixelRatio],
  );

  const staticUniforms = useMemo(
    () => ({
      ...STATIC,
      u_resolution: [surfaceWidth, surfaceHeight],
      u_pixelRatio: pixelRatio,
      u_time: 0,
      u_paper: 1,
      u_baseline: baseline,
      u_lights: 1,
      u_columns: 1,
      u_line: 1,
      u_flash: 0,
    }),
    [surfaceWidth, surfaceHeight, baseline, pixelRatio],
  );

  const titleX = font ? (width - font.measureText(title).width) / 2 : 0;
  const titleY = titleTop + TITLE_LINE * 0.75;

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={styles.canvasWrap} pointerEvents="none">
      {effect ? (
        <Canvas
          style={[
            styles.canvasBg,
            {
              width: surfaceWidth,
              height: surfaceHeight,
              left: (width - surfaceWidth) / 2,
              top: (height - surfaceHeight) / 2,
              transform: [{ scale: 1 / scale }],
            },
          ]}
        >
          <Fill>
            <Shader
              source={effect}
              uniforms={frozen ? staticUniforms : uniforms}
            />
          </Fill>
        </Canvas>
      ) : (
        <Canvas style={styles.canvas}>
          <Fill color={tokens.bgCanvas} />
        </Canvas>
      )}
      {font && (
        <Canvas style={styles.canvas}>
          <Group opacity={frozen ? 1 : reveal.title}>
            <SkiaText
              x={titleX}
              y={titleY}
              text={title}
              font={font}
              color={CHALK_INK}
            />
          </Group>
        </Canvas>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  canvasWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  canvasBg: {
    position: 'absolute',
  },
  canvas: StyleSheet.absoluteFillObject,
});

export default ChalkBackground;
