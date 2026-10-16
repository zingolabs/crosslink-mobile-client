/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { tabular } from './shared';

export type Segment = { value: number; color: string };

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const arc = (cx: number, cy: number, r: number, from: number, to: number) => {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M${a.x.toFixed(2)},${a.y.toFixed(2)} A${r},${r} 0 ${large} 1 ${b.x.toFixed(2)},${b.y.toFixed(2)}`;
};

export const Gauge: React.FC<{
  size: number;
  stroke: number;
  segments: Segment[];
  total?: number;
  track?: string;
  gap?: number;
  children?: React.ReactNode;
}> = ({
  size,
  stroke,
  segments,
  total,
  track = '#ffffff14',
  gap = 4,
  children,
}) => {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const START = 135;
  const SWEEP = 270;
  const sum = total ?? segments.reduce((a, s) => a + s.value, 0);
  const shown = segments.filter(s => s.value > 0);
  const capDeg = (gap / (2 * Math.PI * r)) * 360;
  let acc = 0;
  const ends = shown.map(s => {
    acc += sum > 0 ? (s.value / sum) * SWEEP : 0;
    return Math.max(capDeg, acc);
  });
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Path
          d={arc(c, c, r, START, START + SWEEP)}
          stroke={track}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
        {shown
          .map((s, i) => (
            <Path
              key={i}
              d={arc(c, c, r, START, START + Math.min(SWEEP, ends[i]))}
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
            />
          ))
          .reverse()}
      </Svg>
      {!!children && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
};

export const Sparkline: React.FC<{
  data: number[];
  width: number;
  height: number;
  color: string;
  fill?: boolean;
  dot?: boolean;
  strokeWidth?: number;
}> = ({
  data,
  width,
  height,
  color,
  fill = true,
  dot = true,
  strokeWidth = 2,
}) => {
  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = strokeWidth + 3;
  const x = (i: number) => (i / (data.length - 1)) * (width - pad * 2) + pad;
  const y = (v: number) =>
    max === min
      ? height / 2
      : pad + (1 - (v - min) / (max - min)) * (height - pad * 2);
  const line = data
    .map(
      (v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`,
    )
    .join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`;
  const last = data[data.length - 1];
  return (
    <Svg width={width} height={height}>
      {fill && <Path d={area} fill={color} fillOpacity={0.1} />}
      <Path
        d={line}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {dot && (
        <Circle
          cx={x(data.length - 1)}
          cy={y(last)}
          r={strokeWidth + 2}
          fill={color}
        />
      )}
    </Svg>
  );
};

export type BarDatum = {
  label: string;
  a: number;
  b?: number;
  muted?: boolean;
};

export const Bars: React.FC<{
  data: BarDatum[];
  width: number;
  height: number;
  colorA: string;
  colorB?: string;
  labelColor: string;
  barWidth?: number;
}> = ({ data, width, height, colorA, colorB, labelColor, barWidth }) => {
  const labelH = 18;
  const plotH = height - labelH;
  const max = Math.max(1e-9, ...data.map(d => Math.max(d.a, d.b ?? 0)));
  const slot = width / data.length;
  const pair = colorB !== undefined;
  const bw = barWidth ?? Math.min(pair ? 10 : 18, slot * (pair ? 0.3 : 0.5));
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={plotH}>
        {data.map((d, i) => {
          const cx = slot * i + slot / 2;
          const ha = Math.max(d.a > 0 ? 3 : 0, (d.a / max) * (plotH - 4));
          const hb = Math.max(
            (d.b ?? 0) > 0 ? 3 : 0,
            ((d.b ?? 0) / max) * (plotH - 4),
          );
          const op = d.muted ? 0.35 : 1;
          return (
            <G key={d.label + i} opacity={op}>
              <Rect
                x={pair ? cx - bw - 1.5 : cx - bw / 2}
                y={plotH - ha}
                width={bw}
                height={ha}
                rx={Math.min(bw / 2, 4)}
                fill={colorA}
              />
              {pair && (
                <Rect
                  x={cx + 1.5}
                  y={plotH - hb}
                  width={bw}
                  height={hb}
                  rx={Math.min(bw / 2, 4)}
                  fill={colorB}
                />
              )}
            </G>
          );
        })}
      </Svg>
      <View
        style={{ flexDirection: 'row', height: labelH, alignItems: 'flex-end' }}
      >
        {data.map((d, i) => (
          <Text
            key={d.label + i}
            style={[
              tabular,
              {
                width: slot,
                textAlign: 'center',
                color: labelColor,
                fontSize: 11,
                opacity: d.muted ? 0.5 : 1,
              },
            ]}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

export const StackBar: React.FC<{
  segments: Segment[];
  height?: number;
  track?: string;
}> = ({ segments, height = 8, track = '#ffffff14' }) => {
  const sum = segments.reduce((a, s) => a + s.value, 0);
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: track,
        flexDirection: 'row',
        overflow: 'hidden',
        gap: 2,
      }}
    >
      {segments
        .filter(s => s.value > 0)
        .map((s, i) => (
          <View
            key={i}
            style={{
              flex: sum > 0 ? s.value / sum : 0,
              backgroundColor: s.color,
            }}
          />
        ))}
    </View>
  );
};
