import React from 'react';

import { rgba } from './shaders/PaperShaders';
import ShaderCanvas from './shaders/ShaderCanvas';
import { CHALK_COLUMNS_FRAGMENT } from './shaders/chalkGlsl';

export const ChalkMasks = {
  none: 0,
  vertical: 1,
  ellipse: 2,
  window: 3,
  dissolve: 4,
  top: 5,
} as const;
export type ChalkMask = keyof typeof ChalkMasks;

export type ChalkReveal = {
  lights?: number;
  columns?: number;
  line?: number;
  rect?: number;
  flash?: number;
};

export type ChalkColumnsProps = {
  colorBack?: string;
  colorChalk?: string;
  grain?: number;
  roughness?: number;
  pressure?: number;
  density?: number;
  spread?: number;
  glow?: number;
  baseline?: number;
  columnTop?: number;
  columnWidth?: number;
  pairGap?: number;
  spacing?: number;
  rise?: number;
  seed?: number;
  spanTop?: number;
  spanBottom?: number;
  rainTop?: number;
  mask?: ChalkMask;
  maskFeather?: number;
  maskPad?: number;
  speed?: number;
  reveal?: ChalkReveal;
};

const ChalkColumns: React.FC<ChalkColumnsProps> = ({
  colorBack = '#0b0b0b',
  colorChalk = '#ebe9e2',
  grain = 1,
  roughness = 1.5,
  pressure = 0.8,
  density = 0.8,
  spread = 1,
  glow = 1,
  baseline = 0.3,
  columnTop = 0.56,
  columnWidth = 6.5,
  pairGap = 14,
  spacing = 1,
  rise = 0,
  seed = 1,
  spanTop = 0.18,
  spanBottom = 0,
  rainTop = 0.97,
  mask = 'none',
  maskFeather = 0.12,
  maskPad = 0.02,
  speed = 1,
  reveal,
}) => (
  <ShaderCanvas
    fragment={CHALK_COLUMNS_FRAGMENT}
    fit="none"
    speed={speed}
    fallbackColor={colorBack}
    uniforms={{
      u_colorBack: rgba(colorBack),
      u_colorChalk: rgba(colorChalk),
      u_grain: grain,
      u_roughness: roughness,
      u_pressure: pressure,
      u_density: density,
      u_spread: spread,
      u_glow: glow,
      u_baseline: baseline,
      u_columnTop: columnTop,
      u_columnWidth: columnWidth,
      u_pairGap: pairGap,
      u_spacing: spacing,
      u_rise: rise,
      u_seed: seed,
      u_spanTop: spanTop,
      u_spanBottom: spanBottom,
      u_rainTop: rainTop,
      u_mask: ChalkMasks[mask],
      u_maskFeather: maskFeather,
      u_maskPad: maskPad,
      u_lights: reveal?.lights ?? 1,
      u_columns: reveal?.columns ?? 1,
      u_line: reveal?.line ?? 1,
      u_rect: reveal?.rect ?? 1,
      u_flash: reveal?.flash ?? 0,
    }}
  />
);

export default ChalkColumns;
