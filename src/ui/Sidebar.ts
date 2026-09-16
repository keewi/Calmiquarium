import { Container, FederatedPointerEvent, Graphics, Sprite, Text, Texture } from 'pixi.js';
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
  private shopLabel: Text;
  private santaItem: ShopItem;

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

    this.shopLabel = new Text({
      text: 'SHOP',
      style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: 0x5f88b8, letterSpacing: 2 },
    });

    this.santaItem = new ShopItem(world.textures.santa.texture, 0.42, 'Santa', CONFIG.shop.santa, () => world.buySanta());

    this.view.addChild(this.panel, this.title, this.goldIcon, this.goldText, this.shopLabel, this.santaItem.view);
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

    g.rect(PAD, 112, W - PAD * 2, 1).fill({ color: 0x2f5f9a, alpha: 0.7 });
    this.shopLabel.position.set(PAD, 126);
    this.santaItem.view.position.set(PAD, 150);
  }

  refresh() {
    this.goldText.text = String(this.world.gold);
    const w = this.world;
    this.santaItem.setState(w.santa ? 'visiting' : w.gold >= CONFIG.shop.santa ? 'ready' : 'poor');
  }
}

// ─── shop item card ───────────────────────────────────────────────────

const ITEM_W = W - PAD * 2;
const ITEM_H = 64;

class ShopItem {
  readonly view = new Container();
  private bg = new Graphics();
  private status: Text;
  private hover = false;
  private state: 'ready' | 'poor' | 'visiting' = 'ready';

  constructor(icon: Texture, iconScale: number, name: string, cost: number, onBuy: () => void) {
    const sprite = new Sprite(icon);
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(iconScale);
    sprite.position.set(30, ITEM_H - 12);

    const label = new Text({ text: name, style: { fontFamily: 'Arial', fontSize: 16, fontWeight: 'bold', fill: 0xffffff } });
    label.position.set(60, 14);

    const coin = new Graphics().circle(0, 0, 6).fill(0xd4a017).circle(0, 0, 4.5).fill(0xffd54a);
    coin.position.set(66, 43);
    const price = new Text({ text: String(cost), style: { fontFamily: 'Arial', fontSize: 14, fontWeight: 'bold', fill: 0xffd54a } });
    price.anchor.set(0, 0.5);
    price.position.set(76, 43);

    this.status = new Text({ text: '', style: { fontFamily: 'Arial', fontSize: 11, fill: 0x9bbbe0 } });
    this.status.anchor.set(1, 0.5);
    this.status.position.set(ITEM_W - 10, 43);

    this.view.addChild(this.bg, sprite, label, coin, price, this.status);
    this.view.eventMode = 'static';
    this.view.cursor = 'pointer';
    this.view.on('pointerover', () => { this.hover = true; this.draw(); });
    this.view.on('pointerout', () => { this.hover = false; this.draw(); });
    this.view.on('pointerdown', (e: FederatedPointerEvent) => { e.stopPropagation(); if (this.state === 'ready') onBuy(); });
    this.draw();
  }

  setState(state: 'ready' | 'poor' | 'visiting') {
    this.state = state;
    this.status.text = state === 'visiting' ? 'visiting…' : state === 'poor' ? 'need gold' : '';
    this.view.alpha = state === 'ready' ? 1 : 0.55;
    this.view.cursor = state === 'ready' ? 'pointer' : 'default';
    this.draw();
  }

  private draw() {
    const g = this.bg;
    g.clear();
    g.roundRect(0, 0, ITEM_W, ITEM_H, 10).fill(this.hover && this.state === 'ready' ? 0x1b3660 : 0x112648);
    g.roundRect(0, 0, ITEM_W, ITEM_H, 10).stroke({ width: 1, color: 0x3a6aa8, alpha: 0.8 });
  }
}
