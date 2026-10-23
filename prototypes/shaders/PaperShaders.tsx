import React from 'react';

import ShaderCanvas, { SizingProps } from './ShaderCanvas';
import {
  DITHERING_FRAGMENT,
  GRAIN_GRADIENT_FRAGMENT,
  GRAIN_GRADIENT_MAX_COLORS,
  MESH_GRADIENT_FRAGMENT,
  MESH_GRADIENT_MAX_COLORS,
} from './paperGlsl';

export const rgba = (hex: string, alpha = 1): number[] => {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map(c => c + c)
          .join('')
      : h;
  const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : alpha;
  const ch = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
  return [ch(0), ch(2), ch(4), a];
};

const padColors = (colors: string[], max: number) => {
  const out = colors.slice(0, max).map(c => rgba(c));
  while (out.length < max) {
    out.push([0, 0, 0, 0]);
  }
  return out;
};

export const GrainGradientShapes = {
  wave: 1,
  dots: 2,
  truchet: 3,
  corners: 4,
  ripple: 5,
  blob: 6,
  sphere: 7,
} as const;
export type GrainGradientShape = keyof typeof GrainGradientShapes;

export type GrainGradientProps = SizingProps & {
  colorBack: string;
  colors: string[];
  softness?: number;
  intensity?: number;
  noise?: number;
  shape?: GrainGradientShape;
  speed?: number;
  frame?: number;
};

export const GrainGradient: React.FC<GrainGradientProps> = ({
  colorBack,
  colors,
  softness = 0.5,
  intensity = 0.5,
  noise = 0.25,
  shape = 'corners',
  speed = 1,
  frame = 0,
  ...sizing
}) => (
  <ShaderCanvas
    fragment={GRAIN_GRADIENT_FRAGMENT}
    noiseTexture
    speed={speed}
    frame={frame}
    fallbackColor={colorBack}
    uniforms={{
      u_colorBack: rgba(colorBack),
      u_colors: padColors(colors, GRAIN_GRADIENT_MAX_COLORS),
      u_colorsCount: Math.min(colors.length, GRAIN_GRADIENT_MAX_COLORS),
      u_softness: softness,
      u_intensity: intensity,
      u_noise: noise,
      u_shape: GrainGradientShapes[shape],
    }}
    {...sizing}
  />
);

export type MeshGradientProps = SizingProps & {
  colors: string[];
  distortion?: number;
  swirl?: number;
  grainMixer?: number;
  grainOverlay?: number;
  speed?: number;
  frame?: number;
};

export const MeshGradient: React.FC<MeshGradientProps> = ({
  colors,
  distortion = 0.8,
  swirl = 0.1,
  grainMixer = 0,
  grainOverlay = 0,
  speed = 1,
  frame = 0,
  ...sizing
}) => (
  <ShaderCanvas
    fragment={MESH_GRADIENT_FRAGMENT}
    speed={speed}
    frame={frame}
    fallbackColor={colors[0]}
    uniforms={{
      u_colors: padColors(colors, MESH_GRADIENT_MAX_COLORS),
      u_colorsCount: Math.min(colors.length, MESH_GRADIENT_MAX_COLORS),
      u_distortion: distortion,
      u_swirl: swirl,
      u_grainMixer: grainMixer,
      u_grainOverlay: grainOverlay,
    }}
    {...sizing}
  />
);

export const DitheringShapes = {
  simplex: 1,
  warp: 2,
  dots: 3,
  wave: 4,
  ripple: 5,
  swirl: 6,
  sphere: 7,
} as const;
export type DitheringShape = keyof typeof DitheringShapes;

export const DitheringTypes = {
  random: 1,
  '2x2': 2,
  '4x4': 3,
  '8x8': 4,
} as const;
export type DitheringType = keyof typeof DitheringTypes;

export type DitheringProps = SizingProps & {
  colorBack: string;
  colorFront: string;
  shape?: DitheringShape;
  type?: DitheringType;
  pxSize?: number;
  speed?: number;
  frame?: number;
};

export const Dithering: React.FC<DitheringProps> = ({
  colorBack,
  colorFront,
  shape = 'sphere',
  type = '4x4',
  pxSize = 2,
  speed = 1,
  frame = 0,
  ...sizing
}) => (
  <ShaderCanvas
    fragment={DITHERING_FRAGMENT}
    speed={speed}
    frame={frame}
    fallbackColor={colorBack}
    uniforms={{
      u_colorBack: rgba(colorBack),
      u_colorFront: rgba(colorFront),
      u_shape: DitheringShapes[shape],
      u_type: DitheringTypes[type],
      u_pxSize: pxSize,
    }}
    {...sizing}
  />
);
