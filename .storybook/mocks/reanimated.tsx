import React, { useRef } from 'react';
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  FlatList as RNFlatList,
  StyleSheet as RNStyleSheet,
  Text as RNText,
  View as RNView,
} from 'react-native';

/**
 * Web stub for react-native-reanimated 4.
 *
 * Reanimated 4 compiles worklets through `react-native-worklets`, whose runtime
 * has no web implementation — the compiled output throws
 * "Failed to create a worklet" in the browser. Stories only need the layout to
 * settle at its final state, so this evaluates style functions synchronously on
 * the JS thread and applies target values immediately.
 *
 * Consequence: motion does not play in Storybook. Verify animation on device.
 */

type Shared<T> = {
  value: T;
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
};

export function useSharedValue<T>(initial: T): Shared<T> {
  const ref = useRef<Shared<T> | null>(null);
  if (!ref.current) {
    const shared: Shared<T> = {
      value: initial,
      get: () => shared.value,
      set: next => {
        shared.value =
          typeof next === 'function'
            ? (next as (p: T) => T)(shared.value)
            : next;
      },
    };
    ref.current = shared;
  }
  return ref.current;
}

/** Runs the style factory eagerly; re-runs on every render, not per frame. */
export function useAnimatedStyle<T>(factory: () => T): T {
  return factory();
}

/** Animation helpers resolve straight to their target value. */
export const withTiming = <T,>(to: T) => to;
export const withSpring = <T,>(to: T) => to;
export const withDelay = <T,>(_ms: number, to: T) => to;
export const withRepeat = <T,>(to: T) => to;
export const withSequence = <T,>(...steps: T[]) => steps[steps.length - 1];
export const cancelAnimation = () => {};
export const useReducedMotion = () => false;
export const runOnJS =
  <F extends (...a: never[]) => unknown>(fn: F) =>
  (...a: Parameters<F>) =>
    fn(...a);
export const runOnUI =
  <F extends (...a: never[]) => unknown>(fn: F) =>
  (...a: Parameters<F>) =>
    fn(...a);
export const interpolate = (
  v: number,
  input: number[],
  output: number[],
): number => {
  if (v <= input[0]) {
    return output[0];
  }
  if (v >= input[input.length - 1]) {
    return output[output.length - 1];
  }
  for (let i = 1; i < input.length; i++) {
    if (v <= input[i]) {
      const t = (v - input[i - 1]) / (input[i] - input[i - 1]);
      return output[i - 1] + t * (output[i] - output[i - 1]);
    }
  }
  return output[output.length - 1];
};

