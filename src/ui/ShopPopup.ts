import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';

const GOLDFISH_COST = 50;

export class ShopPopup {
  private scene: AquariumScene;
  private container: Phaser.GameObjects.Container;
  private overlay: Phaser.GameObjects.Rectangle;
  private visible = false;

  constructor(scene: AquariumScene) {
    this.scene = scene;

    this.overlay = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5);
    this.overlay.setOrigin(0, 0);
    this.overlay.setInteractive();
    this.overlay.on('pointerdown', () => this.hide());

    const panel = scene.add.graphics();
    panel.fillStyle(0x1a2a4a, 0.95);
    panel.fillRoundedRect(-160, -130, 320, 260, 16);
    panel.lineStyle(2, 0x4488cc, 1);
    panel.strokeRoundedRect(-160, -130, 320, 260, 16);

    const title = scene.add.text(0, -105, 'Shop', {
      fontSize: '28px',
      color: '#88ccff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const divider = scene.add.graphics();
    divider.lineStyle(1, 0x4488cc, 0.5);
    divider.lineBetween(-140, -80, 140, -80);

    const fishPreview = scene.add.graphics();
    const fy = -40; // center y for fish preview

    // tail
    fishPreview.fillStyle(0xffa040, 0.9);
    fishPreview.beginPath();
    fishPreview.moveTo(-19, fy - 3);
    fishPreview.lineTo(-27, fy - 12);
    fishPreview.lineTo(-25, fy);
    fishPreview.lineTo(-27, fy + 12);
    fishPreview.lineTo(-19, fy + 3);
    fishPreview.closePath();
    fishPreview.fillPath();

    // main body
    fishPreview.fillStyle(0xff8c00, 1);
    fishPreview.fillEllipse(0, fy, 40, 26);

    // darker back
    fishPreview.fillStyle(0xe07800, 0.5);
    fishPreview.fillEllipse(0, fy - 4, 36, 14);

    // belly highlight
    fishPreview.fillStyle(0xffcc44, 0.6);
    fishPreview.fillEllipse(2, fy + 5, 28, 12);

    // specular highlight
    fishPreview.fillStyle(0xffffff, 0.25);
    fishPreview.fillEllipse(4, fy - 6, 16, 7);

    // dorsal fin
    fishPreview.fillStyle(0xff7800, 0.8);
    fishPreview.beginPath();
    fishPreview.moveTo(-4, fy - 12);
    fishPreview.lineTo(0, fy - 20);
    fishPreview.lineTo(6, fy - 18);
    fishPreview.lineTo(8, fy - 12);
    fishPreview.closePath();
    fishPreview.fillPath();

    // pectoral fin
    fishPreview.fillStyle(0xff9030, 0.7);
    fishPreview.fillEllipse(4, fy + 8, 10, 6);

    // eye
    fishPreview.fillStyle(0xffffff, 1);
    fishPreview.fillCircle(12, fy - 3, 6.5);
    fishPreview.fillStyle(0x1a1a2e, 1);
    fishPreview.fillCircle(13.5, fy - 3, 4);
    fishPreview.fillStyle(0x000000, 1);
    fishPreview.fillCircle(14, fy - 3, 2.5);
    fishPreview.fillStyle(0xffffff, 0.9);
    fishPreview.fillCircle(12, fy - 5, 1.8);

    // smile
    fishPreview.lineStyle(1.5, 0xcc6600, 0.7);
    fishPreview.beginPath();
    fishPreview.arc(16, fy + 2, 3, 0.2, Math.PI * 0.7, false);
    fishPreview.strokePath();

    // cheek blush
    fishPreview.fillStyle(0xff6666, 0.15);
    fishPreview.fillCircle(14, fy + 4, 4);

    const fishName = scene.add.text(0, -10, 'Goldfish', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const coinIcon = scene.add.circle(-20, 20, 10, 0xffd700);
    const coinSymbol = scene.add.text(-20, 20, '$', {
      fontSize: '12px',
      color: '#b8860b',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const priceText = scene.add.text(0, 20, `${GOLDFISH_COST}`, {
      fontSize: '18px',
      color: '#ffd700',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    const buyBg = scene.add.graphics();
    buyBg.fillStyle(0x22aa44, 0.9);
    buyBg.fillRoundedRect(-140, 55, 135, 50, 10);
    const buyText = scene.add.text(-72, 80, 'Buy', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const buyZone = scene.add.rectangle(-72, 80, 135, 50);
    buyZone.setInteractive({ useHandCursor: true });
    buyZone.on('pointerover', () => {
      buyBg.clear();
      buyBg.fillStyle(0x33cc55, 0.9);
      buyBg.fillRoundedRect(-140, 55, 135, 50, 10);
    });
    buyZone.on('pointerout', () => {
      buyBg.clear();
      buyBg.fillStyle(0x22aa44, 0.9);
      buyBg.fillRoundedRect(-140, 55, 135, 50, 10);
    });
    buyZone.on('pointerdown', () => this.handleBuy());

    const cancelBg = scene.add.graphics();
    cancelBg.fillStyle(0x664444, 0.9);
    cancelBg.fillRoundedRect(5, 55, 135, 50, 10);
    const cancelText = scene.add.text(72, 80, 'Cancel', {
      fontSize: '20px',
      color: '#cccccc',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const cancelZone = scene.add.rectangle(72, 80, 135, 50);
    cancelZone.setInteractive({ useHandCursor: true });
    cancelZone.on('pointerover', () => {
      cancelBg.clear();
      cancelBg.fillStyle(0x885555, 0.9);
      cancelBg.fillRoundedRect(5, 55, 135, 50, 10);
    });
    cancelZone.on('pointerout', () => {
      cancelBg.clear();
      cancelBg.fillStyle(0x664444, 0.9);
      cancelBg.fillRoundedRect(5, 55, 135, 50, 10);
    });
    cancelZone.on('pointerdown', () => this.hide());

    this.container = scene.add.container(
      scene.scale.width / 2,
      scene.scale.height / 2,
      [panel, title, divider, fishPreview, fishName, coinIcon, coinSymbol, priceText, buyBg, buyText, buyZone, cancelBg, cancelText, cancelZone]
    );

    this.overlay.setDepth(200);
    this.container.setDepth(201);

    this.overlay.setVisible(false);
    this.container.setVisible(false);

    scene.scale.on('resize', () => {
      this.overlay.setSize(scene.scale.width, scene.scale.height);
      this.container.setPosition(scene.scale.width / 2, scene.scale.height / 2);
    });
  }

  show() {
    if (this.visible) return;
    this.visible = true;
    this.scene.setShopOpen(true);
    this.overlay.setVisible(true);
    this.container.setVisible(true);
    this.container.setScale(0.8);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.scene.setShopOpen(false);
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 0.8,
      scaleY: 0.8,
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.overlay.setVisible(false);
        this.container.setVisible(false);
      },
    });
  }

  private handleBuy() {
    if (this.scene.coins < GOLDFISH_COST) {
      const flash = this.scene.add.text(
        this.scene.scale.width / 2, this.scene.scale.height / 2 + 140,
        'Not enough coins!',
        { fontSize: '18px', color: '#ff4444', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }
      ).setOrigin(0.5).setDepth(300);

      this.scene.tweens.add({
        targets: flash,
        y: flash.y - 30,
        alpha: 0,
        duration: 1200,
        onComplete: () => flash.destroy(),
      });
      return;
    }

    this.scene.coins -= GOLDFISH_COST;
    this.scene.updateCoinDisplay();
    this.hide();
    this.scene.spawnFish();
  }
}
