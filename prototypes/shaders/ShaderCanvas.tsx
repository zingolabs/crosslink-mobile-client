/// <reference lib="dom" />
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { VERTEX_SHADER } from './paperGlsl';

export type UniformValue = number | number[] | number[][];
export type Uniforms = Record<string, UniformValue>;

export type SizingProps = {
  fit?: 'none' | 'contain' | 'cover';
  scale?: number;
  rotation?: number;
  originX?: number;
  originY?: number;
  offsetX?: number;
  offsetY?: number;
  worldWidth?: number;
  worldHeight?: number;
};

export type ShaderCanvasProps = SizingProps & {
  fragment: string;
  uniforms: Uniforms;
  speed?: number;
  frame?: number;
  noiseTexture?: boolean;
  fallbackColor?: string;
};

const FIT = { none: 0, contain: 1, cover: 2 } as const;

const compile = (gl: WebGL2RenderingContext, type: number, src: string) => {
  const sh = gl.createShader(type);
  if (!sh) {
    return null;
  }
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
};

const noiseBytes = (size: number) => {
  const data = new Uint8Array(size * size * 4);
  let s = 1234567;
  for (let i = 0; i < data.length; i++) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    data[i] = Math.floor(s / 16777216);
  }
  return data;
};

const ShaderCanvas: React.FC<ShaderCanvasProps> = ({
  fragment,
  uniforms,
  speed = 1,
  frame = 0,
  noiseTexture = false,
  fallbackColor = '#0f0f0f',
  fit = 'contain',
  scale = 1,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<{
    gl: WebGL2RenderingContext;
    program: WebGLProgram;
    locations: Map<string, WebGLUniformLocation | null>;
  } | null>(null);
  const latest = useRef({
    uniforms,
    speed,
    sizing: {
      fit,
      scale,
      rotation,
      originX,
      originY,
      offsetX,
      offsetY,
      worldWidth,
      worldHeight,
    },
  });
  latest.current = {
    uniforms,
    speed,
    sizing: {
      fit,
      scale,
      rotation,
      originX,
      originY,
      offsetX,
      offsetY,
      worldWidth,
      worldHeight,
    },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true });
    if (!gl) {
      return;
    }
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) {
      return;
    }
    const program = gl.createProgram();
    if (!program) {
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const locations = new Map<string, WebGLUniformLocation | null>();
    const loc = (name: string) => {
      if (!locations.has(name)) {
        locations.set(name, gl.getUniformLocation(program, name));
      }
      return locations.get(name) ?? null;
    };

    if (noiseTexture) {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        128,
        128,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        noiseBytes(128),
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.uniform1i(loc('u_noiseTexture'), 0);
    }

    stateRef.current = { gl, program, locations };

    const setUniform = (name: string, value: UniformValue) => {
      const l = loc(name);
      if (l === null) {
        return;
      }
      if (typeof value === 'number') {
        gl.uniform1f(l, value);
      } else if (Array.isArray(value[0])) {
        gl.uniform4fv(l, new Float32Array((value as number[][]).flat()));
      } else if (value.length === 2) {
        gl.uniform2f(l, value[0] as number, value[1] as number);
      } else if (value.length === 4) {
        const v = value as number[];
        gl.uniform4f(l, v[0], v[1], v[2], v[3]);
      }
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(loc('u_resolution'), w, h);
      gl.uniform1f(loc('u_pixelRatio'), dpr);
      gl.uniform1f(loc('u_imageAspectRatio'), 1);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let currentFrame = frame;
    let last = performance.now();
    let raf = 0;
    let disposed = false;

    const draw = (now: number) => {
      if (disposed) {
        return;
      }
      const { uniforms: u, speed: s, sizing } = latest.current;
      currentFrame += (now - last) * s;
      last = now;
      gl.uniform1f(loc('u_time'), currentFrame * 0.001);
      gl.uniform1f(loc('u_fit'), FIT[sizing.fit]);
      gl.uniform1f(loc('u_scale'), sizing.scale);
      gl.uniform1f(loc('u_rotation'), sizing.rotation);
      gl.uniform1f(loc('u_originX'), sizing.originX);
      gl.uniform1f(loc('u_originY'), sizing.originY);
      gl.uniform1f(loc('u_offsetX'), sizing.offsetX);
      gl.uniform1f(loc('u_offsetY'), sizing.offsetY);
      gl.uniform1f(loc('u_worldWidth'), sizing.worldWidth);
      gl.uniform1f(loc('u_worldHeight'), sizing.worldHeight);
      Object.entries(u).forEach(([k, v]) => setUniform(k, v));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      gl.deleteProgram(program);
      stateRef.current = null;
    };
  }, [fragment, noiseTexture, frame]);

  if (Platform.OS !== 'web') {
    return (
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: fallbackColor }]}
      />
    );
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {React.createElement('canvas', {
        ref: canvasRef,
        style: { width: '100%', height: '100%', display: 'block' },
      })}
    </View>
  );
};

export default ShaderCanvas;
