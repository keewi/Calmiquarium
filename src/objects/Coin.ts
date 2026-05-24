import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';

const COLLECT_RADIUS = 28;

export class Coin {
  private scene: AquariumScene;
  container: Phaser.GameObjects.Container;
  private glow: Phaser.GameObjects.Arc;
  collected = false;

  constructor(scene: AquariumScene, x: number, y: number) {
    this.scene = scene;
    const sandY = scene.scale.height - 60 - 10;

    this.glow = scene.add.circle(0, 0, 32, 0xffffff, 0);

    const body = scene.add.circle(0, 0, 20, 0xffd700);
    const symbol = scene.add.text(0, 0, '10', {
      fontSize: '16px',
      color: '#b8860b',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.container = scene.add.container(x, y, [this.glow, body, symbol]);
    this.container.setDepth(15);

    scene.tweens.add({
      targets: this.container,
      y: sandY,
      duration: Phaser.Math.Between(1500, 2500),
      ease: 'Quad.easeIn',
    });

    scene.addCoin(this);
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
      targets: this.glow,
      alpha: 0.8,
      scaleX: 2,
      scaleY: 2,
      duration: 150,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    this.scene.tweens.add({
      targets: this.container,
      scaleX: 0,
      scaleY: 0,
      duration: 400,
      delay: 150,
      ease: 'Quad.easeIn',
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
