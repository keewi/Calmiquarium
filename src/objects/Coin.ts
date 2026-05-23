import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';

export class Coin {
  private scene: AquariumScene;
  private container: Phaser.GameObjects.Container;
  private glow: Phaser.GameObjects.Arc;
  private settled = false;
  private collected = false;
  private sandY: number;

  constructor(scene: AquariumScene, x: number, y: number) {
    this.scene = scene;
    this.sandY = scene.scale.height - 60 - 10;

    this.glow = scene.add.circle(0, 0, 32, 0xffffff, 0);

    const body = scene.add.circle(0, 0, 20, 0xffd700);
    const symbol = scene.add.text(0, 0, '10', {
      fontSize: '16px',
      color: '#b8860b',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const hitZone = scene.add.rectangle(0, 0, 48, 48, 0xffffff, 0);

    this.container = scene.add.container(x, y, [hitZone, this.glow, body, symbol]);
    this.container.setDepth(15);
    this.container.setSize(48, 48);
    this.container.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-24, -24, 48, 48), hitAreaCallback: Phaser.Geom.Rectangle.Contains });

    this.container.on('pointerdown', () => this.collect());

    scene.tweens.add({
      targets: this.container,
      y: this.sandY,
      duration: Phaser.Math.Between(1500, 2500),
      ease: 'Quad.easeIn',
      onComplete: () => { this.settled = true; },
    });
  }

  private collect() {
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

  get isDestroyed() {
    return this.collected;
  }
}