export const Easing = RNEasing;
// CSS easing helpers: react-native-web takes the CSS string directly.
export const cubicBezier = (a: number, b: number, c: number, d: number) =>
  `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
export const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend' } as const;

type LayoutStub = {
  duration: (ms: number) => LayoutStub;
  delay: (ms: number) => LayoutStub;
  easing: (fn: unknown) => LayoutStub;
  springify: () => LayoutStub;
  reduceMotion: (mode: unknown) => LayoutStub;
  withInitialValues: (v: unknown) => LayoutStub;
};
const layoutStub = (): LayoutStub => {
  const stub: LayoutStub = {
    duration: () => stub,
    delay: () => stub,
    easing: () => stub,
    springify: () => stub,
    reduceMotion: () => stub,
    withInitialValues: () => stub,
  };
  return stub;
};
export const FadeIn = layoutStub();
export const FadeOut = layoutStub();
export const FadeInUp = layoutStub();
export const FadeInDown = layoutStub();
export const FadeOutUp = layoutStub();
export const FadeOutDown = layoutStub();
export const ZoomOut = layoutStub();
export const LinearTransition = layoutStub();
export const ReduceMotion = {
  System: 'system',
  Always: 'always',
  Never: 'never',
} as const;

type AnyStyle = Record<string, unknown>;

const toMs = (v: unknown) => (typeof v === 'number' ? `${v}ms` : v);
const toList = (v: unknown) => (Array.isArray(v) ? v.join(', ') : v);
const compiledKeyframes = new Map<string, unknown>();

const px = (v: unknown) => (typeof v === 'number' ? `${v}px` : v);
const toWebTransform = (t: unknown) =>
  Array.isArray(t)
    ? t
        .map(entry => {
          const [fn, value] = Object.entries(entry as AnyStyle)[0];
          const unit = /^translate/.test(fn) ? px(value) : value;
          return `${fn}(${unit})`;
        })
        .join(' ')
    : t;
const toWebFrame = (frame: AnyStyle): AnyStyle =>
  frame.transform === undefined
    ? frame
    : { ...frame, transform: toWebTransform(frame.transform) };

/**
 * Maps Reanimated CSS animation/transition props onto react-native-web's
 * `animationKeyframes` (only honoured through `StyleSheet.create` `$raw`
 * entries) and its transition props, so CSS-driven motion plays on web.
 */
function toWebStyle(style: unknown): unknown {
  const flat = (RNStyleSheet.flatten(style as never) ?? {}) as AnyStyle;
  const {
    animationName,
    animationDuration,
    animationDelay,
    animationTimingFunction,
    animationIterationCount,
    animationDirection,
    animationFillMode,
    transitionProperty,
    transitionDuration,
    transitionDelay,
    transitionTimingFunction,
    ...rest
  } = flat;

  const out: AnyStyle = { ...rest };
  if (transitionProperty !== undefined) {
    out.transitionProperty = toList(transitionProperty);
    out.transitionDuration = toMs(transitionDuration ?? 0);
    out.transitionTimingFunction = toList(transitionTimingFunction);
    if (transitionDelay !== undefined) {
      out.transitionDelay = toMs(transitionDelay);
    }
  }

  if (!animationName || typeof animationName !== 'object') {
    return out;
  }

  const frames: AnyStyle = {};
  Object.entries(animationName as AnyStyle).forEach(([k, v]) => {
    const key =
      k === 'from' || k === 'to' || /%$/.test(k) ? k : `${Number(k) * 100}%`;
    frames[key] = toWebFrame(v as AnyStyle);
  });
  const decl: AnyStyle = {
    animationKeyframes: [frames],
    animationDuration: toMs(animationDuration ?? 0),
    animationTimingFunction: toList(animationTimingFunction ?? 'ease'),
    animationIterationCount: animationIterationCount ?? 1,
    animationFillMode: animationFillMode ?? 'both',
  };
  if (animationDirection !== undefined) {
    decl.animationDirection = animationDirection;
  }
  if (animationDelay !== undefined) {
    decl.animationDelay = toMs(animationDelay);
  }
  const id = JSON.stringify(decl);
  let compiled = compiledKeyframes.get(id);
  if (!compiled) {
    compiled = (RNStyleSheet.create({ rnanim$raw: decl } as never) as AnyStyle)
      .rnanim$raw;
    compiledKeyframes.set(id, compiled);
  }
  return [out, compiled];
}

const LAYOUT_PROPS = ['entering', 'exiting', 'layout', 'itemLayoutAnimation'];

function withCSS<P extends { style?: unknown }>(
  Component: React.ComponentType<P>,
) {
  const Wrapped = React.forwardRef<unknown, P>((props, ref) => {
    const clean: AnyStyle = { ...(props as AnyStyle) };
    LAYOUT_PROPS.forEach(k => delete clean[k]);
    clean.style = toWebStyle(props.style);
    return <Component ref={ref} {...(clean as P)} />;
  });
  Wrapped.displayName = `Animated(${Component.displayName ?? Component.name ?? 'Component'})`;
  return Wrapped as unknown as React.ComponentType<P>;
}

const Animated = {
  View: withCSS(RNView) as React.ComponentType<
    React.ComponentProps<typeof RNView> & Record<string, unknown>
  >,
  Text: withCSS(RNText) as React.ComponentType<
    React.ComponentProps<typeof RNText> & Record<string, unknown>
  >,
  Image: RNAnimated.Image,
  ScrollView: RNAnimated.ScrollView,
  FlatList: withCSS(RNFlatList) as React.ComponentType<
    React.ComponentProps<typeof RNFlatList> & Record<string, unknown>
  >,
  createAnimatedComponent: withCSS,
};

export default Animated;
