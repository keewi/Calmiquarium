import Phaser from 'phaser';
import { Fish } from '../objects/Fish';
import { Coin } from '../objects/Coin';
import { FoodPellet } from '../objects/FoodPellet';
import { ShopPopup } from '../ui/ShopPopup';
import { SettingsPopup } from '../ui/SettingsPopup';
import { loadGame, saveGame } from '../SaveManager';

export class AquariumScene extends Phaser.Scene {
  coins = 100;
  fish: Fish[] = [];
  private droppedCoins: Coin[] = [];
  pellets: FoodPellet[] = [];
  private shopOpen = false;

  private coinText!: Phaser.GameObjects.Text;
  private coinDisplayGlow!: Phaser.GameObjects.Arc;
  private shopButton!: Phaser.GameObjects.Container;
  private shopPopup!: ShopPopup;
  private settingsPopup!: SettingsPopup;
  private sandHeight = 60;

  constructor() {
    super('AquariumScene');
  }

  create() {
    const save = loadGame();
    this.coins = save.coins;

    this.createBackground();
    this.createBubbles();
    this.createCoinDisplay();
    this.createShopButton();
    this.createSettingsButton();
    this.shopPopup = new ShopPopup(this);
    this.settingsPopup = new SettingsPopup(this);

    for (let i = 0; i < save.fishCount; i++) {
      const x = Phaser.Math.Between(80, this.scale.width - 80);
      const y = Phaser.Math.Between(80, this.scale.height - this.sandHeight - 80);
      const fish = new Fish(this, x, y);
      this.fish.push(fish);
    }

    const toGameCoords = (e: PointerEvent) => {
      const rect = this.game.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width * this.scale.width,
        y: (e.clientY - rect.top) / rect.height * this.scale.height,
      };
    };

    this.game.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      const { x, y } = toGameCoords(e);

      // try collecting a coin first
      for (const coin of this.droppedCoins) {
        if (coin.hitTest(x, y)) {
          coin.collect();
          return;
        }
      }

