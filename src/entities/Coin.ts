import { Circle, FederatedPointerEvent, Sprite } from 'pixi.js';
import { CONFIG, CoinType } from '../config';
import { ease } from '../core/tween';
import type { World } from '../world/World';

export class Coin {
  readonly view: Sprite;
  collected = false;
  private settled = false;
  private settledFor = 0; // ms

  constructor(private world: World, x: number, y: number, readonly type: CoinType) {
    const b = world.textures.coin[type];
    const scale = type === 'diamond' ? 1.6 : 1.4;
    this.view = new Sprite(b.texture);
    this.view.anchor.set(b.anchorX, b.anchorY);
    this.view.position.set(x, y);
    this.view.scale.set(scale);
    this.view.eventMode = 'static';
    this.view.cursor = 'pointer';
    this.view.hitArea = new Circle(0, 0, CONFIG.coins.collectRadius / scale);
    this.view.on('pointerdown', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this.collect();
    });
  }

  get value() { return CONFIG.coins.values[this.type]; }

  update(dt: number) {
    if (this.collected) return;
    if (!this.settled) {
      this.view.y += CONFIG.coins.fallSpeed * dt;
      const floor = this.world.sandTop - 10;
      if (this.view.y >= floor) {
        this.view.y = floor;
        this.settled = true;
      }
    } else {
      this.settledFor += dt * 1000;
      if (this.settledFor >= CONFIG.coins.expireMs) this.expire();
    }
  }

  collect() {
    if (this.collected) return;
    this.collected = true;
    this.view.eventMode = 'none';
    this.world.addCoins(this.value);
    const s = this.view.scale.x;
    this.world.tweens.add(this.view, { y: this.view.y - 40, alpha: 0 }, { duration: 350, ease: ease.quadOut, onComplete: () => this.view.destroy() });
    this.world.tweens.add(this.view.scale, { x: s * 1.5, y: s * 1.5 }, { duration: 350, ease: ease.quadOut });
  }

  private expire() {
    this.collected = true;
    this.view.eventMode = 'none';
    this.world.tweens.add(this.view, { alpha: 0 }, { duration: 500, ease: ease.quadIn, onComplete: () => this.view.destroy() });
  }
}
