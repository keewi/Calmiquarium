export const between = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
export const floatBetween = (min: number, max: number) => Math.random() * (max - min) + min;
export const pickInt = (range: readonly [number, number]) => between(range[0], range[1]);
export const pickFloat = (range: readonly [number, number]) => floatBetween(range[0], range[1]);
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Framerate-independent exponential approach. */
export const approach = (cur: number, target: number, rate: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-rate * dt));
