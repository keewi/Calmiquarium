import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';

const COLLECT_RADIUS = 28;
const COIN_FALL_SPEED = 120; // px per second

export class Coin {
  private scene: AquariumScene;
  container: Phaser.GameObjects.Container;
  private glow: Phaser.GameObjects.Arc;
  collected = false;
  private settled = false;
  private sandY: number;

  constructor(scene: AquariumScene, x: number, y: number) {
    this.scene = scene;
    this.sandY = scene.scale.height - 60 - 10;

    this.glow = scene.add.circle(0, 0, 32, 0xffffff, 0);

    const coinGfx = scene.add.graphics();

    const label = scene.add.text(0, 1, '10', {
      fontSize: '11px',
      color: '#8B6914',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.container = scene.add.container(x, y, [this.glow, coinGfx, label]);
    this.drawCoin(coinGfx);
    this.container.setDepth(15);

    scene.addCoin(this);
  }

  update(delta: number) {
    if (this.settled || this.collected) return;
    this.container.y += COIN_FALL_SPEED * (delta / 1000);
    if (this.container.y >= this.sandY) {
      this.container.y = this.sandY;
      this.settled = true;
    }
  }

  private drawCoin(g: Phaser.GameObjects.Graphics) {
    const r = 20;

    // shadow/rim offset
    g.fillStyle(0xb8860b, 1);
    g.fillCircle(0, 1, r);

    // flat gold face
    g.fillStyle(0xffd700, 1);
    g.fillCircle(0, 0, r);

    // inner ring
    g.lineStyle(1.5, 0xdaa520, 0.5);
    g.strokeCircle(0, 0, r - 3);

    // specular shine
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(-5, -7, 10, 6);
    g.fillStyle(0xffffff, 0.15);
    g.fillEllipse(-3, -5, 5, 3);
  }

  hitTest(px: number, py: number): boolean {
    if (this.collected) return false;
    const dx = px - this.container.x;
    const dy = py - this.container.y;
    return dx * dx + dy * dy <= COLLECT_RADIUS * COLLECT_RADIUS;
  }

  collect() {
    if (this.collected) return;
    this.collected = true;

    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.container.destroy();
        this.scene.flashCoinDisplay(() => {
          this.scene.coins += 10;
          this.scene.updateCoinDisplay();
        });
      },
    });
  }
}
