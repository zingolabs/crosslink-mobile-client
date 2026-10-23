/// <reference lib="dom" />
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Timeline } from './timeline';

export type TimelineState = {
  time: number;
  values: Record<string, number>;
  replay: () => void;
};

export const useTimeline = (
  tl: Timeline,
  options: { autoplay?: boolean; time?: number } = {},
): TimelineState => {
  const { autoplay = true, time: scrub = 0 } = options;
  const [time, setTime] = useState(autoplay ? 0 : scrub);
  const startRef = useRef(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!autoplay) {
      setTime(scrub);
      return;
    }
    startRef.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - startRef.current) / 1000;
      setTime(t);
      if (t < tl.duration) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoplay, scrub, tl, run]);

  const replay = useCallback(() => setRun(r => r + 1), []);

  return { time, values: tl.at(time), replay };
};
