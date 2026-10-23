/// <reference lib="dom" />
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextStyle, View } from 'react-native';

export type ChalkTextProps = {
  text: string;
  style: TextStyle;
  color: string;
  grain?: number;
  roughness?: number;
  pressure?: number;
  seed?: number;
};

const PAD = 12;

const hash = (x: number, y: number, seed: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

const smooth = (t: number) => t * t * (3 - 2 * t);

const vnoise = (x: number, y: number, seed: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};

const smoothstep = (e0: number, e1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const f =
    h.length === 3
      ? h
          .split('')
          .map(c => c + c)
          .join('')
      : h;
  return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16));
};

const fontString = (style: TextStyle) =>
  `${style.fontStyle ?? 'normal'} ${style.fontWeight ?? '400'} ${style.fontSize ?? 40}px "${style.fontFamily ?? 'sans-serif'}"`;

const ChalkText: React.FC<ChalkTextProps> = ({
  text,
  style,
  color,
  grain = 1,
  roughness = 1.4,
  pressure = 0.9,
  seed = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    let cancelled = false;
    const font = fontString(style);
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) {
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const measure = document.createElement('canvas').getContext('2d');
      if (!measure) {
        return;
      }
      measure.font = font;
      const spacing = style.letterSpacing ?? 0;
      const metrics = measure.measureText(text);
      const textW = metrics.width + spacing * text.length;
      const lineH = style.lineHeight ?? (style.fontSize ?? 40) * 1.2;
      const w = Math.ceil(textW + PAD * 2);
      const h = Math.ceil(lineH + PAD * 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      setSize({ w, h });

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.font = font;
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const cs = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
      if ('letterSpacing' in cs) {
        cs.letterSpacing = `${spacing}px`;
      }
      ctx.fillText(text, w / 2 + spacing / 2, h / 2);

      const W = canvas.width;
      const H = canvas.height;
      const src = ctx.getImageData(0, 0, W, H);
      const out = ctx.createImageData(W, H);
      const cov = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= W || y >= H) {
          return 0;
        }
        return src.data[(y * W + x) * 4 + 3] / 255;
      };
      const [r, g, b] = hexToRgb(color);
      const cell = Math.max(dpr * 0.6, 1);
      const rough = roughness * dpr;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const gx = Math.floor(x / cell);
          const gy = Math.floor(y / cell);
          const fine = hash(gx, gy, seed);
          const clump = vnoise(gx / 3.5, gy / 3.5, seed + 7);
          const clump2 = vnoise(gx / 9, gy / 9, seed + 100);
          const raw = Math.min(
            1,
            Math.max(0, fine * 0.5 + clump * 0.35 + clump2 * 0.15),
          );
          const tooth = 0.5 + (raw - 0.5) * grain;
          const ex = vnoise(gx / 2.5, gy / 2.5, seed + 50) - 0.5;
          const ey = vnoise(gx / 2.5 + 40, gy / 2.5, seed + 51) - 0.5;
          const c = cov(
            Math.round(x + ex * 2 * rough),
            Math.round(y + ey * 2 * rough),
          );
          const cCenter = cov(x, y);
          const core = 1 - 0.45 * (1 - cCenter);
          const deposit = pressure * c * core;
          const lit = smoothstep(tooth - 0.2, tooth + 0.2, deposit);
          const i = (y * W + x) * 4;
          const tone = 0.9 + 0.1 * fine;
          out.data[i] = r * tone;
          out.data[i + 1] = g * tone;
          out.data[i + 2] = b * tone;
          out.data[i + 3] = lit * 255;
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.putImageData(out, 0, 0);
    };
    const generic = !style.fontFamily || style.fontFamily === 'system-ui';
    const started = performance.now();
    const waitForFace = () => {
      if (cancelled) {
        return;
      }
      const family = style.fontFamily ?? '';
      let registered = false;
      document.fonts.forEach(f => {
        if (f.family.replace(/["']/g, '') === family) {
          registered = true;
        }
      });
      if (generic || registered) {
        document.fonts.load(font, text).then(draw, draw);
        return;
      }
      if (performance.now() - started > 6000) {
        draw();
        return;
      }
      setTimeout(waitForFace, 120);
    };
    waitForFace();
    return () => {
      cancelled = true;
    };
  }, [text, style, color, grain, roughness, pressure, seed]);

  if (Platform.OS !== 'web') {
    return <Text style={[style, { color }]}>{text}</Text>;
  }

  return (
    <View style={styles.root}>
      {React.createElement('canvas', {
        ref: canvasRef,
        style: { width: size.w, height: size.h, display: 'block' },
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
});

export default ChalkText;
