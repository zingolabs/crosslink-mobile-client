/// <reference lib="dom" />
import React, { useCallback, useLayoutEffect, useRef } from 'react';
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
 * Consequence: shared-value motion does not play in Storybook. Verify it on
 * device. Three things do play, because they map onto CSS:
 *   - CSS animations and transitions declared in `style`
 *   - `entering` builders (Fade*, Zoom*), compiled to keyframes on mount
 *   - `layout` builders, run as a FLIP transform transition whenever the
 *     element's position changes between renders
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
export const steps = (n: number, modifier?: string) =>
  `steps(${n}${modifier ? `, ${modifier}` : ''})`;
export const linear = () => 'linear';
export const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend' } as const;

type AnyStyle = Record<string, unknown>;

type BuilderSpec = {
  kind: 'enter' | 'layout';
  from: AnyStyle;
  duration: number;
  delay: number;
  easing: string;
};

/**
 * Mirrors Reanimated's chainable builder. Every modifier returns a new
 * builder, so module-level constants like `FadeInDown.duration(250)` stay
 * immutable the way they do natively.
 */
class LayoutBuilder {
  constructor(readonly spec: BuilderSpec) {}
  private with(patch: Partial<BuilderSpec>) {
    return new LayoutBuilder({ ...this.spec, ...patch });
  }
  duration(ms: number) {
    return this.with({ duration: ms });
  }
  delay(ms: number) {
    return this.with({ delay: ms });
  }
  easing(fn: unknown) {
    return this.with({
      easing: typeof fn === 'string' ? fn : 'cubic-bezier(0.23, 1, 0.32, 1)',
    });
  }
  springify() {
    return this.with({ easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
  }
  damping() {
    return this;
  }
  dampingRatio() {
    return this;
  }
  stiffness() {
    return this;
  }
  mass() {
    return this;
  }
  reduceMotion() {
    return this;
  }
  randomDelay() {
    return this;
  }
  withCallback() {
    return this;
  }
  withInitialValues(v: AnyStyle) {
    return this.with({ from: { ...this.spec.from, ...v } });
  }
}

const enter = (from: AnyStyle) =>
  new LayoutBuilder({
    kind: 'enter',
    from,
    duration: 300,
    delay: 0,
    easing: 'ease-out',
  });

export const FadeIn = enter({ opacity: 0 });
export const FadeOut = enter({ opacity: 0 });
export const FadeInUp = enter({ opacity: 0, transform: [{ translateY: 25 }] });
export const FadeInDown = enter({
  opacity: 0,
  transform: [{ translateY: -25 }],
});
export const FadeInLeft = enter({
  opacity: 0,
  transform: [{ translateX: -25 }],
});
export const FadeInRight = enter({
  opacity: 0,
  transform: [{ translateX: 25 }],
});
export const FadeOutUp = enter({ opacity: 0 });
export const FadeOutDown = enter({ opacity: 0 });
export const ZoomIn = enter({ opacity: 0, transform: [{ scale: 0 }] });
export const ZoomOut = enter({ opacity: 0 });
export const SlideInDown = enter({ transform: [{ translateY: 100 }] });
export const SlideInUp = enter({ transform: [{ translateY: -100 }] });
export const LinearTransition = new LayoutBuilder({
  kind: 'layout',
  from: {},
  duration: 300,
  delay: 0,
  easing: 'ease-out',
});
export const Layout = LinearTransition;
export const CurvedTransition = LinearTransition;
export const FadingTransition = LinearTransition;
export const SequencedTransition = LinearTransition;
export const ReduceMotion = {
  System: 'system',
  Always: 'always',
  Never: 'never',
} as const;

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

const asBuilder = (v: unknown): LayoutBuilder | null =>
  v instanceof LayoutBuilder ? v : null;

/** `entering` becomes a one-shot keyframe animation on first mount. */
const enteringStyle = (b: LayoutBuilder | null): AnyStyle | null =>
  b
    ? {
        animationName: { from: b.spec.from, to: {} },
        animationDuration: b.spec.duration,
        animationDelay: b.spec.delay,
        animationTimingFunction: b.spec.easing,
        animationFillMode: 'backwards',
      }
    : null;

/**
 * The element's position with its own transform taken out, so a running
 * entrance or an earlier FLIP never counts as a layout change.
 */
const layoutRect = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  const t = getComputedStyle(el).transform;
  const m = /^matrix\(([^)]+)\)$/.exec(t);
  if (!m) {
    return { left: r.left, top: r.top };
  }
  const [, , , , e, f] = m[1].split(',').map(Number);
  return { left: r.left - e, top: r.top - f };
};

