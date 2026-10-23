import { View, Text, Image, ScrollView, FlatList } from 'react-native';

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  createAnimatedComponent: c => c,
};

const useAnimatedStyle = jest.fn(() => ({}));
const useSharedValue = jest.fn(v => {
  const shared = { value: v };
  shared.get = () => shared.value;
  shared.set = next => {
    shared.value = typeof next === 'function' ? next(shared.value) : next;
  };
  return shared;
});
const interpolate = jest.fn((v, input, output) => output[0]);
const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend' };
const useDerivedValue = jest.fn(fn => ({ value: fn() }));
const useAnimatedReaction = jest.fn();
const withDelay = jest.fn((_ms, v) => v);
const withSequence = jest.fn((...steps) => steps[steps.length - 1]);
const cancelAnimation = jest.fn();
const useAnimatedGestureHandler = jest.fn(() => ({}));
const useReducedMotion = jest.fn(() => false);
const cubicBezier = (a, b, c, d) => `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
const steps = n => `steps(${n})`;
const withTiming = jest.fn(v => v);
const withSpring = jest.fn(v => v);
const layoutStub = () => {
  const stub = {};
  [
    'duration',
    'delay',
    'easing',
    'springify',
    'reduceMotion',
    'withInitialValues',
  ].forEach(k => {
    stub[k] = () => stub;
  });
  return stub;
};
const FadeIn = layoutStub();
const FadeOut = layoutStub();
const FadeInUp = layoutStub();
const FadeInDown = layoutStub();
const ZoomOut = layoutStub();
const LinearTransition = layoutStub();
const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' };
const Easing = {
  bezier: () => () => 0,
  linear: () => 0,
  out: f => f,
  in: f => f,
  inOut: f => f,
  poly: () => () => 0,
  quad: () => 0,
  exp: () => 0,
};

export default Animated;

export {
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  useAnimatedReaction,
  withDelay,
  withSequence,
  cancelAnimation,
  useAnimatedGestureHandler,
  useReducedMotion,
  cubicBezier,
  steps,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  FadeInUp,
  FadeInDown,
  ZoomOut,
  LinearTransition,
  ReduceMotion,
  Easing,
  interpolate,
  Extrapolation,
};
