import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';

const GOLDFISH_COST = 50;
const EGG_COSTS = [500, 750, 1000]; // cost for each egg stage
const BAR_HEIGHT = 100;
const SLOT_RADIUS = 24;
const SLOT_Y = 38; // center y of slots within bar
const PRICE_Y = 76; // y for price tags
const NUM_SLOTS = 7; // total item slots
const SLOT_START_X = 75;
const SLOT_SPACING = 68;

export class ShopPopup {
  private scene: AquariumScene;
  private container: Phaser.GameObjects.Container;
  private priceText!: Phaser.GameObjects.Text;
  private slotBg!: Phaser.GameObjects.Graphics;
  private coinText!: Phaser.GameObjects.Text;

  // egg slot elements
  private eggSlotBg!: Phaser.GameObjects.Graphics;
  private eggIcon!: Phaser.GameObjects.Graphics;
  private eggPriceBg!: Phaser.GameObjects.Graphics;
  private eggPriceText!: Phaser.GameObjects.Text;
  private eggHitZone!: Phaser.GameObjects.Arc;
  private eggSlotX = 0;

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
      } else if (i === 1) {
        // egg slot
        this.eggSlotX = sx;
        this.eggSlotBg = slotGfx;

        // egg icon
        this.eggIcon = scene.add.graphics();
        children.push(slotGfx, this.eggIcon);

        // egg price tag
        this.eggPriceBg = scene.add.graphics();
        this.eggPriceText = scene.add.text(sx, PRICE_Y, '', {
          fontSize: '11px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
        }).setOrigin(0.5);
        children.push(this.eggPriceBg, this.eggPriceText);

        // egg hit zone
        this.eggHitZone = scene.add.circle(sx, SLOT_Y, SLOT_RADIUS + 4);
        this.eggHitZone.setInteractive({ useHandCursor: true });
        this.eggHitZone.on('pointerover', () => {
          if (scene.eggStage < 3) this.drawSlot(this.eggSlotBg, sx, SLOT_Y, true, true);
        });
        this.eggHitZone.on('pointerout', () => {
          if (scene.eggStage < 3) this.drawSlot(this.eggSlotBg, sx, SLOT_Y, false, true);
        });
        this.eggHitZone.on('pointerdown', () => this.handleBuyEgg());
        children.push(this.eggHitZone);

        // initial render
        this.updateEggSlot();
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

  updateEggSlot() {
    const sx = this.eggSlotX;
    const stage = this.scene.eggStage;

    if (stage >= 3) {
      // completed — show disabled/gold slot with checkmark
      this.drawSlot(this.eggSlotBg, sx, SLOT_Y, false, false);
      this.eggIcon.clear();
      this.drawEggIcon(this.eggIcon, sx, SLOT_Y, 1.0);
      // gold checkmark overlay
      this.eggIcon.fillStyle(0x44cc44, 0.9);
      this.eggIcon.fillCircle(sx + 10, SLOT_Y + 10, 7);
      this.eggIcon.lineStyle(2, 0xffffff, 1);
      this.eggIcon.beginPath();
      this.eggIcon.moveTo(sx + 6, SLOT_Y + 10);
      this.eggIcon.lineTo(sx + 9, SLOT_Y + 13);
      this.eggIcon.lineTo(sx + 14, SLOT_Y + 7);
      this.eggIcon.strokePath();
      // price tag shows "DONE"
      this.eggPriceBg.clear();
      this.eggPriceBg.fillStyle(0x338833, 0.9);
      this.eggPriceBg.fillRoundedRect(sx - 26, PRICE_Y - 8, 52, 16, 5);
      this.eggPriceText.setText('DONE');
      this.eggPriceText.setColor('#ffffff');
      this.eggHitZone.disableInteractive();
    } else {
      // active egg slot
      this.drawSlot(this.eggSlotBg, sx, SLOT_Y, false, true);
      this.eggIcon.clear();
      // show egg based on how many pieces bought: stage 0=30%, 1=60%, 2=100%
      const visibility = [0.30, 0.60, 1.0][stage];
      this.drawEggIcon(this.eggIcon, sx, SLOT_Y, visibility);
      // price tag
      const cost = EGG_COSTS[stage];
      this.eggPriceBg.clear();
      this.eggPriceBg.fillStyle(0x5533aa, 0.9);
      this.eggPriceBg.fillRoundedRect(sx - 26, PRICE_Y - 8, 52, 16, 5);
      this.eggPriceText.setText(`$${cost}`);
      const canAfford = this.scene.coins >= cost;
      this.eggPriceText.setColor(canAfford ? '#ffffff' : '#ff4444');
    }
  }

  private drawEggIcon(g: Phaser.GameObjects.Graphics, x: number, y: number, visibility: number) {
    // egg shape: full egg is an ellipse roughly 18w x 24h, pointed at top
    // visibility clips from the bottom: 0.3 = bottom 30%, 0.6 = bottom 60%, 1.0 = full
    const eggW = 16;
    const eggH = 22;
    const eggCenterY = y; // center of the egg

    // use clipping via drawing partial shapes
    // draw from bottom up to the visibility line
    const fullTop = eggCenterY - eggH / 2;
    const fullBottom = eggCenterY + eggH / 2;
    const visibleTop = fullBottom - (fullBottom - fullTop) * visibility;

    // main egg body (cream/white)
    g.fillStyle(0xfff8e8, 0.95);
    // draw the egg as segments, only below visibleTop
    const steps = 32;
    g.beginPath();
    let started = false;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 2;
      // egg shape: wider at bottom, narrower at top
      const rx = eggW / 2;
      const ry = eggH / 2;
      const px = x + rx * Math.sin(angle);
      // make it egg-shaped: compress the top
      const yFactor = 1 - 0.2 * Math.max(0, -Math.cos(angle));
      const py = eggCenterY - ry * Math.cos(angle) * yFactor;

      if (py >= visibleTop) {
        if (!started) {
          g.moveTo(px, Math.max(py, visibleTop));
          started = true;
        } else {
          g.lineTo(px, py);
        }
      }
    }
    g.closePath();
    g.fillPath();

    // flat cut line at the top of visible portion (if partial)
    if (visibility < 1.0) {
      g.lineStyle(1.5, 0xddccaa, 0.8);
      // find the width at the cut line
      const cutY = visibleTop;
      const relY = (cutY - eggCenterY) / (eggH / 2);
      const cutWidth = eggW / 2 * Math.sqrt(Math.max(0, 1 - relY * relY));
      g.beginPath();
      g.moveTo(x - cutWidth, cutY);
      // jagged edge for cracked look
      const jagSteps = 8;
      for (let j = 0; j <= jagSteps; j++) {
        const jt = j / jagSteps;
        const jx = x - cutWidth + jt * cutWidth * 2;
        const jy = cutY + (j % 2 === 0 ? -1.5 : 1.5);
        g.lineTo(jx, jy);
      }
      g.strokePath();
    }

    // specular highlight
    if (visibility > 0.5) {
      g.fillStyle(0xffffff, 0.3);
      const hlY = Math.max(eggCenterY - 4, visibleTop + 3);
      g.fillEllipse(x - 3, hlY, 6, 8 * visibility);
    }

    // subtle shadow on right
    g.fillStyle(0xddcc99, 0.3);
    const shY = Math.max(eggCenterY + 2, visibleTop + 2);
    g.fillEllipse(x + 4, shY, 5, 8 * visibility);

    // spots/speckles on the egg
    if (visibility >= 0.3) {
      g.fillStyle(0xddccaa, 0.4);
      const spotY1 = eggCenterY + 5;
      if (spotY1 >= visibleTop) g.fillCircle(x - 3, spotY1, 1.5);
      const spotY2 = eggCenterY + 2;
      if (spotY2 >= visibleTop) g.fillCircle(x + 4, spotY2, 1);
    }
    if (visibility >= 0.6) {
      g.fillStyle(0xddccaa, 0.3);
      const spotY3 = eggCenterY - 2;
      if (spotY3 >= visibleTop) g.fillCircle(x - 2, spotY3, 1.2);
    }
  }

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
    this.updateEggSlot();
  }

  updateCoinText() {
    this.coinText.setText(`${this.scene.coins}`);
  }

  show() {}
  hide() {}

  private handleBuy() {
    if (this.scene.coins < GOLDFISH_COST) {
      this.shakeText(this.priceText);
      return;
    }

    this.scene.coins -= GOLDFISH_COST;
    this.scene.updateCoinDisplay();
    this.scene.spawnFish();
  }

  private handleBuyEgg() {
    const stage = this.scene.eggStage;
    if (stage >= 3) return;

    const cost = EGG_COSTS[stage];
    if (this.scene.coins < cost) {
      this.shakeText(this.eggPriceText);
      return;
    }

    this.scene.coins -= cost;
    this.scene.eggStage++;
    this.scene.updateCoinDisplay();
    this.updateEggSlot();

    if (this.scene.eggStage >= 3) {
      // player wins!
      this.scene.showWinPopup();
    }
  }

  private shakeText(text: Phaser.GameObjects.Text) {
    const origX = text.x;
    this.scene.tweens.add({
      targets: text,
      x: origX + 4,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => text.setX(origX),
    });
  }

  static get BAR_HEIGHT() { return BAR_HEIGHT; }
}
