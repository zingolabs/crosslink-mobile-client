export type Ease = (t: number) => number;

export const eases = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inQuart: (t: number) => t * t * t * t,
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  inExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
} satisfies Record<string, Ease>;

export type EaseName = keyof typeof eases;

export type TweenVars = {
  from?: number;
  to?: number;
  duration: number;
  ease?: Ease | EaseName;
};

export type Position =
  | number
  | '<'
  | `<+=${number}`
  | `+=${number}`
  | `-=${number}`;

type Tween = {
  channel: string;
  from: number;
  to: number;
  start: number;
  duration: number;
  ease: Ease;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export class Timeline {
  private tweens: Tween[] = [];

  to(channel: string, vars: TweenVars, position?: Position): this {
    const start = this.resolve(position);
    const easeFn =
      typeof vars.ease === 'string'
        ? eases[vars.ease]
        : (vars.ease ?? eases.linear);
    this.tweens.push({
      channel,
      from: vars.from ?? 0,
      to: vars.to ?? 1,
      start,
      duration: vars.duration,
      ease: easeFn,
    });
    return this;
  }

  get duration(): number {
    return this.tweens.reduce((m, t) => Math.max(m, t.start + t.duration), 0);
  }

  at(time: number): Record<string, number> {
    const out: Record<string, number> = {};
    for (const t of this.tweens) {
      if (time < t.start && t.channel in out) {
        continue;
      }
      const p = t.duration === 0 ? 1 : clamp01((time - t.start) / t.duration);
      out[t.channel] =
        time < t.start ? t.from : t.from + (t.to - t.from) * t.ease(p);
    }
    return out;
  }

  private resolve(position?: Position): number {
    const end = this.duration;
    if (position === undefined) {
      return end;
    }
    if (typeof position === 'number') {
      return position;
    }
    if (position.startsWith('<')) {
      const last = this.tweens[this.tweens.length - 1];
      const base = last ? last.start : 0;
      const rest = position.slice(1);
      return rest.startsWith('+=') ? base + parseFloat(rest.slice(2)) : base;
    }
    const delta = parseFloat(position.slice(2));
    return position.startsWith('+=') ? end + delta : end - delta;
  }
}

export const timeline = () => new Timeline();
