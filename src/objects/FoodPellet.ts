import { AquariumScene } from '../scenes/AquariumScene';

const PELLET_FALL_SPEED = 60; // px per second — slower than coins

export class FoodPellet {
  container: Phaser.GameObjects.Container;
  consumed = false;
  private settled = false;
  private sandY: number;

  constructor(scene: AquariumScene, x: number, y: number) {
    this.sandY = scene.scale.height - 60 - 8;

    const pelletGfx = scene.add.graphics();
    this.drawPellet(pelletGfx);

    this.container = scene.add.container(x, y, [pelletGfx]);
    this.container.setDepth(12);
    this.container.setScale(0);

    // pop in
    scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  update(delta: number) {
    if (this.settled || this.consumed) return;
    this.container.y += PELLET_FALL_SPEED * (delta / 1000);
    if (this.container.y >= this.sandY) {
      this.container.y = this.sandY;
      this.settled = true;
    }
  }

  private drawPellet(g: Phaser.GameObjects.Graphics) {
    // shadow
    g.fillStyle(0x5c3a1a, 1);
    g.fillEllipse(0, 1, 12, 10);

    // main body — warm brown
    g.fillStyle(0x8B5E3C, 1);
    g.fillEllipse(0, 0, 12, 10);

    // lighter top half
    g.fillStyle(0xA0724B, 0.6);
    g.fillEllipse(0, -1.5, 10, 5);

    // specular shine
    g.fillStyle(0xffffff, 0.3);
    g.fillEllipse(-1.5, -2.5, 4, 2.5);

    // subtle texture dots
    g.fillStyle(0x6B4226, 0.4);
    g.fillCircle(2, 1, 1);
    g.fillCircle(-2, 0.5, 0.8);
    g.fillCircle(0.5, 2, 0.7);
  }

  get x() { return this.container.x; }
  get y() { return this.container.y; }
}
