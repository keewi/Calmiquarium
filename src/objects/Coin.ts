import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';

const COLLECT_RADIUS = 28;
const COIN_FALL_SPEED = 370; // px per second

export type CoinType = 'silver' | 'gold' | 'diamond';

const COIN_VALUES: Record<CoinType, number> = {
  silver: 15,
  gold: 35,
  diamond: 200,
};

export class Coin {
  private scene: AquariumScene;
  container: Phaser.GameObjects.Container;
  private glow: Phaser.GameObjects.Arc;
  collected = false;
  private settled = false;
  private sandY: number;
  private coinType: CoinType;

  constructor(scene: AquariumScene, x: number, y: number, type: CoinType = 'gold') {
    this.scene = scene;
    this.coinType = type;
    this.sandY = scene.scale.height - 60 - 10;

    this.glow = scene.add.circle(0, 0, 32, 0xffffff, 0);

    const coinGfx = scene.add.graphics();

    const value = COIN_VALUES[type];
    const label = scene.add.text(0, 1, type === 'diamond' ? '💎' : `${value}`, {
      fontSize: type === 'diamond' ? '14px' : '11px',
      color: type === 'silver' ? '#555555' : type === 'diamond' ? '#ffffff' : '#8B6914',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.container = scene.add.container(x, y, [this.glow, coinGfx, label]);
    this.drawCoin(coinGfx);
    this.container.setDepth(15);
    this.container.setScale(type === 'diamond' ? 1.6 : 1.4);

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

    if (this.coinType === 'diamond') {
      // diamond shape — sparkly blue-white
      g.fillStyle(0x8888cc, 1);
      g.beginPath();
      g.moveTo(0, -r);
      g.lineTo(r * 0.7, -r * 0.25);
      g.lineTo(r * 0.5, r * 0.8);
      g.lineTo(0, r);
      g.lineTo(-r * 0.5, r * 0.8);
      g.lineTo(-r * 0.7, -r * 0.25);
      g.closePath();
      g.fillPath();

      // facets
      g.fillStyle(0xaaccff, 0.8);
      g.beginPath();
      g.moveTo(0, -r);
      g.lineTo(r * 0.3, -r * 0.15);
      g.lineTo(0, r * 0.4);
      g.lineTo(-r * 0.3, -r * 0.15);
      g.closePath();
      g.fillPath();

      // bright top facet
      g.fillStyle(0xddeeff, 0.9);
      g.beginPath();
      g.moveTo(0, -r);
      g.lineTo(r * 0.3, -r * 0.25);
      g.lineTo(-r * 0.3, -r * 0.25);
      g.closePath();
      g.fillPath();

      // specular shine
      g.fillStyle(0xffffff, 0.5);
      g.fillEllipse(-4, -8, 8, 5);
      return;
    }

    // silver or gold coin
    const isSilver = this.coinType === 'silver';
    const rimColor = isSilver ? 0x888888 : 0xb8860b;
    const faceColor = isSilver ? 0xc0c0c0 : 0xffd700;
    const ringColor = isSilver ? 0x999999 : 0xdaa520;

    // shadow/rim offset
    g.fillStyle(rimColor, 1);
    g.fillCircle(0, 1, r);

    // flat face
    g.fillStyle(faceColor, 1);
    g.fillCircle(0, 0, r);

    // inner ring
    g.lineStyle(1.5, ringColor, 0.5);
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

    const value = COIN_VALUES[this.coinType];

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
          this.scene.coins += value;
          this.scene.updateCoinDisplay();
        });
      },
    });
  }
}
