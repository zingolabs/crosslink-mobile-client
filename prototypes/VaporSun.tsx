import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

export type VaporSunProps = {
  canvas?: string;
  ink?: string;
  horizon?: number;
  sunRadius?: number;
  bands?: number;
  bandGap?: number;
  sunGlow?: number;
  halftoneOpacity?: number;
  halftoneSpacing?: number;
  halftoneRadius?: number;
  gridOpacity?: number;
  gridColumns?: number;
  gridRows?: number;
  gridDepth?: number;
  gridFade?: number;
  horizonGlow?: number;
};

const W = 390;
const H = 844;

const VaporSun: React.FC<VaporSunProps> = ({
  canvas = '#0f0f0f',
  ink = '#ffffff',
  horizon = 0.35,
  sunRadius = 96,
  bands = 14,
  bandGap = 0.45,
  sunGlow = 0.4,
  halftoneOpacity = 0.35,
  halftoneSpacing = 7,
  halftoneRadius = 1.9,
  gridOpacity = 0.5,
  gridColumns = 13,
  gridRows = 12,
  gridDepth = 0.26,
  gridFade = 0.15,
  horizonGlow = 0.9,
}) => {
  const cx = W / 2;
  const hy = H * horizon;
  const sunTop = hy - sunRadius;

  const bandRects = Array.from({ length: bands }, (_, i) => {
    const t = i / bands;
    const y = sunTop + sunRadius * t;
    const step = sunRadius / bands;
    const gap = step * bandGap * (0.35 + t * 1.3);
    return { y: y + step - gap, h: gap };
  });

  const columns = Array.from({ length: gridColumns * 2 + 1 }, (_, i) => {
    const k = i - gridColumns;
    const spread = (W * 1.6) / gridColumns;
    return { x2: cx + k * spread };
  });

  const depthPx = H * gridDepth;
  const rows = Array.from({ length: gridRows }, (_, i) => {
    const t = (i + 1) / gridRows;
    return { y: hy + depthPx * Math.pow(t, 1.9) };
  });

  const spotRy = 22;
  const halftoneR = sunRadius * 1.9;
  const dots: { x: number; y: number; r: number; o: number }[] = [];
  for (let y = hy - halftoneR; y < hy; y += halftoneSpacing) {
    for (let x = cx - halftoneR; x <= cx + halftoneR; x += halftoneSpacing) {
      const d = Math.hypot(x - cx, y - hy) / halftoneR;
      if (d > 1 || d < (sunRadius * 0.9) / halftoneR) continue;
      const f = 1 - Math.pow(d, 1.6);
      dots.push({ x, y, r: halftoneRadius * (0.35 + 0.65 * f), o: f });
    }
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <ClipPath id="sky">
            <Rect x="0" y="0" width={W} height={hy} />
          </ClipPath>
          <ClipPath id="sunDisc">
            <Circle cx={cx} cy={hy} r={sunRadius} />
          </ClipPath>
          <ClipPath id="ground">
            <Rect x="0" y={hy} width={W} height={H - hy} />
          </ClipPath>

          <RadialGradient
            id="sunGlow"
            cx={cx}
            cy={hy}
            r={sunRadius * 1.35}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={ink} stopOpacity={sunGlow} />
            <Stop offset="0.7" stopColor={ink} stopOpacity={sunGlow * 0.15} />
            <Stop offset="1" stopColor={ink} stopOpacity={0} />
          </RadialGradient>

          <LinearGradient
            id="horizonBand"
            x1="0"
            y1={hy - 6}
            x2="0"
            y2={hy + 10}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={ink} stopOpacity={0} />
            <Stop offset="0.4" stopColor={ink} stopOpacity={horizonGlow} />
            <Stop offset="1" stopColor={ink} stopOpacity={0} />
          </LinearGradient>
          <RadialGradient
            id="horizonSpot"
            cx={cx}
            cy={hy}
            r={W * 0.5}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={ink} stopOpacity={horizonGlow * 0.45} />
            <Stop offset="1" stopColor={ink} stopOpacity={0} />
          </RadialGradient>

          <RadialGradient
            id="reflection"
            cx={cx}
            cy={hy}
            r={sunRadius * 0.9}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={ink} stopOpacity={0.16} />
            <Stop offset="1" stopColor={ink} stopOpacity={0} />
          </RadialGradient>

          <LinearGradient
            id="groundFade"
            x1="0"
            y1={hy}
            x2="0"
            y2={hy + depthPx * (1 - gridFade)}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={canvas} stopOpacity={0} />
            <Stop offset="0.45" stopColor={canvas} stopOpacity={0.55} />
            <Stop offset="1" stopColor={canvas} stopOpacity={1} />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width={W} height={H} fill={canvas} />

        <G clipPath="url(#sky)">
          <G fill={ink} opacity={halftoneOpacity}>
            {dots.map((d, i) => (
              <Circle key={i} cx={d.x} cy={d.y} r={d.r} opacity={d.o} />
            ))}
          </G>
          <Rect x="0" y="0" width={W} height={H} fill="url(#sunGlow)" />
          <G clipPath="url(#sunDisc)">
            <Circle cx={cx} cy={hy} r={sunRadius} fill={ink} />
            {bandRects.map((b, i) => (
              <Rect
                key={i}
                x={cx - sunRadius}
                y={b.y}
                width={sunRadius * 2}
                height={b.h}
                fill={canvas}
              />
            ))}
          </G>
        </G>

        <G clipPath="url(#ground)">
          <G
            transform={`translate(${cx} ${hy}) scale(1 ${(depthPx * 0.35) / (sunRadius * 0.9)}) translate(${-cx} ${-hy})`}
          >
            <Rect
              x={cx - sunRadius}
              y={hy}
              width={sunRadius * 2}
              height={sunRadius}
              fill="url(#reflection)"
            />
          </G>
          <G stroke={ink} strokeWidth={0.8} opacity={gridOpacity}>
            {columns.map((c, i) => (
              <Line
                key={`c${i}`}
                x1={cx}
                y1={hy}
                x2={c.x2}
                y2={hy + depthPx * 1.6}
              />
            ))}
            {rows.map((r, i) => (
              <Line key={`r${i}`} x1={0} y1={r.y} x2={W} y2={r.y} />
            ))}
          </G>
          <Rect
            x="0"
            y={hy}
            width={W}
            height={depthPx * 2}
            fill="url(#groundFade)"
          />
        </G>

        <Rect x="0" y={hy - 6} width={W} height={16} fill="url(#horizonBand)" />
        <G
          transform={`translate(${cx} ${hy}) scale(1 ${spotRy / (W * 0.5)}) translate(${-cx} ${-hy})`}
        >
          <Rect
            x="0"
            y={hy - W * 0.5}
            width={W}
            height={W}
            fill="url(#horizonSpot)"
          />
        </G>
      </Svg>
    </View>
  );
};

export default VaporSun;
