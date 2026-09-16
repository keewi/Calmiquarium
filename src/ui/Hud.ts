import { Container, Graphics, Text } from 'pixi.js';
import type { World } from '../world/World';

/** Gold counter, pinned top-right. */
export class Hud {
  readonly view = new Container();
  private pill = new Graphics();
  private goldText: Text;
  private width = 0;

  constructor(private world: World) {
    this.goldText = new Text({ text: '', style: { fontFamily: 'Arial', fontSize: 22, fontWeight: 'bold', fill: 0xffd54a } });
    this.goldText.anchor.set(1, 0.5);
    this.view.addChild(this.pill, this.goldText);
    this.refresh();
  }

  layout(width: number) {
    this.width = width;
    this.place();
  }

  refresh() {
    this.goldText.text = `${this.world.gold} gold`;
    this.place();
  }

  private place() {
    const pad = 14;
    const w = this.goldText.width + pad * 2 + 22;
    const h = 40;
    const x = this.width - w - 16;
    const y = 16;
    this.pill.clear();
    this.pill.roundRect(x, y, w, h, 20).fill({ color: 0x08132a, alpha: 0.85 });
    this.pill.roundRect(x, y, w, h, 20).stroke({ width: 1.5, color: 0xffd54a, alpha: 0.5 });
    this.pill.circle(x + pad + 8, y + h / 2, 8).fill(0xd4a017);
    this.pill.circle(x + pad + 8, y + h / 2, 6).fill(0xffd54a);
    this.goldText.position.set(x + w - pad, y + h / 2);
  }
}
