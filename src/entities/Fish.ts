import { Container, Sprite } from 'pixi.js';
import { CONFIG, CoinType, Stage } from '../config';
import { Look, tailFrameFor } from '../art/bake';
import { approach, clamp, pickFloat, pickInt } from '../core/rng';
import { ease } from '../core/tween';
import type { World } from '../world/World';
import type { Pellet } from './Pellet';

const H = CONFIG.hunger;
const F = CONFIG.fish;
const G = CONFIG.growth;

export class Fish {
  readonly view = new Container();
  private body: Sprite;
  private tail: Sprite;

  stage: Stage;
  points: number;
  hunger = H.max;     // seconds remaining
  dead = false;

  private readyToKing: boolean;
  private look: Look = 0;
  private tailFrame = -1;
  private tailPhase = 0;
  private pop = 1;    // scale multiplier for spawn / stage-up bounce

  private facingRight = true;
  private targetX: number;
  private targetY: number;
  private speed = 0;
  private baseSpeed = 0;
  private wanderTimer = 0;
  private wanderInterval = 0;
  private coinTimer = 0;
  private coinInterval = pickInt(CONFIG.coins.dropIntervalMs);

  constructor(private world: World, x: number, y: number, stage: Stage = Stage.Baby, points = 0) {
    this.stage = stage;
    this.points = points;
    this.readyToKing = stage === Stage.Large && points >= G.largeToKingPoints;

    const t = world.textures;
    const tb = t.tail[0][0];
    this.tail = new Sprite(tb.texture);
    this.tail.anchor.set(tb.anchorX, tb.anchorY);
    this.tail.x = -19;

    const bb = t.body[this.kind][0];
    this.body = new Sprite(bb.texture);
    this.body.anchor.set(bb.anchorX, bb.anchorY);

    this.view.addChild(this.tail, this.body);
    this.view.position.set(x, y);

    this.targetX = x;
    this.targetY = y;
    this.pickTarget();

    this.pop = 0;
    world.tweens.add(this, { pop: 1 }, { duration: 400, ease: ease.backOut });
  }

  get x() { return this.view.x; }
  get y() { return this.view.y; }
  private get kind(): 0 | 1 { return this.stage === Stage.King ? 1 : 0; }
  private get isHungry() { return this.hunger <= H.hungry; }
  private get isStarving() { return this.hunger <= H.starving; }
  private get isDesperate() { return this.hunger <= H.desperate; }

  update(dt: number) {
    if (this.dead) return;
    const W = this.world;

    // hunger
    if (W.hungerEnabled) {
      this.hunger -= dt;
      if (this.hunger <= 0) { this.die(); return; }
    } else {
      this.hunger = H.max;
    }

    // coin drops
    const drop = G.dropByStage[this.stage] as CoinType | null;
    if (drop && !(W.hungerEnabled && this.isStarving)) {
      this.coinTimer += dt * 1000;
      if (this.coinTimer >= this.coinInterval) {
        this.coinTimer = 0;
        this.coinInterval = pickInt(CONFIG.coins.dropIntervalMs);
        W.spawnCoin(this.x, this.y + 12, drop);
      }
    }

    // food: eat if close, otherwise chase; wander when there's none
    const pellet = this.nearestPellet();
    if (pellet) {
      const dx = pellet.x - this.x, dy = pellet.y - this.y;
      if (dx * dx + dy * dy < F.eatRadius * F.eatRadius) {
        pellet.consume();
        this.eat();
      } else {
        this.targetX = pellet.x;
        this.targetY = pellet.y;
        this.baseSpeed = !W.hungerEnabled || !this.isHungry ? F.chaseCasual
          : this.isDesperate ? F.chaseDesperate
          : this.isStarving ? F.chaseStarving
          : F.chaseHungry;
      }
    } else {
      this.wanderTimer += dt * 1000;
      if (this.wanderTimer >= this.wanderInterval) {
        this.wanderTimer = 0;
        this.pickTarget();
      }
    }

    // movement
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 5) {
      this.speed = approach(this.speed, this.baseSpeed, 2, dt);
      const step = Math.min(this.speed * dt, dist);
      this.view.x += (dx / dist) * step;
      this.view.y += (dy / dist) * step;
      if (Math.abs(dx) > 5) this.facingRight = dx > 0;
    } else {
      this.speed = approach(this.speed, 0, 2, dt);
    }

