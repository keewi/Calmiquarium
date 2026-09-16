import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { CONFIG } from '../config';
import { audio } from '../core/audio';
import { approach, pickInt } from '../core/rng';
import { ease } from '../core/tween';
import type { World } from '../world/World';

const S = CONFIG.santa;

type State = 'sprout' | 'emerge' | 'roam' | 'laugh' | 'return' | 'dive' | 'sink' | 'done';

/**
 * One Santa visit: chimney sprouts from the sand, Santa climbs out, roams the
 * tank laughing now and then, then dives back in and the chimney sinks away.
 */
export class SantaVisit {
  readonly view = new Container();
  done = false;

  private chimney: Sprite;
  private santa = new Container();
  private sprite: Sprite;
  private bubble: Container;
  private mask = new Graphics();

  private state: State = 'sprout';
  private readonly chimneyX: number;
  private readonly chimneyTop: number;

  private t = 0;              // seconds in current state
  private bobT = 0;
  private roamed = 0;         // total ms spent roaming/laughing
  private facingRight = true;
  private targetX = 0;
  private targetY = 0;
  private speed = 0;
  private nextLaughMs = pickInt(S.laughEveryMs);

  constructor(private world: World, x: number) {
    const T = world.textures;
    this.chimneyX = x;
    const base = world.sandTop + 10;
    this.chimneyTop = base - 66;

    this.chimney = new Sprite(T.chimney.texture);
    this.chimney.anchor.set(T.chimney.anchorX, T.chimney.anchorY);
    this.chimney.position.set(x, base);
    this.chimney.scale.set(1, 0);

    this.sprite = new Sprite(T.santa.texture);
    this.sprite.anchor.set(T.santa.anchorX, T.santa.anchorY);
    this.santa.addChild(this.sprite);
    this.santa.position.set(x, this.chimneyTop + 90);   // hidden inside the chimney

    this.bubble = this.makeBubble();
    this.bubble.visible = false;
    this.santa.addChild(this.bubble);

    // only the part of Santa above the chimney rim is visible while he's in it
    this.mask.rect(x - 120, 0, 240, this.chimneyTop).fill(0xffffff);
    this.santa.mask = this.mask;

    this.view.addChild(this.santa, this.chimney, this.mask);

    // 1. chimney sprouts
    world.tweens.add(this.chimney.scale, { y: 1 }, {
      duration: 550, ease: ease.backOut, onComplete: () => this.emerge(),
    });
  }

  private emerge() {
    this.state = 'emerge';
    this.world.tweens.add(this.santa, { y: this.chimneyTop - 4 }, {
      duration: 800, ease: ease.quadOut, onComplete: () => {
        this.setMasked(false);
        // little hop off the rim
        this.world.tweens.add(this.santa, { y: this.chimneyTop - 60 }, {
          duration: 380, ease: ease.quadOut, onComplete: () => { this.state = 'roam'; this.t = 0; this.pickTarget(); },
        });
      },
    });
  }

  update(dt: number) {
    if (this.done) return;
    this.t += dt;
    this.bobT += dt;

    switch (this.state) {
      case 'roam': {
        this.roamed += dt * 1000;
        this.nextLaughMs -= dt * 1000;
        if (this.roamed >= S.visitMs) { this.state = 'return'; this.t = 0; break; }
        if (this.nextLaughMs <= 0) { this.startLaugh(); break; }
        if (this.moveToward(this.targetX, this.targetY, dt) || this.t > 4) { this.t = 0; this.pickTarget(); }
        this.sprite.y = Math.sin(this.bobT * 3) * 3;
        break;
      }
      case 'laugh': {
        this.roamed += dt * 1000;
        // belly bounce
        const k = Math.abs(Math.sin(this.t * 11));
        this.sprite.scale.set(1 + k * 0.08, 1 - k * 0.1);
        this.sprite.y = -k * 6;
        if (this.t >= S.laughMs / 1000) {
          this.sprite.scale.set(1);
          this.bubble.visible = false;
          this.nextLaughMs = pickInt(S.laughEveryMs);
          this.state = 'roam';
          this.t = 0;
        }
        break;
      }
      case 'return': {
        this.sprite.y = Math.sin(this.bobT * 3) * 3;
        if (this.moveToward(this.chimneyX, this.chimneyTop - 60, dt)) this.dive();
        break;
      }
      default:
        break;
    }
  }

  /** Steer toward a point at Santa's speed. Returns true once there. */
  private moveToward(tx: number, ty: number, dt: number): boolean {
    const dx = tx - this.santa.x, dy = ty - this.santa.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) { this.speed = approach(this.speed, 0, 4, dt); return true; }
    this.speed = approach(this.speed, S.speed, 2.5, dt);
    const step = Math.min(this.speed * dt, dist);
    this.santa.x += (dx / dist) * step;
    this.santa.y += (dy / dist) * step;
    if (Math.abs(dx) > 6) this.facingRight = dx > 0;
    this.santa.scale.x = this.facingRight ? 1 : -1;
    this.bubble.scale.x = this.facingRight ? 1 : -1;   // keep text readable
    return false;
  }

  private pickTarget() {
    const W = this.world;
    const m = CONFIG.layout.margin + 20;
    this.targetX = W.waterLeft + m + Math.random() * (W.waterWidth - m * 2);
    this.targetY = W.waterTop + 100 + Math.random() * (W.sandTop - W.waterTop - 190);
  }

  private startLaugh() {
    this.state = 'laugh';
    this.t = 0;
    this.speed = 0;
    this.bubble.visible = true;
    audio.laugh();
  }

  private dive() {
    this.state = 'dive';
    this.sprite.y = 0;
    this.santa.x = this.chimneyX;
    this.setMasked(true);
    // hop up, then drop in
    this.world.tweens.add(this.santa, { y: this.chimneyTop - 85 }, {
      duration: 220, ease: ease.quadOut, onComplete: () => {
        this.world.tweens.add(this.santa, { y: this.chimneyTop + 90 }, {
          duration: 420, ease: ease.quadIn, onComplete: () => this.sink(),
        });
      },
    });
  }

  private sink() {
    this.state = 'sink';
    this.world.tweens.add(this.chimney.scale, { y: 0 }, {
      duration: 500, ease: ease.quadIn, onComplete: () => {
        this.state = 'done';
        this.done = true;
        this.view.destroy({ children: true });
      },
    });
  }

  /** A detached mask Graphics would render as a plain shape, so pull it from the tree too. */
  private setMasked(on: boolean) {
    if (on) {
      this.view.addChild(this.mask);
      this.santa.mask = this.mask;
    } else {
      this.santa.mask = null;
      this.view.removeChild(this.mask);
    }
  }

  private makeBubble(): Container {
    const c = new Container();
    const text = new Text({ text: 'Ho ho ho!', style: { fontFamily: 'Arial', fontSize: 15, fontWeight: 'bold', fill: 0x8b1a1a } });
    text.anchor.set(0.5);
    const w = text.width + 20, h = 30;
    const bg = new Graphics()
      .roundRect(-w / 2, -h / 2, w, h, 10).fill(0xffffff)
      .poly([-6, h / 2 - 1, 4, h / 2 - 1, -2, h / 2 + 8]).fill(0xffffff);
    c.addChild(bg, text);
    c.position.set(18, -100);
    return c;
  }
}
