import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';

export class Fish {
  private scene: AquariumScene;
  private container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Graphics;

  private targetX: number;
  private targetY: number;
  private speed = 0.8;
  private wanderTimer = 0;
  private wanderInterval: number;

  private margin = 60;
  private sandHeight = 60;

  constructor(scene: AquariumScene, x: number, y: number) {
    this.scene = scene;

    this.body = scene.add.graphics();
    this.drawFish();

    this.container = scene.add.container(x, y, [this.body]);
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

  private drawFish() {
    const g = this.body;
    g.clear();

    g.fillStyle(0xff8c00, 1);
    g.fillEllipse(0, 0, 36, 20);

    g.fillStyle(0xffa040, 1);
    g.fillTriangle(-18, 0, -30, -10, -30, 10);

    g.fillStyle(0xff7800, 0.7);
    g.fillTriangle(0, -8, -4, -14, 4, -14);

    g.fillStyle(0xffffff, 1);
    g.fillCircle(10, -3, 5);
    g.fillStyle(0x000000, 1);
    g.fillCircle(11, -3, 2.5);
  }

  private pickNewTarget() {
    const { width, height } = this.scene.scale;
    this.targetX = Phaser.Math.Between(this.margin, width - this.margin);
    this.targetY = Phaser.Math.Between(this.margin, height - this.sandHeight - this.margin);
    this.speed = Phaser.Math.FloatBetween(0.5, 1.2);
    this.wanderInterval = Phaser.Math.Between(2000, 5000);
  }

  update(delta: number) {
    this.wanderTimer += delta;
    if (this.wanderTimer >= this.wanderInterval) {
      this.wanderTimer = 0;
      this.pickNewTarget();
    }

    const dx = this.targetX - this.container.x;
    const dy = this.targetY - this.container.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      const moveX = (dx / dist) * this.speed * (delta / 16);
      const moveY = (dy / dist) * this.speed * (delta / 16);
      this.container.x += moveX;
      this.container.y += moveY;

      if (dx > 0) {
        this.container.setScale(1, 1);
      } else {
        this.container.setScale(-1, 1);
      }
    }

    this.container.y += Math.sin(Date.now() / 800) * 0.15;
  }
}
