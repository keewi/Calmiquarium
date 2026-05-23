import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';
import { Coin } from './Coin';

export class Fish {
  private scene: AquariumScene;
  private container: Phaser.GameObjects.Container;
  private bodyGfx: Phaser.GameObjects.Graphics;
  private tailGfx: Phaser.GameObjects.Graphics;

  private targetX: number;
  private targetY: number;
  private speed = 0;
  private baseSpeed = 0;
  private wanderTimer = 0;
  private wanderInterval: number;
  private coinTimer = 0;
  private coinInterval = 10000;
  private tailPhase = Math.random() * Math.PI * 2;
  private facingRight = true;

  private margin = 60;
  private sandHeight = 60;

  constructor(scene: AquariumScene, x: number, y: number) {
    this.scene = scene;

    this.tailGfx = scene.add.graphics();
    this.bodyGfx = scene.add.graphics();
    this.drawBody();
    this.drawTail(0);

    this.container = scene.add.container(x, y, [this.tailGfx, this.bodyGfx]);
    this.container.setDepth(10);
    this.container.setScale(0);

    scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.targetX = x;
    this.targetY = y;
    this.wanderInterval = Phaser.Math.Between(2000, 5000);
    this.pickNewTarget();
  }

  private drawBody() {
    const g = this.bodyGfx;
    g.clear();

    // main body — plump rounded shape
    g.fillStyle(0xff8c00, 1);
    g.fillEllipse(0, 0, 40, 26);

    // darker back/top half
    g.fillStyle(0xe07800, 0.5);
    g.fillEllipse(0, -4, 36, 14);

    // lighter belly highlight
    g.fillStyle(0xffcc44, 0.6);
    g.fillEllipse(2, 5, 28, 12);

    // shiny specular highlight on upper body
    g.fillStyle(0xffffff, 0.25);
    g.fillEllipse(4, -6, 16, 7);

    // dorsal fin — rounded arc shape
    g.fillStyle(0xff7800, 0.8);
    g.beginPath();
    g.moveTo(-4, -12);
    g.lineTo(0, -20);
    g.lineTo(6, -18);
    g.lineTo(8, -12);
    g.closePath();
    g.fillPath();
    // fin highlight
    g.fillStyle(0xffa848, 0.5);
    g.beginPath();
    g.moveTo(-1, -13);
    g.lineTo(1, -17);
    g.lineTo(5, -16);
    g.lineTo(5, -13);
    g.closePath();
    g.fillPath();

    // pectoral fin (side fin)
    g.fillStyle(0xff9030, 0.7);
    g.fillEllipse(4, 8, 10, 6);

    // eye — large and expressive
    g.fillStyle(0xffffff, 1);
    g.fillCircle(12, -3, 6.5);
    // iris
    g.fillStyle(0x1a1a2e, 1);
    g.fillCircle(13.5, -3, 4);
    // pupil
    g.fillStyle(0x000000, 1);
    g.fillCircle(14, -3, 2.5);
    // eye sparkle (top)
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(12, -5, 1.8);
    // eye sparkle (bottom, smaller)
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(15, -1.5, 0.9);

    // cute little smile
    g.lineStyle(1.5, 0xcc6600, 0.7);
    g.beginPath();
    g.arc(16, 2, 3, 0.2, Math.PI * 0.7, false);
    g.strokePath();

    // subtle lip/cheek blush
    g.fillStyle(0xff6666, 0.15);
    g.fillCircle(14, 4, 4);
  }

  private drawTail(angle: number) {
    const g = this.tailGfx;
    g.clear();

    const cx = -19;
    const len = 15;
    const spread = 12;

    const tipX = cx - Math.cos(angle) * len;
    const tipTopY = -spread + Math.sin(angle) * 4;
    const tipBotY = spread + Math.sin(angle) * 4;
    const midX = cx - Math.cos(angle) * (len * 0.5);
    const midY = Math.sin(angle) * 2;

    // outer tail
    g.fillStyle(0xffa040, 0.9);
    g.beginPath();
    g.moveTo(cx, -3);
    g.lineTo(midX, tipTopY * 0.5 + midY);
    g.lineTo(tipX, tipTopY);
    g.lineTo(tipX + 2, 0 + Math.sin(angle) * 3);
    g.lineTo(tipX, tipBotY);
    g.lineTo(midX, tipBotY * 0.5 + midY);
    g.lineTo(cx, 3);
    g.closePath();
    g.fillPath();

    // tail highlight
    g.fillStyle(0xffcc66, 0.3);
    g.beginPath();
    g.moveTo(cx, -1);
    g.lineTo(midX, tipTopY * 0.3 + midY);
    g.lineTo(tipX + 1, tipTopY * 0.5);
    g.lineTo(tipX + 2, midY);
    g.lineTo(cx, 1);
    g.closePath();
    g.fillPath();
  }

  private pickNewTarget() {
    const { width, height } = this.scene.scale;

    // fish swim mostly horizontally with gentle vertical drift
    const currentY = this.container.y;
    const yDrift = Phaser.Math.Between(-40, 40);
    const minY = this.margin;
    const maxY = height - this.sandHeight - this.margin;

    this.targetX = Phaser.Math.Between(this.margin, width - this.margin);
    this.targetY = Phaser.Math.Clamp(currentY + yDrift, minY, maxY);

    this.baseSpeed = Phaser.Math.FloatBetween(0.6, 1.4);
    this.wanderInterval = Phaser.Math.Between(3000, 7000);
  }

  update(delta: number) {
    this.wanderTimer += delta;
    if (this.wanderTimer >= this.wanderInterval) {
      this.wanderTimer = 0;
      this.pickNewTarget();
    }

    this.coinTimer += delta;
    if (this.coinTimer >= this.coinInterval) {
      this.coinTimer = 0;
      this.dropCoin();
    }

    const dx = this.targetX - this.container.x;
    const dy = this.targetY - this.container.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      // ease into target speed for smooth acceleration
      this.speed = Phaser.Math.Linear(this.speed, this.baseSpeed, 0.02);

      const moveX = (dx / dist) * this.speed * (delta / 16);
      const moveY = (dy / dist) * this.speed * (delta / 16);
      this.container.x += moveX;
      this.container.y += moveY;

      if (dx > 0) this.facingRight = true;
      else if (dx < 0) this.facingRight = false;
    } else {
      // glide to a stop when near target
      this.speed = Phaser.Math.Linear(this.speed, 0, 0.05);
    }

    this.container.setScale(this.facingRight ? 1 : -1, 1);

    // gentle body tilt toward movement direction
    const tiltAngle = (dy / (dist || 1)) * 8;
    this.container.setAngle(this.facingRight ? tiltAngle : -tiltAngle);

    // subtle vertical bob
    this.container.y += Math.sin(Date.now() / 1200) * 0.1;

    // tail flutter — faster when swimming, slower when idle
    const tailSpeed = this.speed > 0.1 ? 0.012 : 0.004;
    const tailAmplitude = this.speed > 0.1 ? 0.5 : 0.25;
    this.tailPhase += tailSpeed * delta;
    this.drawTail(Math.sin(this.tailPhase) * tailAmplitude);
  }

  private dropCoin() {
    new Coin(this.scene, this.container.x, this.container.y + 12);
  }
}
