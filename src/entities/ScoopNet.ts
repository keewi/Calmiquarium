import { Container, FederatedPointerEvent, Graphics, Sprite } from 'pixi.js';
import { CONFIG } from '../config';
import { approach, clamp } from '../core/rng';
import { ease } from '../core/tween';
import type { World } from '../world/World';
import type { Fish } from './Fish';

const N = CONFIG.net;

/**
 * A draggable scoop net. Hold and drag it through the tank to catch fish;
 * they ride along in the bag until they're sold from the sidebar.
 *
 * The net trails the cursor instead of snapping to it, the mesh billows back
 * against the direction of travel, and a sweep pulls bubbles through the water
 * — so it reads as dragging through something rather than sliding over it.
 */
export class ScoopNet {
  readonly view = new Container();
  private swing = new Container();   // everything that leans with the sweep
  private bag = new Container();     // caught fish ride in here
  private bagSprite: Sprite;
  private ring: Sprite;

  private dragging = false;
  private grabDX = 0;
  private grabDY = 0;
  private targetX: number;
  private targetY: number;
  private vx = 0;
  private vy = 0;
  private bubbleCooldown = 0;

  caught: Fish[] = [];

  constructor(private world: World) {
    const T = world.textures;

    this.bagSprite = new Sprite(T.netBag.texture);
    this.bagSprite.anchor.set(T.netBag.anchorX, T.netBag.anchorY);

    this.ring = new Sprite(T.netRing.texture);
    this.ring.anchor.set(T.netRing.anchorX, T.netRing.anchorY);

    this.bag.addChild(this.bagSprite);
    this.swing.addChild(this.bag, this.ring);
    this.view.addChild(this.swing);

    this.targetX = world.waterLeft + world.waterWidth / 2;
    this.targetY = world.waterTop + 160;
    this.view.position.set(this.targetX, this.targetY);

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
      this.targetX = e.global.x + this.grabDX;
      this.targetY = e.global.y + this.grabDY;
      this.clampTarget();
    });
    for (const ev of ['pointerup', 'pointerupoutside'] as const) {
      this.view.on(ev, () => { this.dragging = false; this.view.cursor = 'grab'; });
    }

    this.view.scale.set(0.4);
    world.tweens.add(this.view.scale, { x: 1, y: 1 }, { duration: 420, ease: ease.backOut });
  }

  get full() { return this.caught.length >= N.capacity; }

  private clampTarget() {
    const W = this.world;
    this.targetX = clamp(this.targetX, W.waterLeft + 20, W.width - 20);
    this.targetY = clamp(this.targetY, W.waterTop + 20, W.sandTop + 10);
  }

  update(dt: number) {
    if (dt <= 0) return;

    // the net lags behind the cursor — water resists
    const px = this.view.x, py = this.view.y;
    this.view.x = approach(this.view.x, this.targetX, N.follow, dt);
    this.view.y = approach(this.view.y, this.targetY, N.follow, dt);
    this.vx = (this.view.x - px) / dt;
    this.vy = (this.view.y - py) / dt;
    const speed = Math.hypot(this.vx, this.vy);

    // handle swings behind the sweep
    const lean = clamp(this.vx * N.leanPerVx, -N.maxLean, N.maxLean);
    this.swing.rotation = approach(this.swing.rotation, lean, 7, dt);

    // mesh billows back against the direction of travel
    const bx = clamp(-this.vx * N.billowPerV, -N.maxBillow, N.maxBillow);
    const by = clamp(-this.vy * N.billowPerV, -N.maxBillow, N.maxBillow);
    this.bag.x = approach(this.bag.x, bx, 10, dt);
    this.bag.y = approach(this.bag.y, by, 10, dt);

    // …and stretches along it
    const stretch = Math.min(speed * N.stretchPerV, 0.22);
    if (speed > 1) {
      const ang = Math.atan2(this.vy, this.vx) - this.swing.rotation;
      this.bagSprite.rotation = ang;
      this.bagSprite.scale.set(1 + stretch, 1 - stretch * 0.5);
    } else {
      this.bagSprite.scale.set(
        approach(this.bagSprite.scale.x, 1, 8, dt),
        approach(this.bagSprite.scale.y, 1, 8, dt),
      );
    }

    if (speed > N.bubbleSpeed) this.pullBubbles(dt, speed);

    // a net sweeping through water catches fish — including while it coasts
    // to a stop after the pointer is released
    if (!this.full && speed > N.scoopSpeed) this.scoop();
    this.layoutBag();
  }

  /** Little bubbles torn off the hoop as it sweeps through the water. */
  private pullBubbles(dt: number, speed: number) {
    this.bubbleCooldown -= dt * 1000;
    if (this.bubbleCooldown > 0) return;
    this.bubbleCooldown = 38;

    const back = Math.atan2(-this.vy, -this.vx);
    for (let i = 0; i < 2; i++) {
      const spread = back + (Math.random() - 0.5) * 1.5;
      const r = 20 + Math.random() * 22;
      const b = new Graphics()
        .circle(0, 0, 1.2 + Math.random() * 2.4)
        .fill({ color: 0xffffff, alpha: 0.05 })
        .circle(0, 0, 1.2 + Math.random() * 2.4)
        .stroke({ width: 1, color: 0xdff2ff, alpha: 0.75 });
      b.position.set(this.view.x + Math.cos(spread) * r, this.view.y + Math.sin(spread) * r);
      this.world.addFx(b);

      const drift = 26 + Math.random() * 30 + speed * 0.06;
      this.world.tweens.add(b, {
        x: b.x + Math.cos(spread) * drift,
        y: b.y + Math.sin(spread) * drift - 14,
        alpha: 0,
      }, { duration: 620 + Math.random() * 380, ease: ease.quadOut, onComplete: () => b.destroy() });
    }
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
      this.bag.addChild(f.view);
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

  /** Single use: lift out of the water and vanish. */
  retire() {
    this.dragging = false;
    this.view.eventMode = 'none';
    this.world.tweens.cancel(this.view, this.view.scale, this.bag, this.bagSprite.scale);
    this.world.tweens.add(this.view, { y: this.view.y - 70, alpha: 0 }, {
      duration: 520, ease: ease.quadIn, onComplete: () => this.view.destroy({ children: true }),
    });
    this.world.tweens.add(this.view.scale, { x: 0.6, y: 0.6 }, { duration: 520, ease: ease.quadIn });
  }
}
