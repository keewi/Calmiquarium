import { Container, FederatedPointerEvent, Graphics, Text } from 'pixi.js';
import { CONFIG } from '../config';
import type { World } from '../world/World';

interface Button {
  view: Container;
  setLabel(text: string): void;
  setEnabled(on: boolean): void;
}

function makeButton(label: string, width: number, onClick: () => void): Button {
  const view = new Container();
  const bg = new Graphics();
  const draw = (hover: boolean) => {
    bg.clear();
    bg.roundRect(0, 0, width, 40, 10).fill(hover ? 0x3a6aa8 : 0x2a4f80);
    bg.roundRect(0, 0, width, 40, 10).stroke({ width: 1.5, color: 0x6aa0e0, alpha: 0.7 });
  };
  draw(false);
  const text = new Text({ text: label, style: { fontFamily: 'Arial', fontSize: 15, fontWeight: 'bold', fill: 0xffffff } });
  text.anchor.set(0.5);
  text.position.set(width / 2, 20);
  view.addChild(bg, text);
  view.eventMode = 'static';
  view.cursor = 'pointer';
  view.on('pointerover', () => draw(true));
  view.on('pointerout', () => draw(false));
  view.on('pointerdown', (e: FederatedPointerEvent) => { e.stopPropagation(); onClick(); });
  return {
    view,
    setLabel: (t) => { text.text = t; },
    setEnabled: (on) => { view.alpha = on ? 1 : 0.45; view.eventMode = on ? 'static' : 'none'; },
  };
}

/** Top bar: coin balance + shop buttons. */
export class Hud {
  readonly view = new Container();
  private bar = new Graphics();
  private coinText: Text;
  private fishBtn: Button;
  private eggBtn: Button;
  private restartBtn: Button;
  private hint: Text;

  constructor(private world: World) {
    this.view.addChild(this.bar);

    this.coinText = new Text({ text: '', style: { fontFamily: 'Arial', fontSize: 22, fontWeight: 'bold', fill: 0xffd54a } });
    this.coinText.anchor.set(0, 0.5);
    this.coinText.position.set(20, CONFIG.layout.topBarHeight / 2);
    this.view.addChild(this.coinText);

    this.fishBtn = makeButton('', 150, () => world.buyFish());
    this.eggBtn = makeButton('', 170, () => world.buyEggPiece());
    this.restartBtn = makeButton('Restart', 90, () => world.restart());
    this.view.addChild(this.fishBtn.view, this.eggBtn.view, this.restartBtn.view);

    this.hint = new Text({ text: `tap water to feed ($${CONFIG.food.cost})`, style: { fontFamily: 'Arial', fontSize: 12, fill: 0x9bbbe0 } });
    this.hint.anchor.set(0, 0.5);
    this.view.addChild(this.hint);

    this.refresh();
  }

  layout(width: number) {
    const h = CONFIG.layout.topBarHeight;
    this.bar.clear();
    this.bar.rect(0, 0, width, h).fill({ color: 0x08132a, alpha: 0.92 });
    this.bar.rect(0, h - 2, width, 2).fill({ color: 0x4a7ab8, alpha: 0.6 });

    const y = (h - 40) / 2;
    this.restartBtn.view.position.set(width - 90 - 16, y);
    this.eggBtn.view.position.set(width - 90 - 16 - 170 - 10, y);
    this.fishBtn.view.position.set(width - 90 - 16 - 170 - 10 - 150 - 10, y);
    this.hint.position.set(20, h - 14);
  }

  refresh() {
    const w = this.world;
    this.coinText.text = `$${w.coins}`;
    this.fishBtn.setLabel(`Guppy  $${CONFIG.shop.goldfish}`);
    this.fishBtn.setEnabled(w.coins >= CONFIG.shop.goldfish);

    const eggCosts = CONFIG.shop.eggPieces;
    if (w.eggStage >= eggCosts.length) {
      this.eggBtn.setLabel('Egg complete');
      this.eggBtn.setEnabled(false);
    } else {
      const cost = eggCosts[w.eggStage];
      this.eggBtn.setLabel(`Egg ${w.eggStage + 1}/${eggCosts.length}  $${cost}`);
      this.eggBtn.setEnabled(w.coins >= cost);
    }
  }
}
