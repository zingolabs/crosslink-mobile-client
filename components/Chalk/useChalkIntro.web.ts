import { useMemo } from 'react';

import { timeline } from '../../prototypes/motion/timeline';
import { useTimeline } from '../../prototypes/motion/useTimeline';

type Channel = { value: number };

export type ChalkReveal = {
  paper: Channel;
  lights: Channel;
  columns: Channel;
  line: Channel;
  flash: Channel;
  title: Channel;
  ui: Channel;
  secondary: Channel;
};

export const useChalkIntro = (ready = true, still = false): ChalkReveal => {
  const tl = useMemo(
    () =>
      timeline()
        .to('paper', { duration: 0.6, ease: 'outCubic' })
        .to('lights', { duration: 2.8, ease: 'linear' }, 0)
        .to('columns', { duration: 1.1, ease: 'inQuart' }, '-=0.5')
        .to('line', { duration: 0.45, ease: 'outExpo' })
        .to('title', { duration: 0.7, ease: 'outQuad' }, '<')
        .to('ui', { duration: 0.65, ease: 'outCubic' }, '<+=0.35')
        .to('secondary', { duration: 0.65, ease: 'outCubic' }, '<+=0.2')
        .to('flash', { from: 0, to: 1, duration: 0.05, ease: 'outExpo' }, '<')
        .to(
          'flash',
          { from: 1, to: 0, duration: 1.2, ease: 'outQuint' },
          '<+=0.05',
        ),
    [],
  );
  const { values } = useTimeline(tl, {
    autoplay: ready && !still,
    time: still ? tl.duration : 0,
  });
  return {
    paper: { value: values.paper ?? 0 },
    lights: { value: values.lights ?? 0 },
    columns: { value: values.columns ?? 0 },
    line: { value: values.line ?? 0 },
    flash: { value: values.flash ?? 0 },
    title: { value: values.title ?? 0 },
    ui: { value: values.ui ?? 0 },
    secondary: { value: values.secondary ?? 0 },
  };
};
