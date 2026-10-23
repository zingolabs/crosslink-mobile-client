import { useEffect, useMemo } from 'react';
import {
  Easing,
  SharedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const START = 300;
const UI_DELAY = 350;
const SECONDARY_DELAY = 200;

export type ChalkReveal = {
  lights: SharedValue<number>;
  columns: SharedValue<number>;
  line: SharedValue<number>;
  flash: SharedValue<number>;
  title: SharedValue<number>;
  ui: SharedValue<number>;
  secondary: SharedValue<number>;
};

export const useChalkIntro = (ready = true, still = false): ChalkReveal => {
  const reducedMotion = useReducedMotion();
  const skip = reducedMotion || still;
  const lights = useSharedValue(skip ? 1 : 0);
  const columns = useSharedValue(skip ? 1 : 0);
  const line = useSharedValue(skip ? 1 : 0);
  const flash = useSharedValue(0);
  const title = useSharedValue(skip ? 1 : 0);
  const ui = useSharedValue(skip ? 1 : 0);
  const secondary = useSharedValue(skip ? 1 : 0);

  useEffect(() => {
    if (skip) {
      lights.value = 1;
      columns.value = 1;
      line.value = 1;
      flash.value = 0;
      title.value = 1;
      ui.value = 1;
      secondary.value = 1;
      return;
    }
    if (!ready) {
      return;
    }
    lights.value = withDelay(
      START,
      withTiming(1, { duration: 2800, easing: Easing.linear }),
    );
    columns.value = withDelay(
      START + 2300,
      withTiming(1, { duration: 1100, easing: Easing.in(Easing.poly(4)) }),
    );
    line.value = withDelay(
      START + 3400,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.exp) }),
    );
    flash.value = withDelay(
      START + 3400,
      withSequence(
        withTiming(1, { duration: 50, easing: Easing.out(Easing.exp) }),
        withTiming(0, { duration: 1200, easing: Easing.out(Easing.poly(5)) }),
      ),
    );
    title.value = withDelay(
      START + 3400,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
    );
    ui.value = withDelay(
      START + 3400 + UI_DELAY,
      withTiming(1, { duration: 650, easing: EASE_OUT }),
    );
    secondary.value = withDelay(
      START + 3400 + UI_DELAY + SECONDARY_DELAY,
      withTiming(1, { duration: 650, easing: EASE_OUT }),
    );
  }, [skip, ready, lights, columns, line, flash, title, ui, secondary]);

  return useMemo(
    () => ({ lights, columns, line, flash, title, ui, secondary }),
    [lights, columns, line, flash, title, ui, secondary],
  );
};
