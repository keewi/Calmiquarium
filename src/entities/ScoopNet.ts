import { Container, FederatedPointerEvent, Sprite } from 'pixi.js';
import { CONFIG } from '../config';
import { ease } from '../core/tween';
import type { World } from '../world/World';
import type { Fish } from './Fish';

const N = CONFIG.net;

/**
 * A draggable scoop net. Hold and drag it through the tank to catch fish;
 * they ride along in the bag until they're sold from the sidebar.
 */
export class ScoopNet {
  readonly view = new Container();
  private sprite: Sprite;
  private bag = new Container();   // caught fish live in here, behind the mesh
  private dragging = false;
  private grabDX = 0;
  private grabDY = 0;

  caught: Fish[] = [];

  constructor(private world: World) {
    const b = world.textures.net;
    this.sprite = new Sprite(b.texture);
    this.sprite.anchor.set(b.anchorX, b.anchorY);

    this.view.addChild(this.bag, this.sprite);
    this.view.position.set(world.waterLeft + world.waterWidth / 2, world.waterTop + 160);

    this.view.eventMode = 'static';
    this.view.cursor = 'grab';
    this.view.on('pointerdown', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this.dragging = true;
      this.view.cursor = 'grabbing';
      this.grabDX = this.view.x - e.global.x;
      this.grabDY = this.view.y - e.global.y;
    });
    this.view.on('globalpointermove', (e: FederatedPointerEvent) => {
      if (!this.dragging) return;
      this.view.x = e.global.x + this.grabDX;
      this.view.y = e.global.y + this.grabDY;
      this.clampToTank();
    });
    for (const ev of ['pointerup', 'pointerupoutside'] as const) {
      this.view.on(ev, () => { this.dragging = false; this.view.cursor = 'grab'; });
    }

    // a small arrival bounce so it's obvious the net showed up
    this.view.scale.set(0.4);
    world.tweens.add(this.view.scale, { x: 1, y: 1 }, { duration: 420, ease: ease.backOut });
  }

  get full() { return this.caught.length >= N.capacity; }

  private clampToTank() {
    const W = this.world;
    this.view.x = Math.max(W.waterLeft + 20, Math.min(W.width - 20, this.view.x));
    this.view.y = Math.max(W.waterTop + 20, Math.min(W.sandTop + 10, this.view.y));
  }

  update(_dt: number) {
    if (this.dragging && !this.full) this.scoop();
    this.layoutBag();
  }

  /** Catch any free-swimming fish whose body is inside the hoop. */
  private scoop() {
    for (const f of this.world.fish) {
      if (f.dead || f.caught) continue;
      const dx = f.x - this.view.x;
      const dy = f.y - this.view.y;
      if (dx * dx + dy * dy > N.catchRadius * N.catchRadius) continue;

      f.capture();
      this.caught.push(f);
      this.bag.addChild(f.view);           // reparent: now positioned inside the net
      f.view.position.set(dx * 0.4, dy * 0.4);
      this.world.tweens.add(f.view, { x: 0, y: 0 }, { duration: 260, ease: ease.quadOut });
      this.world.onNetChanged();
      if (this.full) break;
    }
  }

  /** Arrange the catch in a loose huddle inside the bag. */
  private layoutBag() {
    const n = this.caught.length;
    for (let i = 0; i < n; i++) {
      const fish = this.caught[i];
      if (this.world.tweens.isTweening(fish.view)) continue;
      const angle = (i / Math.max(n, 1)) * Math.PI * 2;
      const r = n === 1 ? 0 : 6 + (i % 3) * 7;
      fish.view.x = Math.cos(angle) * r;
      fish.view.y = 6 + Math.sin(angle) * r * 0.6;
    }
  }

  /** Hand the catch back to the world for selling. Returns the fish sold. */
  takeAll(): Fish[] {
    const sold = this.caught;
    this.caught = [];
    return sold;
  }
}
