import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';

const GOLDFISH_COST = 50;
const BAR_HEIGHT = 100;
const SLOT_RADIUS = 24;
const SLOT_Y = 38; // center y of slots within bar
const PRICE_Y = 76; // y for price tags
const NUM_SLOTS = 7; // total item slots (only first is active for now)
const SLOT_START_X = 75;
const SLOT_SPACING = 68;

export class ShopPopup {
  private scene: AquariumScene;
  private container: Phaser.GameObjects.Container;
  private priceText!: Phaser.GameObjects.Text;
  private slotBg!: Phaser.GameObjects.Graphics;

  constructor(scene: AquariumScene) {
    this.scene = scene;
    const { width } = scene.scale;

    // --- wooden bar background ---
    const barBg = scene.add.graphics();
    this.drawBarBg(barBg, width);

    const children: Phaser.GameObjects.GameObject[] = [barBg];

    // --- item slots ---
    for (let i = 0; i < NUM_SLOTS; i++) {
      const sx = SLOT_START_X + i * SLOT_SPACING;
      const slotGfx = scene.add.graphics();

      if (i === 0) {
        // active goldfish slot
        this.slotBg = slotGfx;
        this.drawSlot(slotGfx, sx, SLOT_Y, false, true);

        // fish icon
        const fishIcon = scene.add.graphics();
        this.drawMinifish(fishIcon, sx, SLOT_Y);
        children.push(slotGfx, fishIcon);

        // purple price tag
        const priceBg = scene.add.graphics();
        priceBg.fillStyle(0x5533aa, 0.9);
        priceBg.fillRoundedRect(sx - 26, PRICE_Y - 8, 52, 16, 5);
        this.priceText = scene.add.text(sx, PRICE_Y, `$${GOLDFISH_COST}`, {
          fontSize: '11px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
        }).setOrigin(0.5);
        children.push(priceBg, this.priceText);

        // hit zone
        const hitZone = scene.add.circle(sx, SLOT_Y, SLOT_RADIUS + 4);
        hitZone.setInteractive({ useHandCursor: true });
        hitZone.on('pointerover', () => {
          this.drawSlot(this.slotBg, sx, SLOT_Y, true, true);
        });
        hitZone.on('pointerout', () => {
          this.drawSlot(this.slotBg, sx, SLOT_Y, false, true);
        });
        hitZone.on('pointerdown', () => this.handleBuy());
        children.push(hitZone);
      } else {
        // empty/locked slot
        this.drawSlot(slotGfx, sx, SLOT_Y, false, false);
        children.push(slotGfx);

        // empty purple tag
        const emptyTag = scene.add.graphics();
        emptyTag.fillStyle(0x442288, 0.5);
        emptyTag.fillRoundedRect(sx - 26, PRICE_Y - 8, 52, 16, 5);
        children.push(emptyTag);
      }
    }

    // --- MENU button on the right ---
    const menuX = width - 55;
    const menuBg = scene.add.graphics();
    this.drawMenuButton(menuBg, menuX, SLOT_Y, false);
    children.push(menuBg);

    const menuText = scene.add.text(menuX, SLOT_Y, 'MENU', {
      fontSize: '14px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    children.push(menuText);

    const menuZone = scene.add.rectangle(menuX, SLOT_Y, 64, 36);
    menuZone.setInteractive({ useHandCursor: true });
    menuZone.on('pointerover', () => this.drawMenuButton(menuBg, menuX, SLOT_Y, true));
    menuZone.on('pointerout', () => this.drawMenuButton(menuBg, menuX, SLOT_Y, false));
    menuZone.on('pointerdown', () => scene.settingsPopup.show());
    children.push(menuZone);

    // --- coin display on the right (next to menu) ---
    const coinX = width - 140;
    const coinBg = scene.add.graphics();
    coinBg.fillStyle(0x2a6030, 0.9);
    coinBg.fillRoundedRect(coinX - 48, SLOT_Y - 16, 86, 32, 10);
    coinBg.lineStyle(2, 0x88cc44, 0.6);
    coinBg.strokeRoundedRect(coinX - 48, SLOT_Y - 16, 86, 32, 10);
    children.push(coinBg);

    const coinIcon = scene.add.text(coinX - 40, SLOT_Y, '$', {
      fontSize: '18px', color: '#ffd700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    children.push(coinIcon);

    this.coinText = scene.add.text(coinX - 22, SLOT_Y, `${scene.coins}`, {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    children.push(this.coinText);

    this.container = scene.add.container(0, 0, children);
    this.container.setDepth(100);

    scene.scale.on('resize', () => {
      // redraw bar bg on resize
      barBg.clear();
      this.drawBarBg(barBg, scene.scale.width);
    });
  }

  private coinText!: Phaser.GameObjects.Text;

  private drawBarBg(g: Phaser.GameObjects.Graphics, width: number) {
    // main wooden plank
    g.fillStyle(0x8B6914, 1);
    g.fillRect(0, 0, width, BAR_HEIGHT);

    // wood grain stripes
    g.fillStyle(0x7A5C10, 0.3);
    g.fillRect(0, 8, width, 3);
    g.fillRect(0, 20, width, 2);
    g.fillRect(0, 38, width, 2);
    g.fillRect(0, 52, width, 3);
    g.fillRect(0, 68, width, 2);

    // lighter wood highlight at top
    g.fillStyle(0xB8860B, 0.5);
    g.fillRect(0, 0, width, 4);

    // darker bottom edge
    g.fillStyle(0x5C4A0A, 0.7);
    g.fillRect(0, BAR_HEIGHT - 4, width, 4);

    // golden border lines
    g.lineStyle(2, 0xDAA520, 0.8);
    g.lineBetween(0, 1, width, 1);
    g.lineBetween(0, BAR_HEIGHT - 1, width, BAR_HEIGHT - 1);
  }

  private drawSlot(g: Phaser.GameObjects.Graphics, x: number, y: number, hover: boolean, active: boolean) {
    g.clear();

    if (active) {
      // outer brass ring
      g.fillStyle(hover ? 0xDAA520 : 0xB8860B, 1);
      g.fillCircle(x, y, SLOT_RADIUS + 4);

      // inner brass ring
      g.fillStyle(hover ? 0xFFD700 : 0xDAA520, 0.8);
      g.fillCircle(x, y, SLOT_RADIUS + 2);

      // slot interior — darker blue/purple
      g.fillStyle(hover ? 0x3344aa : 0x2a2a6a, 1);
      g.fillCircle(x, y, SLOT_RADIUS);

      // inner highlight
      g.fillStyle(0x4455bb, 0.3);
      g.fillCircle(x, y - 3, SLOT_RADIUS - 4);

      // ring stroke
      g.lineStyle(1.5, 0xFFD700, 0.6);
      g.strokeCircle(x, y, SLOT_RADIUS + 3);
    } else {
      // locked slot — muted brass frame
      g.fillStyle(0x9A7B0A, 0.6);
      g.fillCircle(x, y, SLOT_RADIUS + 3);

      g.fillStyle(0xB8960B, 0.4);
      g.fillCircle(x, y, SLOT_RADIUS + 1);

      // empty interior — tan/beige
      g.fillStyle(0xC2A860, 0.5);
      g.fillCircle(x, y, SLOT_RADIUS);

      // inner shadow
      g.fillStyle(0x8A7A40, 0.3);
      g.fillCircle(x, y + 2, SLOT_RADIUS - 3);

      g.lineStyle(1, 0xAA9520, 0.3);
      g.strokeCircle(x, y, SLOT_RADIUS + 2);
    }
  }

  private drawMenuButton(g: Phaser.GameObjects.Graphics, x: number, y: number, hover: boolean) {
    g.clear();
    g.fillStyle(hover ? 0x3399cc : 0x2288bb, 0.95);
    g.fillRoundedRect(x - 32, y - 16, 64, 32, 8);
    g.lineStyle(2, hover ? 0x66ccff : 0x44aadd, 0.8);
    g.strokeRoundedRect(x - 32, y - 16, 64, 32, 8);
    // inner highlight
    g.fillStyle(0xffffff, 0.1);
    g.fillRoundedRect(x - 30, y - 15, 60, 14, { tl: 6, tr: 6, bl: 0, br: 0 });
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
    g.fillStyle(0xffffff, 0.25);
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
    this.priceText.setColor(canAfford ? '#ffffff' : '#ff4444');
  }

  updateCoinText() {
    this.coinText.setText(`${this.scene.coins}`);
  }

  show() {}
  hide() {}

  private handleBuy() {
    if (this.scene.coins < GOLDFISH_COST) {
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
