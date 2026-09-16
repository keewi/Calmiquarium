import { Container, MeshRope, Point, Sprite } from 'pixi.js';
import { CONFIG } from '../config';
import { audio } from '../core/audio';
import { ease } from '../core/tween';
import type { World } from '../world/World';

const P = CONFIG.pegasus;
const FLAP = [0, 1, 2, 1];   // up, mid, down, mid

/** One graceful crossing of the tank, trailing a rainbow, with a neigh at the midpoint. */
export class Pegasus {
  readonly view = new Container();
  done = false;

  private sprite: Sprite;
  private trail: MeshRope;
  private points: Point[];
  private dir: 1 | -1;
  private x: number;
  private baseY: number;
  private t = 0;
  private neighed = false;
  private exiting = false;
  private lastSampleX = 0;
  private lastSampleY = 0;

  constructor(private world: World) {
    const T = world.textures;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.x = this.dir === 1 ? world.waterLeft - 80 : world.width + 80;
    this.baseY = world.waterTop + 120 + Math.random() * (world.sandTop - world.waterTop - 300);

    this.points = Array.from({ length: P.trailPoints }, () => new Point(this.x, this.baseY));
    this.lastSampleX = this.x;
    this.lastSampleY = this.baseY;
    this.trail = new MeshRope({ texture: T.rainbow, points: this.points });
    this.trail.alpha = 0.9;

    const b = T.pegasus[0];
    this.sprite = new Sprite(b.texture);
    this.sprite.anchor.set(b.anchorX, b.anchorY);
    this.sprite.scale.x = this.dir;

    this.view.addChild(this.trail, this.sprite);
  }

  update(dt: number) {
    if (this.done) return;
    this.t += dt;

    if (!this.exiting) {
      this.x += P.speed * this.dir * dt;
      const phase = this.t * P.waveHz * Math.PI * 2;
      const y = this.baseY + Math.sin(phase) * P.waveAmp;
      const slope = Math.cos(phase) * P.waveAmp * P.waveHz * Math.PI * 2 / P.speed;   // dy/dx
      this.sprite.position.set(this.x, y);
      this.sprite.rotation = Math.atan(slope) * 0.6 * this.dir;

      // wing flap
      const frame = FLAP[Math.floor(this.t * 9) % FLAP.length];
      this.sprite.texture = this.world.textures.pegasus[frame].texture;

      this.pushTrail(this.x - this.dir * 24, y + 2);

      // neigh around the middle of the crossing
      const mid = this.world.waterLeft + this.world.waterWidth / 2;
      if (!this.neighed && (this.dir === 1 ? this.x >= mid : this.x <= mid)) {
        this.neighed = true;
        audio.neigh();
      }

      const offRight = this.dir === 1 && this.x > this.world.width + 90;
      const offLeft = this.dir === -1 && this.x < this.world.waterLeft - 90;
      if (offRight || offLeft) {
        this.exiting = true;
        this.sprite.visible = false;
        this.world.tweens.add(this.trail, { alpha: 0 }, {
          duration: 900, ease: ease.quadIn, onComplete: () => { this.done = true; this.view.destroy({ children: true }); },
        });
      }
    } else {
      // let the rainbow keep drifting off after the pegasus is gone
      this.x += P.speed * this.dir * dt;
      this.pushTrail(this.x - this.dir * 24, this.points[this.points.length - 1].y);
    }
  }

  /** Head of the ribbon always sits at (x, y); history advances one point per `trailSpacing` px travelled. */
  private pushTrail(x: number, y: number) {
    const n = this.points.length;
    if (Math.hypot(x - this.lastSampleX, y - this.lastSampleY) >= P.trailSpacing) {
      for (let i = 0; i < n - 1; i++) this.points[i].copyFrom(this.points[i + 1]);
      this.lastSampleX = x;
      this.lastSampleY = y;
    }
    this.points[n - 1].set(x, y);
  }
}
