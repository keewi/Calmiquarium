import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';
import { Coin } from './Coin';
import { Fish } from './Fish';

// ─── extensible alien config ─────────────────────────────────────────
export type AlienType = {
  id: string;
  maxHp: number;
  moveSpeed: number;       // px/sec
  eatCooldownMs: number;
  dropValue: number;
  dropType: 'diamond';
};

export const ALIEN_TYPES: Record<string, AlienType> = {
  sylvester: {
    id: 'sylvester',
    maxHp: 10,
    moveSpeed: 40,
    eatCooldownMs: 4000,
    dropValue: 200,
    dropType: 'diamond',
  },
};

// ─── constants ───────────────────────────────────────────────────────
const SPAWN_GRACE_MS = 2000;
const HIT_RADIUS = 40;

export class Alien {
  private scene: AquariumScene;
  private type: AlienType;
  private container: Phaser.GameObjects.Container;
  private bodyGfx: Phaser.GameObjects.Graphics;
  private hpBar: Phaser.GameObjects.Graphics;

  hp: number;
  dead = false;
  private dying = false;

  private vx: number;
  private vy: number;

  private eatCooldown = 0;
  private graceRemaining: number;
  private flashTimer = 0;

  private margin = 60;
  private sandHeight = 60;

  constructor(scene: AquariumScene, x: number, y: number, typeId = 'sylvester') {
    this.scene = scene;
    this.type = ALIEN_TYPES[typeId];
    this.hp = this.type.maxHp;
    this.graceRemaining = SPAWN_GRACE_MS;

    // random initial drift direction
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.type.moveSpeed;
    this.vy = Math.sin(angle) * this.type.moveSpeed;

    this.bodyGfx = scene.add.graphics();
    this.hpBar = scene.add.graphics();
    this.drawBody();
    this.drawHpBar();

    this.container = scene.add.container(x, y, [this.bodyGfx, this.hpBar]);
    this.container.setDepth(50);
    this.container.setScale(0);

    // spawn pop-in
    scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });
  }

  // ─── drawing ─────────────────────────────────────────────────────

  private drawBody() {
    const g = this.bodyGfx;
    g.clear();

    const bodyColor = 0x5b8c5a;
    const bellyColor = 0x8fbf8f;
    const darkColor = 0x3d6b3d;
    const scaleColor = 0x4a7a4a;
    const outlineColor = 0x2a4a2a;

    // ─── fish tail (bottom, drawn first) ───
    g.fillStyle(bodyColor, 1);
    // left tail fin
    g.beginPath();
    g.moveTo(-4, 38);
    g.lineTo(-22, 50);
    g.lineTo(-18, 42);
    g.lineTo(-24, 54);
    g.lineTo(-10, 44);
    g.lineTo(-4, 42);
    g.closePath();
    g.fillPath();
    // right tail fin
    g.beginPath();
    g.moveTo(4, 38);
    g.lineTo(22, 50);
    g.lineTo(18, 42);
    g.lineTo(24, 54);
    g.lineTo(10, 44);
    g.lineTo(4, 42);
    g.closePath();
    g.fillPath();
    // tail fin outlines
    g.lineStyle(1.5, outlineColor, 0.8);
    g.beginPath();
    g.moveTo(-4, 38); g.lineTo(-22, 50);
    g.strokePath();
    g.beginPath();
    g.moveTo(-4, 40); g.lineTo(-18, 52);
    g.strokePath();
    g.beginPath();
    g.moveTo(4, 38); g.lineTo(22, 50);
    g.strokePath();
    g.beginPath();
    g.moveTo(4, 40); g.lineTo(18, 52);
    g.strokePath();
    // tail fin line details
    g.lineStyle(1, outlineColor, 0.4);
    g.beginPath();
    g.moveTo(-2, 39); g.lineTo(-15, 48);
    g.strokePath();
    g.beginPath();
    g.moveTo(2, 39); g.lineTo(15, 48);
    g.strokePath();

    // ─── S-curved body (torso + tail section) ───
    g.fillStyle(bodyColor, 1);
    g.fillEllipse(0, 20, 18, 26); // lower body / tail stalk
    g.fillEllipse(2, 0, 28, 30);  // upper torso

    // belly lighter stripe
    g.fillStyle(bellyColor, 0.6);
    g.fillEllipse(4, 4, 14, 22);
    g.fillEllipse(2, 22, 10, 18);

    // ─── scales pattern ───
    g.lineStyle(1, scaleColor, 0.5);
    // torso scales
    for (let row = -10; row <= 12; row += 5) {
      for (let col = -10; col <= 10; col += 6) {
        const offset = (Math.floor((row + 10) / 5) % 2) * 3;
        g.beginPath();
        g.arc(col + offset, row, 3.5, 0.3, Math.PI - 0.3, false);
        g.strokePath();
      }
    }
    // tail scales (narrower)
    for (let row = 14; row <= 36; row += 4) {
      const w = Math.max(2, 7 - (row - 14) * 0.4);
      for (let col = -w; col <= w; col += 5) {
        const offset = (Math.floor((row - 14) / 4) % 2) * 2.5;
        g.beginPath();
        g.arc(col + offset, row, 2.5, 0.3, Math.PI - 0.3, false);
        g.strokePath();
      }
    }

    // ─── tiny T-Rex arms ───
    g.fillStyle(bodyColor, 1);
    // right arm (facing right)
    g.lineStyle(2, outlineColor, 0.8);
    g.beginPath();
    g.moveTo(10, -4);
    g.lineTo(18, -8);
    g.lineTo(20, -4);
    g.strokePath();
    // claws
    g.lineStyle(1.5, outlineColor, 0.9);
    g.beginPath();
    g.moveTo(20, -4); g.lineTo(22, -6);
    g.strokePath();
    g.beginPath();
    g.moveTo(20, -4); g.lineTo(23, -3);
    g.strokePath();

    // left arm (smaller, behind body)
    g.lineStyle(1.5, darkColor, 0.6);
    g.beginPath();
    g.moveTo(-8, -2);
    g.lineTo(-14, -5);
    g.lineTo(-16, -2);
    g.strokePath();
    g.beginPath();
    g.moveTo(-16, -2); g.lineTo(-18, -4);
    g.strokePath();

    // ─── dinosaur head ───
    // neck
    g.fillStyle(bodyColor, 1);
    g.fillEllipse(4, -18, 18, 14);

    // head — elongated dino snout
    g.fillStyle(bodyColor, 1);
    g.beginPath();
    g.moveTo(-4, -30);  // back of head
    g.lineTo(0, -34);   // top of skull
    g.lineTo(10, -33);  // forehead
    g.lineTo(18, -28);  // snout top
    g.lineTo(20, -24);  // nose tip
    g.lineTo(18, -20);  // jaw bottom
    g.lineTo(6, -18);   // chin
    g.lineTo(-4, -22);  // throat
    g.closePath();
    g.fillPath();

    // jaw / mouth line
    g.lineStyle(1.5, outlineColor, 0.9);
    g.beginPath();
    g.moveTo(6, -22);
    g.lineTo(12, -22);
    g.lineTo(18, -24);
    g.lineTo(20, -24);
    g.strokePath();

    // teeth — top jaw
    g.fillStyle(0xffffff, 1);
    const teethTopY = -23;
    for (let i = 0; i < 4; i++) {
      const tx = 8 + i * 3;
      g.beginPath();
      g.moveTo(tx, teethTopY);
      g.lineTo(tx + 1, teethTopY + 3);
      g.lineTo(tx + 2, teethTopY);
      g.closePath();
      g.fillPath();
    }
    // teeth — bottom jaw
    const teethBotY = -22;
    for (let i = 0; i < 3; i++) {
      const tx = 9 + i * 3;
      g.beginPath();
      g.moveTo(tx, teethBotY);
      g.lineTo(tx + 1, teethBotY - 2.5);
      g.lineTo(tx + 2, teethBotY);
      g.closePath();
      g.fillPath();
    }

    // head scales
    g.lineStyle(0.8, scaleColor, 0.4);
    for (let row = -32; row <= -24; row += 3) {
      for (let col = 0; col <= 12; col += 4) {
        g.beginPath();
        g.arc(col, row, 2, 0.3, Math.PI - 0.3, false);
        g.strokePath();
      }
    }

    // eye
    g.fillStyle(0xffffdd, 1);
    g.fillCircle(10, -29, 3.5);
    // red iris
    g.fillStyle(0xcc2200, 1);
    g.fillCircle(11, -29, 2);
    // pupil
    g.fillStyle(0x220000, 1);
    g.fillCircle(11.5, -29, 1.2);
    // eye shine
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(9.5, -30, 1);

    // nostril
    g.fillStyle(darkColor, 0.7);
    g.fillCircle(18, -27, 1);

    // head outline
    g.lineStyle(1.5, outlineColor, 0.7);
    g.beginPath();
    g.moveTo(-4, -22);
    g.lineTo(-4, -30);
    g.lineTo(0, -34);
    g.lineTo(10, -33);
    g.lineTo(18, -28);
    g.lineTo(20, -24);
    g.lineTo(18, -20);
    g.lineTo(6, -18);
    g.strokePath();

    // body outline
    g.lineStyle(1.2, outlineColor, 0.4);
    g.beginPath();
    g.arc(0, 20, 9, Math.PI * 0.5, Math.PI * 1.5, false);
    g.strokePath();
  }

  private drawHpBar() {
    const g = this.hpBar;
    g.clear();

    const barW = 40;
    const barH = 5;
    const x = -barW / 2;
    const y = -42;
    const pct = Math.max(0, this.hp / this.type.maxHp);

    // background
    g.fillStyle(0x333333, 0.6);
    g.fillRect(x, y, barW, barH);

    // fill — green to red
    const color = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xcccc44 : 0xcc4444;
    g.fillStyle(color, 0.9);
    g.fillRect(x, y, barW * pct, barH);

    // border
    g.lineStyle(1, 0x000000, 0.4);
    g.strokeRect(x, y, barW, barH);
  }

  // ─── combat ──────────────────────────────────────────────────────

  hitTest(px: number, py: number): boolean {
    if (this.dead) return false;
    const dx = px - this.container.x;
    const dy = py - this.container.y;
    return dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS;
  }

  takeDamage(fromX: number, fromY: number, damage = 1, nudgeImpulse = 20) {
    if (this.dead) return;
    this.hp -= damage;
    this.drawHpBar();

    // flash white
    this.flashTimer = 100;
    this.bodyGfx.setAlpha(0.5);

    // nudge away from shot
    const dx = this.container.x - fromX;
    const dy = this.container.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.vx += (dx / dist) * nudgeImpulse;
    this.vy += (dy / dist) * nudgeImpulse;

    if (this.hp <= 0) {
      this.die();
    }
  }

  private die() {
    if (this.dying) return;
    this.dying = true;
    this.dead = true;

    this.scene.playAlienDeathSound();

    // explosion particles
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = Phaser.Math.Between(20, 60);
      const size = Phaser.Math.Between(3, 8);
      const colors = [0x44cc44, 0x88ee88, 0xffff44, 0xff8844];
      const c = colors[Math.floor(Math.random() * colors.length)];
      const particle = this.scene.add.circle(
        this.container.x, this.container.y, size, c, 0.9
      );
      particle.setDepth(51);
      this.scene.tweens.add({
        targets: particle,
        x: this.container.x + Math.cos(angle) * dist,
        y: this.container.y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }

    // drop diamond
    new Coin(this.scene, this.container.x, this.container.y, 'diamond');

    // fade out
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.container.destroy();
      },
    });
  }

  // ─── update ──────────────────────────────────────────────────────

  update(delta: number) {
    if (this.dead) return;

    // flash recovery
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.bodyGfx.setAlpha(1);
      }
    }

    // grace period countdown
    if (this.graceRemaining > 0) {
      this.graceRemaining -= delta;
    }

    // eat cooldown
    if (this.eatCooldown > 0) {
      this.eatCooldown -= delta;
    }

    // target nearest fish (no allocation)
    let nearest: Fish | null = null;
    let nearestDist = Infinity;
    for (const f of this.scene.fish) {
      if (f.dead) continue;
      const fdx = f.x - this.container.x;
      const fdy = f.y - this.container.y;
      const d = fdx * fdx + fdy * fdy;
      if (d < nearestDist) {
        nearestDist = d;
        nearest = f;
      }
    }

    if (nearest) {
      // steer toward nearest fish
      const dx = nearest.x - this.container.x;
      const dy = nearest.y - this.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const steer = 0.02;
      this.vx += (dx / dist) * this.type.moveSpeed * steer;
      this.vy += (dy / dist) * this.type.moveSpeed * steer;

      // try to eat
      if (this.graceRemaining <= 0 && this.eatCooldown <= 0 && dist < 40) {
        nearest.kill();
        this.eatCooldown = this.type.eatCooldownMs;
      }
    }

    // clamp speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.type.moveSpeed * 1.5) {
      const scale = (this.type.moveSpeed * 1.5) / speed;
      this.vx *= scale;
      this.vy *= scale;
    }

    // move
    this.container.x += this.vx * (delta / 1000);
    this.container.y += this.vy * (delta / 1000);

    // bounce off walls
    const { width, height } = this.scene.scale;
    const minY = this.margin;
    const maxY = height - this.sandHeight - 20;

    if (this.container.x < this.margin) {
      this.container.x = this.margin;
      this.vx = Math.abs(this.vx);
    } else if (this.container.x > width - this.margin) {
      this.container.x = width - this.margin;
      this.vx = -Math.abs(this.vx);
    }
    if (this.container.y < minY) {
      this.container.y = minY;
      this.vy = Math.abs(this.vy);
    } else if (this.container.y > maxY) {
      this.container.y = maxY;
      this.vy = -Math.abs(this.vy);
    }

    // face direction of travel
    this.container.setScale(this.vx >= 0 ? 1 : -1, 1);
  }
}
