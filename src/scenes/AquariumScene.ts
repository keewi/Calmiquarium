import Phaser from 'phaser';
import { Fish } from '../objects/Fish';
import { ShopPopup } from '../ui/ShopPopup';

export class AquariumScene extends Phaser.Scene {
  coins = 100;
  fish: Fish[] = [];

  private coinText!: Phaser.GameObjects.Text;
  private shopButton!: Phaser.GameObjects.Container;
  private shopPopup!: ShopPopup;
  private sandHeight = 60;

  constructor() {
    super('AquariumScene');
  }

  create() {
    this.createBackground();
    this.createBubbles();
    this.createCoinDisplay();
    this.createShopButton();
    this.shopPopup = new ShopPopup(this);

    this.scale.on('resize', () => {
      this.repositionUI();
    });
  }

  private createBackground() {
    const { width, height } = this.scale;
    const waterHeight = height - this.sandHeight;

    const stripes = 10;
    const stripeH = Math.ceil(waterHeight / stripes);
    for (let i = 0; i < stripes; i++) {
      const t = i / (stripes - 1);
      const color = (Math.round(Phaser.Math.Linear(0x08, 0x1a, t)) << 16)
        | (Math.round(Phaser.Math.Linear(0x14, 0x3a, t)) << 8)
        | Math.round(Phaser.Math.Linear(0x28, 0x5c, t));
      const stripe = this.add.rectangle(width / 2, i * stripeH + stripeH / 2, width, stripeH + 1, color);
      stripe.setDepth(-10);
    }

    const sand = this.add.rectangle(width / 2, height - this.sandHeight / 2, width, this.sandHeight, 0xc2956b);
    sand.setDepth(-5);

    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const plantHeight = Phaser.Math.Between(40, 120);
      const plant = this.add.rectangle(
        x, height - this.sandHeight - plantHeight / 2,
        8, plantHeight, 0x3da85e, 0.7
      );
      plant.setDepth(-4);
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

    const container = this.add.container(this.scale.width - 100, 30, [coinIcon, coinSymbol, this.coinText]);
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
  }

  spawnFish() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.createPoofEffect(cx, cy);

    this.time.delayedCall(200, () => {
      const fish = new Fish(this, cx, cy);
      this.fish.push(fish);
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
  }
}
