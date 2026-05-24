import Phaser from 'phaser';
import { Fish } from '../objects/Fish';
import { Coin } from '../objects/Coin';
import { ShopPopup } from '../ui/ShopPopup';
import { loadGame, saveGame } from '../SaveManager';

export class AquariumScene extends Phaser.Scene {
  coins = 100;
  fish: Fish[] = [];
  private droppedCoins: Coin[] = [];

  private coinText!: Phaser.GameObjects.Text;
  private coinDisplayGlow!: Phaser.GameObjects.Arc;
  private shopButton!: Phaser.GameObjects.Container;
  private shopPopup!: ShopPopup;
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
    this.shopPopup = new ShopPopup(this);

    for (let i = 0; i < save.fishCount; i++) {
      const x = Phaser.Math.Between(80, this.scale.width - 80);
      const y = Phaser.Math.Between(80, this.scale.height - this.sandHeight - 80);
      const fish = new Fish(this, x, y);
      this.fish.push(fish);
    }

    this.game.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      const rect = this.game.canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width * this.scale.width;
      const py = (e.clientY - rect.top) / rect.height * this.scale.height;
      for (const coin of this.droppedCoins) {
        if (coin.hitTest(px, py)) {
          coin.collect();
          break;
        }
      }
    });

    this.scale.on('resize', () => {
      this.repositionUI();
    });
  }

  addCoin(coin: Coin) {
    this.droppedCoins.push(coin);
  }

  private createBackground() {
    const { width, height } = this.scale;
    const waterHeight = height - this.sandHeight;

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = waterHeight;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, waterHeight);
    gradient.addColorStop(0, '#1a3a5c');
    gradient.addColorStop(1, '#081428');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, waterHeight);
    this.textures.addCanvas('water-gradient', canvas);
    const bg = this.add.image(width / 2, waterHeight / 2, 'water-gradient');
    bg.setDisplaySize(width, waterHeight);
    bg.setDepth(-10);

    const sand = this.add.rectangle(width / 2, height - this.sandHeight / 2, width, this.sandHeight, 0xc2956b);
    sand.setDepth(-5);

    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const h = Phaser.Math.Between(50, 130);
      const w = Phaser.Math.Between(10, 16);
      const green = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(45, 138, 78),
        new Phaser.Display.Color(78, 202, 110),
        100, Phaser.Math.Between(0, 100)
      );
      const color = Phaser.Display.Color.GetColor(green.r, green.g, green.b);

      const plant = this.add.graphics();
      plant.fillStyle(color, 0.8);

      const steps = 20;
      plant.beginPath();
      plant.moveTo(0, 0);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const py = -t * h;
        const bulge = Math.sin(t * Math.PI);
        const px = -(w / 2) * bulge;
        if (s === 0) plant.moveTo(px, py);
        else plant.lineTo(px, py);
      }
      for (let s = steps; s >= 0; s--) {
        const t = s / steps;
        const py = -t * h;
        const bulge = Math.sin(t * Math.PI);
        const px = (w / 2) * bulge;
        plant.lineTo(px, py);
      }
      plant.closePath();
      plant.fillPath();

      plant.setPosition(x, height - this.sandHeight);
      plant.setDepth(-4);

      const container = this.add.container(x, height - this.sandHeight, []);
      container.add(plant);
      plant.setPosition(0, 0);
      container.setDepth(-4);

      this.tweens.add({
        targets: container,
        angle: Phaser.Math.Between(-6, -2),
        duration: Phaser.Math.Between(1800, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1500),
      });
    }
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
    this.droppedCoins = this.droppedCoins.filter(c => !c.collected);
  }
}