/**
 * `layout`: FLIP. After every render, compare the element's position with
 * the one recorded last time and play the difference as a transform
 * transition from the old place to the new one.
 */
function useFlip(enabled: LayoutBuilder | null) {
  const node = useRef<HTMLElement | null>(null);
  const last = useRef<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = node.current;
    if (!el || !enabled) {
      return;
    }
    const rect = layoutRect(el);
    const prev = last.current;
    last.current = rect;
    if (!prev) {
      return;
    }
    const dx = prev.left - rect.left;
    const dy = prev.top - rect.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      return;
    }
    const { duration, easing, delay } = enabled.spec;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.getBoundingClientRect();
    el.style.transition = `transform ${duration}ms ${easing} ${delay}ms`;
    el.style.transform = '';
    const done = () => {
      el.style.transition = '';
      el.removeEventListener('transitionend', done);
    };
    el.addEventListener('transitionend', done);
  });
  return node;
}

/**
 * CSS restarts a keyframe animation whenever React rewrites the style, so
 * a row that re-renders after its entrance would replay it. Remember when
 * each one-shot animation started on this element and drop it from the
 * style once it has had time to finish.
 */
function useSettledAnimations() {
  const started = useRef(new Map<string, number>());
  return (style: unknown): unknown => {
    const flat = (RNStyleSheet.flatten(style as never) ?? {}) as AnyStyle;
    const name = flat.animationName;
    if (!name || typeof name !== 'object') {
      return style;
    }
    if (flat.animationIterationCount === 'infinite') {
      return style;
    }
    const id = JSON.stringify([
      name,
      flat.animationDuration,
      flat.animationDelay,
    ]);
    const now = Date.now();
    const at = started.current.get(id);
    if (at === undefined) {
      started.current.set(id, now);
      return style;
    }
    const total =
      Number(flat.animationDuration ?? 0) + Number(flat.animationDelay ?? 0);
    if (now - at <= total + 50) {
      return style;
    }
    const rest: AnyStyle = { ...flat };
    [
      'animationName',
      'animationDuration',
      'animationDelay',
      'animationTimingFunction',
      'animationIterationCount',
      'animationFillMode',
      'animationDirection',
    ].forEach(k => delete rest[k]);
    return rest;
  };
}

function withCSS<P extends { style?: unknown }>(
  Component: React.ComponentType<P>,
) {
  const Wrapped = React.forwardRef<unknown, P>((props, ref) => {
    const clean: AnyStyle = { ...(props as AnyStyle) };
    LAYOUT_PROPS.forEach(k => delete clean[k]);
    const settle = useSettledAnimations();
    const enteringRef = useRef(asBuilder((props as AnyStyle).entering));
    const flip = useFlip(asBuilder((props as AnyStyle).layout));
    const setRef = useCallback(
      (n: unknown) => {
        flip.current = n as HTMLElement | null;
        if (typeof ref === 'function') {
          ref(n);
        } else if (ref) {
          (ref as React.MutableRefObject<unknown>).current = n;
        }
      },
      [flip, ref],
    );
    const base = toWebStyle(settle(props.style));
    const entering = enteringStyle(enteringRef.current);
    const live = entering ? settle(entering) : null;
    clean.style = live ? [base, toWebStyle(live)] : base;
    return <Component ref={setRef} {...(clean as P)} />;
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