      // drop food if clicking in open water
      const sandTop = this.scale.height - this.sandHeight;
      const onShopBtn = x < 80 && y < 150;
      const onCoinDisplay = x > this.scale.width - 130 && y < 50;
      const activePellets = this.pellets.filter(p => !p.consumed).length;
      if (!this.shopOpen && !onShopBtn && !onCoinDisplay && y < sandTop && y > 10 && this.coins >= 5 && activePellets < 3) {
        this.dropFood(x, y);
      }
    });

    this.game.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      const { x, y } = toGameCoords(e);
      let overCoin = false;
      for (const coin of this.droppedCoins) {
        if (coin.hitTest(x, y)) {
          overCoin = true;
          break;
        }
      }
      this.game.canvas.style.cursor = overCoin ? 'pointer' : 'default';
    });

    this.scale.on('resize', () => {
      this.repositionUI();
    });
  }

  addCoin(coin: Coin) {
    this.droppedCoins.push(coin);
  }

  setShopOpen(open: boolean) {
    this.shopOpen = open;
  }

  private dropFood(x: number, y: number) {
    this.coins -= 5;
    this.updateCoinDisplay();

    // sparkle burst at click point
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = Phaser.Math.Between(8, 18);
      const spark = this.add.circle(x, y, Phaser.Math.Between(1, 3), 0xffffaa, 0.9);
      spark.setDepth(20);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }

    const pellet = new FoodPellet(this, x, y);
    this.pellets.push(pellet);
  }

  private createBackground() {
    const { width, height } = this.scale;
    const waterHeight = height - this.sandHeight;

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = waterHeight;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, waterHeight);
    gradient.addColorStop(0, '#4a9ece');
    gradient.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, waterHeight);
    this.textures.addCanvas('water-gradient', canvas);
    const bg = this.add.image(width / 2, waterHeight / 2, 'water-gradient');
    bg.setDisplaySize(width, waterHeight);
    bg.setDepth(-10);

    const sand = this.add.rectangle(width / 2, height - this.sandHeight / 2, width, this.sandHeight, 0xc2956b);
    sand.setDepth(-5);

    // seaweed — broad kelp-like leaves with ruffled edges
    interface SeaweedBlade {
      gfx: Phaser.GameObjects.Graphics;
      x: number; baseY: number; h: number; maxW: number;
      color: number; darkColor: number; highlightColor: number;
      phase: number; swaySpeed: number; swayAmount: number;
      ruffleSeeds: number[]; // per-step random offsets for edge ruffles
    }
    const seaweedData: SeaweedBlade[] = [];
    const seaweedSteps = 28;

    for (let i = 0; i < 8; i++) {
      const sx = Phaser.Math.Between(40, width - 40);
      const h = Phaser.Math.Between(80, 160);
      const maxW = Phaser.Math.Between(18, 30); // much wider — leaf-like
      const brightness = Phaser.Math.Between(0, 100);
      const green = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(30, 110, 55),
        new Phaser.Display.Color(55, 170, 80),
        100, brightness
      );
      const dark = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(18, 70, 35),
        new Phaser.Display.Color(35, 120, 50),
        100, brightness
      );
      const hl = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(60, 160, 80),
        new Phaser.Display.Color(90, 210, 120),
        100, brightness
      );
      const color = Phaser.Display.Color.GetColor(green.r, green.g, green.b);
      const darkColor = Phaser.Display.Color.GetColor(dark.r, dark.g, dark.b);
      const highlightColor = Phaser.Display.Color.GetColor(hl.r, hl.g, hl.b);

      // pre-generate random ruffle offsets so edges are bumpy but stable
      const ruffleSeeds: number[] = [];
      for (let s = 0; s <= seaweedSteps; s++) {
        ruffleSeeds.push((Math.random() - 0.5) * 2); // -1 to 1
      }

      const gfx = this.add.graphics();
      gfx.setDepth(-4);

      seaweedData.push({
        gfx, x: sx, baseY: height - this.sandHeight, h, maxW, color, darkColor, highlightColor,
        phase: Math.random() * Math.PI * 2,
        swaySpeed: Phaser.Math.FloatBetween(0.6, 1.2),
        swayAmount: Phaser.Math.FloatBetween(10, 20),
        ruffleSeeds,
      });
    }

    // redraw seaweed each frame
    this.events.on('update', () => {
      const time = this.time.now / 1000;
      for (const sw of seaweedData) {
        sw.gfx.clear();

        const leftPts: { x: number; y: number }[] = [];
        const rightPts: { x: number; y: number }[] = [];
        const centerPts: { x: number; y: number }[] = [];

        // gentle current lean
        const currentDrift = Math.sin(time * sw.swaySpeed + sw.phase) * sw.swayAmount;
        const secondaryDrift = Math.sin(time * sw.swaySpeed * 0.37 + sw.phase + 2.5) * sw.swayAmount * 0.25;

        for (let s = 0; s <= seaweedSteps; s++) {
          const t = s / seaweedSteps; // 0=base, 1=tip
          const py = sw.baseY - t * sw.h;

          // cumulative lean from current
          const lean = (currentDrift + secondaryDrift) * Math.pow(t, 1.5);

          // leaf shape: narrow at base, widest around 35-55%, tapers to rounded tip
          // using a bell-curve-like shape
          const leafShape = Math.sin(t * Math.PI) * Math.pow(1 - t * 0.3, 0.5);
          // narrow stem at very bottom
          const stemFactor = Math.min(t * 5, 1); // ramps from 0 to 1 over first 20%
          const halfW = (sw.maxW / 2) * leafShape * stemFactor;

          // ruffled edges — wavy offset that animates slightly
          const ruffleAmount = halfW * 0.25;
          const ruffleL = sw.ruffleSeeds[s] * ruffleAmount * Math.sin(time * 0.8 + s * 0.5 + sw.phase);
          const ruffleR = sw.ruffleSeeds[seaweedSteps - s] * ruffleAmount * Math.sin(time * 0.7 + s * 0.6 + sw.phase + 1);

          const cx = sw.x + lean;
          centerPts.push({ x: cx, y: py });
          leftPts.push({ x: cx - halfW + ruffleL, y: py });
          rightPts.push({ x: cx + halfW + ruffleR, y: py });
        }

        // darker back layer for depth
        sw.gfx.fillStyle(sw.darkColor, 0.5);
        sw.gfx.beginPath();
        sw.gfx.moveTo(leftPts[0].x + 2, leftPts[0].y);
        for (let s = 1; s < leftPts.length; s++) {
          sw.gfx.lineTo(leftPts[s].x + 2, leftPts[s].y);
        }
        for (let s = rightPts.length - 1; s >= 0; s--) {
          sw.gfx.lineTo(rightPts[s].x + 2, rightPts[s].y);
        }
        sw.gfx.closePath();
        sw.gfx.fillPath();

        // main leaf blade
        sw.gfx.fillStyle(sw.color, 0.9);
        sw.gfx.beginPath();
        sw.gfx.moveTo(leftPts[0].x, leftPts[0].y);
        for (let s = 1; s < leftPts.length; s++) {
          sw.gfx.lineTo(leftPts[s].x, leftPts[s].y);
        }
        for (let s = rightPts.length - 1; s >= 0; s--) {
          sw.gfx.lineTo(rightPts[s].x, rightPts[s].y);
        }
        sw.gfx.closePath();
        sw.gfx.fillPath();

        // lighter highlight on right half (light coming from right)
        sw.gfx.fillStyle(sw.highlightColor, 0.2);
        sw.gfx.beginPath();
        sw.gfx.moveTo(centerPts[0].x, centerPts[0].y);
        for (let s = 1; s < centerPts.length; s++) {
          sw.gfx.lineTo(centerPts[s].x, centerPts[s].y);
        }
        for (let s = rightPts.length - 1; s >= 0; s--) {
          sw.gfx.lineTo(rightPts[s].x, rightPts[s].y);
        }
        sw.gfx.closePath();
        sw.gfx.fillPath();

        // center midrib vein
        sw.gfx.lineStyle(1.5, sw.darkColor, 0.4);
        sw.gfx.beginPath();
        for (let s = 0; s < centerPts.length; s++) {
          if (s === 0) sw.gfx.moveTo(centerPts[s].x, centerPts[s].y);
          else sw.gfx.lineTo(centerPts[s].x, centerPts[s].y);
        }
        sw.gfx.strokePath();

        // side veins branching from midrib
        sw.gfx.lineStyle(0.8, sw.darkColor, 0.2);
        for (let s = 3; s < seaweedSteps - 2; s += 3) {
          const t = s / seaweedSteps;
          if (t < 0.15 || t > 0.9) continue;
          // left vein
          sw.gfx.beginPath();
          sw.gfx.moveTo(centerPts[s].x, centerPts[s].y);
          sw.gfx.lineTo(leftPts[s].x * 0.6 + centerPts[s].x * 0.4, leftPts[s].y - 2);
          sw.gfx.strokePath();
          // right vein
          sw.gfx.beginPath();
          sw.gfx.moveTo(centerPts[s].x, centerPts[s].y);
          sw.gfx.lineTo(rightPts[s].x * 0.6 + centerPts[s].x * 0.4, rightPts[s].y - 2);
          sw.gfx.strokePath();
        }
      }
    });
  }

  private createBubbles() {
    const { width, height } = this.scale;
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(30, width - 30);
        const bubble = this.add.circle(x, height - this.sandHeight, Phaser.Math.Between(2, 6), 0xffffff, 0.15);
        bubble.setDepth(-3);
        this.tweens.add({
          targets: bubble,
          y: -20,
          alpha: 0,
          duration: Phaser.Math.Between(4000, 8000),
          ease: 'Sine.easeIn',
          onComplete: () => bubble.destroy(),
        });
      },
    });
  }

  private createCoinDisplay() {
    this.coinDisplayGlow = this.add.circle(10, 0, 30, 0xffd700, 0);

    const coinIcon = this.add.circle(0, 0, 12, 0xffd700);
    const coinSymbol = this.add.text(0, 0, '$', {
      fontSize: '14px',
      color: '#b8860b',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.coinText = this.add.text(20, 0, `${this.coins}`, {
      fontSize: '22px',
      color: '#ffd700',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5);

    const container = this.add.container(this.scale.width - 100, 30, [this.coinDisplayGlow, coinIcon, coinSymbol, this.coinText]);
    container.setDepth(100);
    container.setName('coinDisplay');
  }

  private createShopButton() {
    const bg = this.add.graphics();
    bg.fillStyle(0x2255aa, 0.85);
    bg.fillRoundedRect(-28, -28, 56, 56, 12);
    bg.lineStyle(2, 0x66aaff, 1);
    bg.strokeRoundedRect(-28, -28, 56, 56, 12);

    const icon = this.add.text(0, -2, '🛒', {
      fontSize: '24px',
    }).setOrigin(0.5);

    const label = this.add.text(0, 38, 'Shop', {
      fontSize: '13px',
      color: '#88ccff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.shopButton = this.add.container(40, 50, [bg, icon, label]);
    this.shopButton.setDepth(100);
    this.shopButton.setSize(56, 56);
    this.shopButton.setInteractive({ useHandCursor: true });

    this.shopButton.on('pointerover', () => {
      this.tweens.add({ targets: this.shopButton, scaleX: 1.1, scaleY: 1.1, duration: 100 });
    });
    this.shopButton.on('pointerout', () => {
      this.tweens.add({ targets: this.shopButton, scaleX: 1, scaleY: 1, duration: 100 });
    });
    this.shopButton.on('pointerdown', () => {
      this.shopPopup.show();
    });
  }

  private createSettingsButton() {
    const bg = this.add.graphics();
    bg.fillStyle(0x334466, 0.85);
    bg.fillRoundedRect(-22, -22, 44, 44, 10);
    bg.lineStyle(2, 0x5588bb, 1);
    bg.strokeRoundedRect(-22, -22, 44, 44, 10);

    const icon = this.add.text(0, -1, '⚙️', {
      fontSize: '20px',
    }).setOrigin(0.5);

    const settingsBtn = this.add.container(40, 120, [bg, icon]);
    settingsBtn.setDepth(100);
    settingsBtn.setSize(44, 44);
    settingsBtn.setInteractive({ useHandCursor: true });

    settingsBtn.on('pointerover', () => {
      this.tweens.add({ targets: settingsBtn, scaleX: 1.1, scaleY: 1.1, duration: 100 });
    });
    settingsBtn.on('pointerout', () => {
      this.tweens.add({ targets: settingsBtn, scaleX: 1, scaleY: 1, duration: 100 });
    });
    settingsBtn.on('pointerdown', () => {
      this.settingsPopup.show();
    });
  }

  private repositionUI() {
    const coinDisplay = this.children.getByName('coinDisplay') as Phaser.GameObjects.Container;
    if (coinDisplay) {
      coinDisplay.setPosition(this.scale.width - 100, 30);
    }
  }

  updateCoinDisplay() {
    this.coinText.setText(`${this.coins}`);
    this.save();
  }

  save() {
    saveGame({ coins: this.coins, fishCount: this.fish.length });
  }

  flashCoinDisplay(onPeak: () => void) {
    this.tweens.add({
      targets: this.coinDisplayGlow,
      alpha: 0.4,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        onPeak();
        this.tweens.add({
          targets: this.coinDisplayGlow,
          alpha: 0,
          duration: 250,
          ease: 'Quad.easeIn',
        });
      },
    });
  }

  removeDead() {
    this.fish = this.fish.filter(f => !f.dead);
    this.save();
  }

  spawnFish() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.createPoofEffect(cx, cy);

    this.time.delayedCall(200, () => {
      const fish = new Fish(this, cx, cy);
      this.fish.push(fish);
      this.save();
    });
  }

  private createPoofEffect(x: number, y: number) {
    const particles = 12;
    for (let i = 0; i < particles; i++) {
      const angle = (i / particles) * Math.PI * 2;
      const dist = Phaser.Math.Between(20, 50);
      const size = Phaser.Math.Between(4, 10);
      const circle = this.add.circle(x, y, size, 0xffffff, 0.8);
      circle.setDepth(50);

      this.tweens.add({
        targets: circle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => circle.destroy(),
      });
    }

    const flash = this.add.circle(x, y, 30, 0xffffff, 0.6);
    flash.setDepth(49);
    this.tweens.add({
      targets: flash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  update(_time: number, delta: number) {
    for (const fish of this.fish) {
      fish.update(delta);
    }
    for (const coin of this.droppedCoins) {
      coin.update(delta);
    }
    this.droppedCoins = this.droppedCoins.filter(c => !c.collected);

    for (const pellet of this.pellets) {
      pellet.update(delta);
    }
    this.pellets = this.pellets.filter(p => !p.consumed);
  }
}
