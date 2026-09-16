import { Graphics } from 'pixi.js';
import { CONFIG } from '../config';
import { lerpColor } from '../core/color';

/** Static backdrop. Drawn once per resize — never per frame. */
export class Background {
  readonly view = new Graphics();

  draw(left: number, width: number, height: number) {
    const g = this.view;
    g.clear();
    const ww = width - left;

    // water: vertical gradient in bands
    const bands = 24;
    const bandH = height / bands;
    for (let i = 0; i < bands; i++) {
      g.rect(left, i * bandH, ww, bandH + 1).fill(lerpColor(0x1e5a94, 0x0a1a38, i / (bands - 1)));
    }

    // light rays
    for (let i = 0; i < 5; i++) {
      const x = left + ww * (0.1 + i * 0.2);
      g.poly([x - 10, 0, x + 30, 0, x + 140, height, x + 40, height]).fill({ color: 0xffffff, alpha: 0.03 });
    }

    // sand
    const sandTop = height - CONFIG.layout.sandHeight;
    g.rect(left, sandTop, ww, CONFIG.layout.sandHeight).fill(0xc9ad72);
    g.rect(left, sandTop, ww, 6).fill(0xdcc48c);
    g.rect(left, sandTop + 30, ww, CONFIG.layout.sandHeight - 30).fill({ color: 0x8c6f3e, alpha: 0.35 });

    // a few rocks
    const rocks = [[0.12, 26, 12], [0.18, 16, 8], [0.72, 30, 14], [0.8, 18, 9], [0.5, 14, 7]];
    for (const [fx, rw, rh] of rocks) {
      const x = left + ww * fx;
      g.ellipse(x, sandTop + 2, rw, rh).fill(0x5a6a72);
      g.ellipse(x - rw * 0.25, sandTop - rh * 0.35, rw * 0.5, rh * 0.4).fill({ color: 0xffffff, alpha: 0.12 });
    }

  }
}
