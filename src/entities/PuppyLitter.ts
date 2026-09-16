import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { CONFIG } from '../config';
import { audio } from '../core/audio';
import { pickFloat, pickInt } from '../core/rng';
import { ease } from '../core/tween';
import type { World } from '../world/World';

const P = CONFIG.puppies;
const BARKS = ['Yip!', 'Arf!', 'Woof!', 'Yap!'];

class Puppy {
  readonly view = new Container();
  private sprite: Sprite;
  private bubble: Text;
  private coat: number;
  private vx: number;
  private vy = 0;
  private airborne = false;
  private groundPause = 0;     // ms left before the next hop
  private nextBark = pickInt(P.barkEveryMs);
  private pitch = pickFloat([0.85, 1.2]);
  private hopSpeed = pickFloat(P.hopSpeed);
  private started = false;
  done = false;

  constructor(private world: World, private dir: 1 | -1, x: number, private delayMs: number) {
    this.coat = Math.floor(Math.random() * world.textures.puppy.length);
    this.vx = pickFloat(P.speed) * dir;

    const b = world.textures.puppy[this.coat][0];
    this.sprite = new Sprite(b.texture);
    this.sprite.anchor.set(b.anchorX, b.anchorY);
    this.sprite.scale.x = dir;

    this.bubble = new Text({ text: 'Yip!', style: { fontFamily: 'Arial', fontSize: 13, fontWeight: 'bold', fill: 0xffffff } });
    this.bubble.anchor.set(0.5, 1);
    this.bubble.position.set(0, -44);
    this.bubble.visible = false;

    this.view.addChild(this.sprite, this.bubble);
    this.view.position.set(x, world.sandTop + 4);
    this.view.visible = false;
  }

  update(dt: number) {
    if (this.done) return;
    if (!this.started) {
      this.delayMs -= dt * 1000;
      if (this.delayMs > 0) return;
      this.started = true;
      this.view.visible = true;
    }

    const ground = this.world.sandTop + 4;
    this.view.x += this.vx * dt;

    if (this.airborne) {
      this.vy += P.gravity * dt;
      this.view.y += this.vy * dt;
      // stretch on the way up, neutral at the apex
      const k = Math.min(Math.abs(this.vy) / this.hopSpeed, 1);
      this.sprite.scale.set(this.dir * (1 - k * 0.1), 1 + k * 0.15);
      if (this.view.y >= ground) {
        this.view.y = ground;
        this.airborne = false;
        this.groundPause = pickInt(P.groundPauseMs);
        this.setFrame(0);
        this.sprite.scale.set(this.dir * 1.18, 0.78);   // landing squash
        this.world.tweens.add(this.sprite.scale, { x: this.dir, y: 1 }, { duration: 140, ease: ease.quadOut });
        this.puff();
      }
    } else {
      this.groundPause -= dt * 1000;
      if (this.groundPause <= 0) {
        this.airborne = true;
        this.vy = -this.hopSpeed;
        this.setFrame(1);
      }
    }

    this.nextBark -= dt * 1000;
    if (this.nextBark <= 0) {
      this.nextBark = pickInt(P.barkEveryMs);
      this.bark();
    }

    const off = this.dir === 1 ? this.view.x > this.world.width + 40 : this.view.x < this.world.waterLeft - 40;
    if (off) {
      this.done = true;
      this.world.tweens.cancel(this.bubble, this.sprite.scale);
      this.view.destroy({ children: true });
    }
  }

  private setFrame(f: 0 | 1) {
    this.sprite.texture = this.world.textures.puppy[this.coat][f].texture;
  }

  private bark() {
    audio.yip(this.pitch);
    this.bubble.text = BARKS[Math.floor(Math.random() * BARKS.length)];
    this.bubble.visible = true;
    this.bubble.alpha = 1;
    this.bubble.y = -44;
    this.world.tweens.add(this.bubble, { y: -62, alpha: 0 }, {
      duration: 600, ease: ease.quadOut, onComplete: () => { this.bubble.visible = false; },
    });
  }

  /** Little sand puff at the paws on landing. */
  private puff() {
    for (let i = 0; i < 3; i++) {
      const dot = new Graphics().circle(0, 0, 2 + Math.random() * 2).fill({ color: 0xe6d3a0, alpha: 0.7 });
      dot.position.set(this.view.x - this.dir * (4 + Math.random() * 10), this.view.y - 2);
      this.world.addFx(dot);
      this.world.tweens.add(dot, { x: dot.x - this.dir * (10 + Math.random() * 14), y: dot.y - 6 - Math.random() * 8, alpha: 0 }, {
        duration: 380, ease: ease.quadOut, onComplete: () => dot.destroy(),
      });
    }
  }
}

/** Five puppies bounding across the sand, entering one after another. */
export class PuppyLitter {
  readonly view = new Container();
  done = false;
  private puppies: Puppy[] = [];

  constructor(world: World) {
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const startX = dir === 1 ? world.waterLeft - 30 : world.width + 30;
    for (let i = 0; i < P.count; i++) {
      const pup = new Puppy(world, dir, startX - dir * i * 6, i * P.staggerMs);
      this.puppies.push(pup);
      this.view.addChild(pup.view);
    }
  }

  update(dt: number) {
    if (this.done) return;
    let alive = 0;
    for (const p of this.puppies) { p.update(dt); if (!p.done) alive++; }
    if (alive === 0) { this.done = true; this.view.destroy({ children: true }); }
  }
}
