import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';

const GOLDFISH_COST = 50;
const BAR_HEIGHT = 72;
const CIRCLE_RADIUS = 24;

export class ShopPopup {
  private scene: AquariumScene;
  private container: Phaser.GameObjects.Container;
  private priceText!: Phaser.GameObjects.Text;
  private circleBg!: Phaser.GameObjects.Graphics;

  constructor(scene: AquariumScene) {
    this.scene = scene;

    const { width } = scene.scale;

    // semi-transparent bar background
    const barBg = scene.add.graphics();
    this.drawBarBg(barBg, width);

    // --- goldfish circle button ---
    this.circleBg = scene.add.graphics();
    this.drawCircleBg(this.circleBg, false);

    // small fish icon centered in circle
    const fishIcon = scene.add.graphics();
    this.drawMinifish(fishIcon, 0, -4);

    // price label below the circle
    this.priceText = scene.add.text(0, CIRCLE_RADIUS + 8, `$${GOLDFISH_COST}`, {
      fontSize: '12px', color: '#ffd700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const itemContainer = scene.add.container(
      60, BAR_HEIGHT / 2 - 4,
      [this.circleBg, fishIcon, this.priceText],
    );

    // circular interactive zone
    const hitZone = scene.add.circle(0, -4, CIRCLE_RADIUS + 4);
    itemContainer.add(hitZone);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on('pointerover', () => this.drawCircleBg(this.circleBg, true));
    hitZone.on('pointerout', () => this.drawCircleBg(this.circleBg, false));
    hitZone.on('pointerdown', () => this.handleBuy());

    this.container = scene.add.container(0, 0, [barBg, itemContainer]);
    this.container.setDepth(100);

    scene.scale.on('resize', () => {
      barBg.clear();
      this.drawBarBg(barBg, scene.scale.width);
    });
  }

  private drawBarBg(g: Phaser.GameObjects.Graphics, width: number) {
    g.fillStyle(0x0a1628, 0.7);
    g.fillRect(0, 0, width, BAR_HEIGHT);
    g.lineStyle(1, 0x4488cc, 0.3);
    g.lineBetween(0, BAR_HEIGHT, width, BAR_HEIGHT);
  }

  private drawCircleBg(g: Phaser.GameObjects.Graphics, hover: boolean) {
    g.clear();
    // circle background
    g.fillStyle(hover ? 0x335588 : 0x1e3050, 0.9);
    g.fillCircle(0, -4, CIRCLE_RADIUS);
    g.lineStyle(2, hover ? 0x88bbee : 0x4477aa, 0.7);
    g.strokeCircle(0, -4, CIRCLE_RADIUS);
  }

  private drawMinifish(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    // tail
    g.fillStyle(0xffa040, 0.9);
    g.beginPath();
    g.moveTo(x - 10, y - 2);
    g.lineTo(x - 15, y - 6);
    g.lineTo(x - 14, y);
    g.lineTo(x - 15, y + 6);
    g.lineTo(x - 10, y + 2);
    g.closePath();
    g.fillPath();

    // body
    g.fillStyle(0xff8c00, 1);
    g.fillEllipse(x, y, 22, 15);

    // darker back
    g.fillStyle(0xe07800, 0.4);
    g.fillEllipse(x, y - 2, 18, 8);

    // belly
    g.fillStyle(0xffcc44, 0.5);
    g.fillEllipse(x + 1, y + 3, 15, 7);

    // specular
    g.fillStyle(0xffffff, 0.2);
    g.fillEllipse(x + 2, y - 3, 8, 4);

    // eye
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x + 6, y - 2, 3.5);
    g.fillStyle(0x1a1a2e, 1);
    g.fillCircle(x + 7, y - 2, 2.2);
    g.fillStyle(0x000000, 1);
    g.fillCircle(x + 7.3, y - 2, 1.4);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x + 5.8, y - 3.2, 1);
  }

  updatePriceColor() {
    const canAfford = this.scene.coins >= GOLDFISH_COST;
    this.priceText.setColor(canAfford ? '#ffd700' : '#ff4444');
  }

  // kept for compatibility — no-op since bar is always visible
  show() {}
  hide() {}

  private handleBuy() {
    if (this.scene.coins < GOLDFISH_COST) {
      // shake the price text
      const origX = this.priceText.x;
      this.scene.tweens.add({
        targets: this.priceText,
        x: origX + 4,
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => this.priceText.setX(origX),
      });
      return;
    }

    this.scene.coins -= GOLDFISH_COST;
    this.scene.updateCoinDisplay();
    this.scene.spawnFish();
  }

  static get BAR_HEIGHT() { return BAR_HEIGHT; }
}