    const s = G.stageScale[this.stage] * this.pop;
    this.view.scale.set(this.facingRight ? s : -s, s);
    const tilt = (dy / (dist || 1)) * 0.14;
    this.view.rotation = this.facingRight ? tilt : -tilt;

    // tail flutter: frequency and amplitude scale with swim speed
    const ratio = Math.min(this.speed / 150, 1);
    this.tailPhase += (3 + ratio * 15) * dt;
    const angle = Math.sin(this.tailPhase) * (0.15 + ratio * 0.55);
    const frame = tailFrameFor(angle);
    if (frame !== this.tailFrame) {
      this.tailFrame = frame;
      this.tail.texture = W.textures.tail[this.look][frame].texture;
    }

    this.refreshLook();
  }

  private eat() {
    this.hunger = H.max;
    this.points++;
    switch (this.stage) {
      case Stage.Baby:
        if (this.points >= G.babyToMedPellets) this.stageUp(Stage.Medium);
        break;
      case Stage.Medium:
        if (this.points >= G.medToLargePellets) this.stageUp(Stage.Large);
        break;
      case Stage.Large:
        if (this.readyToKing) this.stageUp(Stage.King);
        else if (this.points >= G.largeToKingPoints) this.readyToKing = true;
        break;
      case Stage.King:
        break;
    }
    this.world.markDirty();
  }

  private stageUp(next: Stage) {
    this.stage = next;
    this.readyToKing = false;
    this.applyBodyTexture();
    this.pop = 1.35;
    this.world.tweens.add(this, { pop: 1 }, { duration: 450, ease: ease.backOut });
    this.world.onFishStageUp(this);
  }

  private refreshLook() {
    const next: Look = !this.world.hungerEnabled ? 0 : this.isDesperate ? 2 : this.isStarving ? 1 : 0;
    if (next === this.look) return;
    this.look = next;
    this.applyBodyTexture();
    this.tailFrame = -1; // force tail texture swap next frame
  }

  private applyBodyTexture() {
    const b = this.world.textures.body[this.kind][this.look];
    this.body.texture = b.texture;
    this.body.anchor.set(b.anchorX, b.anchorY);
  }

  private pickTarget() {
    const W = this.world;
    const m = CONFIG.layout.margin;
    const minY = W.waterTop + m, maxY = W.sandTop - m;

    // near a wall? turn back. otherwise 50/50 keep heading or turn around
    let goRight: boolean;
    if (this.x < m + 60) goRight = true;
    else if (this.x > W.width - m - 60) goRight = false;
    else goRight = Math.random() < 0.5 ? this.facingRight : !this.facingRight;

    const forward = pickInt(F.wanderForward);
    this.targetX = clamp(this.x + (goRight ? forward : -forward), m, W.width - m);
    this.targetY = clamp(this.y + pickInt(F.wanderDrift), minY, maxY);
    this.baseSpeed = pickFloat(F.wanderSpeed);
    this.wanderInterval = pickInt(F.wanderIntervalMs);
  }

  private nearestPellet(): Pellet | null {
    let best: Pellet | null = null;
    let bestD = Infinity;
    for (const p of this.world.pellets) {
      if (p.consumed) continue;
      const dx = p.x - this.x, dy = p.y - this.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  private die() {
    this.dead = true;
    this.body.tint = this.tail.tint = 0x8a8a8a;
    const s = Math.abs(this.view.scale.x);
    this.view.scale.y = -s;   // belly up
    this.view.rotation = 0;
    this.world.tweens.add(this.view, { y: this.world.waterTop + 30, alpha: 0 }, {
      duration: 2500, ease: ease.quadOut, onComplete: () => this.world.removeFish(this),
    });
    this.world.markDirty();
  }

  /** Instant death (e.g. eaten). */
  kill() { if (!this.dead) this.die(); }
}
