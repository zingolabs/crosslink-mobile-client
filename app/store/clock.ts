import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  if (timer === null) {
    timer = setInterval(() => listeners.forEach(notify => notify()), 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
};

const never = (): (() => void) => () => {};

const getSnapshot = (): number => Math.floor(Date.now() / 1000);

const getPaused = (): number => 0;

export const useNowSeconds = (enabled: boolean = true): number =>
  useSyncExternalStore(
    enabled ? subscribe : never,
    enabled ? getSnapshot : getPaused,
    enabled ? getSnapshot : getPaused,
  );
