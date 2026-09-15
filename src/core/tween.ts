export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  quadIn: (t: number) => t * t,
  quadOut: (t: number) => t * (2 - t),
  backOut: (t: number) => { const s = 1.70158; const u = t - 1; return 1 + u * u * ((s + 1) * u + s); },
};

interface Active {
  target: Record<string, number>;
  from: Record<string, number>;
  to: Record<string, number>;
  duration: number;
  elapsed: number;
  ease: Ease;
  onComplete?: () => void;
}

/** Minimal tween runner. Durations are ms; update() takes seconds. */
export class Tweens {
  private active: Active[] = [];

  add(target: object, to: Record<string, number>, opts: { duration: number; ease?: Ease; onComplete?: () => void }) {
    const t = target as Record<string, number>;
    const from: Record<string, number> = {};
    for (const k in to) from[k] = t[k];
    this.active.push({ target: t, from, to, duration: opts.duration, elapsed: 0, ease: opts.ease ?? ease.quadOut, onComplete: opts.onComplete });
  }

  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const tw = this.active[i];
      tw.elapsed += dt * 1000;
      const p = Math.min(tw.elapsed / tw.duration, 1);
      const e = tw.ease(p);
      for (const k in tw.to) tw.target[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (p >= 1) {
        this.active.splice(i, 1);
        tw.onComplete?.();
      }
    }
  }
}
