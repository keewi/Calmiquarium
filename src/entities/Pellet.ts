import { Sprite } from 'pixi.js';
import { CONFIG } from '../config';
import { ease } from '../core/tween';
import type { World } from '../world/World';

export class Pellet {
  readonly view: Sprite;
  consumed = false;

  constructor(private world: World, x: number, y: number) {
    const b = world.textures.pellet;
    this.view = new Sprite(b.texture);
    this.view.anchor.set(b.anchorX, b.anchorY);
    this.view.position.set(x, y);
    this.view.scale.set(0);
    world.tweens.add(this.view.scale, { x: 1, y: 1 }, { duration: 200, ease: ease.backOut });
  }

  get x() { return this.view.x; }
  get y() { return this.view.y; }

  update(dt: number) {
    if (this.consumed) return;
    this.view.y += CONFIG.food.fallSpeed * dt;
    if (this.view.y >= this.world.sandTop - 8) {
      this.view.y = this.world.sandTop - 8;
      this.consume(); // sank to the floor uneaten
    }
  }

  consume() {
    if (this.consumed) return;
    this.consumed = true;
    this.world.tweens.add(this.view, { alpha: 0 }, { duration: 300, ease: ease.quadIn, onComplete: () => this.view.destroy() });
    this.world.tweens.add(this.view.scale, { x: 0, y: 0 }, { duration: 300, ease: ease.quadIn });
  }
}
