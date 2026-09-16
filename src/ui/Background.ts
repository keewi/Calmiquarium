import { Graphics } from 'pixi.js';
import { CONFIG } from '../config';
import { lerpColor } from '../core/color';

/** Static backdrop. Drawn once per resize — never per frame. */
export class Background {
  readonly view = new Graphics();

  draw(width: number, height: number) {
    const g = this.view;
    g.clear();

    // water: vertical gradient in bands
    const bands = 24;
    const bandH = height / bands;
    for (let i = 0; i < bands; i++) {
      g.rect(0, i * bandH, width, bandH + 1).fill(lerpColor(0x1e5a94, 0x0a1a38, i / (bands - 1)));
    }

    // light rays
    for (let i = 0; i < 5; i++) {
      const x = width * (0.1 + i * 0.2);
      g.poly([x - 10, 0, x + 30, 0, x + 140, height, x + 40, height]).fill({ color: 0xffffff, alpha: 0.03 });
    }

    // sand
    const sandTop = height - CONFIG.layout.sandHeight;
    g.rect(0, sandTop, width, CONFIG.layout.sandHeight).fill(0xc9ad72);
    g.rect(0, sandTop, width, 6).fill(0xdcc48c);
    g.rect(0, sandTop + 30, width, CONFIG.layout.sandHeight - 30).fill({ color: 0x8c6f3e, alpha: 0.35 });

    // a few rocks
    const rocks = [[0.12, 26, 12], [0.18, 16, 8], [0.72, 30, 14], [0.8, 18, 9], [0.5, 14, 7]];
    for (const [fx, rw, rh] of rocks) {
      const x = width * fx;
      g.ellipse(x, sandTop + 2, rw, rh).fill(0x5a6a72);
      g.ellipse(x - rw * 0.25, sandTop - rh * 0.35, rw * 0.5, rh * 0.4).fill({ color: 0xffffff, alpha: 0.12 });
    }

  }
}
