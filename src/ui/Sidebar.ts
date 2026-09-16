import { Container, Graphics, Text } from 'pixi.js';
import { CONFIG } from '../config';
import type { World } from '../world/World';

const W = CONFIG.layout.sidebarWidth;
const PAD = 18;

/**
 * Full-height panel down the left edge of the tank.
 * Holds the gold counter now; shop and settings will slot in below it.
 */
export class Sidebar {
  readonly view = new Container();
  private panel = new Graphics();
  private title: Text;
  private goldIcon = new Graphics();
  private goldText: Text;

  constructor(private world: World) {
    this.view.eventMode = 'static';   // swallow taps so they don't reach the water
    this.view.on('pointerdown', (e) => e.stopPropagation());

    this.title = new Text({
      text: 'CALMIQUARIUM',
      style: { fontFamily: 'Arial', fontSize: 13, fontWeight: 'bold', fill: 0x7fa8d8, letterSpacing: 3 },
    });
    this.title.position.set(PAD, PAD + 2);

    this.goldIcon.circle(0, 0, 11).fill(0xd4a017);
    this.goldIcon.circle(0, 0, 8.5).fill(0xffd54a);
    this.goldIcon.circle(-3, -3.5, 3).fill({ color: 0xffffff, alpha: 0.5 });

    this.goldText = new Text({ text: '', style: { fontFamily: 'Arial', fontSize: 24, fontWeight: 'bold', fill: 0xffd54a } });
    this.goldText.anchor.set(0, 0.5);

    this.view.addChild(this.panel, this.title, this.goldIcon, this.goldText);
    this.refresh();
  }

  layout(height: number) {
    const g = this.panel;
    g.clear();
    g.rect(0, 0, W, height).fill(0x08132a);
    g.rect(W - 3, 0, 3, height).fill({ color: 0x2f5f9a, alpha: 0.9 });     // frame edge
    g.rect(W - 4, 0, 1, height).fill({ color: 0x8fc0ff, alpha: 0.35 });    // glass highlight
    g.rect(PAD, 48, W - PAD * 2, 1).fill({ color: 0x2f5f9a, alpha: 0.7 }); // divider under title

    const goldY = 78;
    this.goldIcon.position.set(PAD + 11, goldY);
    this.goldText.position.set(PAD + 32, goldY);
  }

  refresh() {
    this.goldText.text = String(this.world.gold);
  }
}
