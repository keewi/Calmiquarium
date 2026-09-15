import { Application, Container, FederatedPointerEvent, Graphics, Text } from 'pixi.js';
import { CONFIG, CoinType, Stage } from '../config';
import { bakeTextures, Textures } from '../art/bake';
import { clearSave, loadSave, writeSave } from '../core/save';
import { ease, Tweens } from '../core/tween';
import { Coin } from '../entities/Coin';
import { Fish } from '../entities/Fish';
import { Pellet } from '../entities/Pellet';
import { Background } from '../ui/Background';
import { Hud } from '../ui/Hud';

/** Remove items matching `dead` without allocating a new array. */
function compact<T>(arr: T[], dead: (t: T) => boolean) {
  let w = 0;
  for (let r = 0; r < arr.length; r++) if (!dead(arr[r])) arr[w++] = arr[r];
  arr.length = w;
}

/**
 * Owns all game state and entities. The Pixi stage is layered as:
 *   background → pellets → fish → coins → fx → ui
 */
export class World {
  readonly textures: Textures;
  readonly tweens = new Tweens();

  fish: Fish[] = [];
  droppedCoins: Coin[] = [];
  pellets: Pellet[] = [];

  coinsBalance = 0;
  eggStage = 0;
  hungerEnabled = true;

  width: number;
  height: number;

  private layers = {
    bg: new Container(), pellets: new Container(), fish: new Container(),
    coins: new Container(), fx: new Container(), ui: new Container(),
  };
  private background = new Background();
  private hud: Hud;
  private dirty = false;
  private saveTimer = 0;
  private winShown = false;

  constructor(private app: Application) {
    this.textures = bakeTextures(app.renderer);
    this.width = app.screen.width;
    this.height = app.screen.height;

    const L = this.layers;
    app.stage.addChild(L.bg, L.pellets, L.fish, L.coins, L.fx, L.ui);
    L.bg.addChild(this.background.view);

    this.hud = new Hud(this);
    L.ui.addChild(this.hud.view);

    // load
    const save = loadSave();
    this.coinsBalance = save.coins;
    this.eggStage = save.eggStage;
    for (const f of save.fish) this.spawnFish(f.stage as Stage, f.points);

    // input: anything not caught by a coin/button lands here
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointerdown', (e: FederatedPointerEvent) => this.onTap(e.global.x, e.global.y));

    this.resize(this.width, this.height);
    this.hud.refresh();

    window.addEventListener('beforeunload', () => this.persist());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.persist(); });
  }

  get coins() { return this.coinsBalance; }
  get sandTop() { return this.height - CONFIG.layout.sandHeight; }
  get waterTop() { return CONFIG.layout.topBarHeight; }

  // ─── lifecycle ──────────────────────────────────────────────────────

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.app.stage.hitArea = this.app.screen;
    this.background.draw(width, height);
    this.hud.layout(width);
  }

  update(dt: number) {
    this.tweens.update(dt);

    for (const p of this.pellets) p.update(dt);
    compact(this.pellets, p => p.consumed);

    for (const f of this.fish) f.update(dt);

    for (const c of this.droppedCoins) c.update(dt);
    compact(this.droppedCoins, c => c.collected);

    if (this.dirty) {
      this.saveTimer += dt;
      if (this.saveTimer >= 1) this.persist();
    }
  }

  // ─── input ──────────────────────────────────────────────────────────

  private onTap(x: number, y: number) {
    if (y < this.waterTop || y > this.sandTop) return;
    if (this.coinsBalance < CONFIG.food.cost) return;
    let active = 0;
    for (const p of this.pellets) if (!p.consumed) active++;
    if (active >= CONFIG.food.maxActive) return;
    this.dropFood(x, y);
  }

  private dropFood(x: number, y: number) {
    this.spend(CONFIG.food.cost);
    const pellet = new Pellet(this, x, y);
    this.pellets.push(pellet);
    this.layers.pellets.addChild(pellet.view);
    this.sparkle(x, y, 0xffffaa, 6, 8, 18);
  }

  // ─── economy ────────────────────────────────────────────────────────

  addCoins(n: number) {
    this.coinsBalance += n;
    this.hud.refresh();
    this.markDirty();
  }

  private spend(n: number) {
    this.coinsBalance -= n;
    this.hud.refresh();
    this.markDirty();
  }

  buyFish() {
    if (this.coinsBalance < CONFIG.shop.goldfish) return;
    this.spend(CONFIG.shop.goldfish);
    const fish = this.spawnFish(Stage.Baby, 0);
    this.sparkle(fish.x, fish.y, 0xaaddff, 8, 20, 40);
  }

  buyEggPiece() {
    const costs = CONFIG.shop.eggPieces;
    if (this.eggStage >= costs.length) return;
    const cost = costs[this.eggStage];
    if (this.coinsBalance < cost) return;
    this.spend(cost);
    this.eggStage++;
    this.hud.refresh();
    if (this.eggStage >= costs.length) this.showWin();
  }

  restart() {
    clearSave();
    location.reload();
  }

  // ─── entities ───────────────────────────────────────────────────────

  spawnFish(stage: Stage, points: number): Fish {
    const m = CONFIG.layout.margin + 40;
    const x = m + Math.random() * (this.width - m * 2);
    const y = this.waterTop + m + Math.random() * (this.sandTop - this.waterTop - m * 2);
    const fish = new Fish(this, x, y, stage, points);
    this.fish.push(fish);
    this.layers.fish.addChild(fish.view);
    return fish;
  }

  removeFish(fish: Fish) {
    fish.view.destroy({ children: true });
    compact(this.fish, f => f === fish);
    this.markDirty();
  }

  spawnCoin(x: number, y: number, type: CoinType) {
    const coin = new Coin(this, x, y, type);
    this.droppedCoins.push(coin);
    this.layers.coins.addChild(coin.view);
  }

  onFishStageUp(fish: Fish) {
    this.sparkle(fish.x, fish.y, 0xffee88, 10, 20, 50);
    this.markDirty();
  }

  // ─── fx ─────────────────────────────────────────────────────────────

  private sparkle(x: number, y: number, color: number, count: number, minDist: number, maxDist: number) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = minDist + Math.random() * (maxDist - minDist);
      const dot = new Graphics().circle(0, 0, 1.5 + Math.random() * 2).fill({ color, alpha: 0.9 });
      dot.position.set(x, y);
      this.layers.fx.addChild(dot);
      this.tweens.add(dot, { x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist, alpha: 0 }, {
        duration: 350, ease: ease.quadOut, onComplete: () => dot.destroy(),
      });
    }
  }

  private showWin() {
    if (this.winShown) return;
    this.winShown = true;
    const overlay = new Container();
    overlay.eventMode = 'static';
    overlay.on('pointerdown', (e: FederatedPointerEvent) => e.stopPropagation());

    const dim = new Graphics().rect(0, 0, this.width, this.height).fill({ color: 0x000000, alpha: 0.55 });
    const panel = new Graphics().roundRect(this.width / 2 - 180, this.height / 2 - 90, 360, 180, 18).fill(0x10264a)
      .roundRect(this.width / 2 - 180, this.height / 2 - 90, 360, 180, 18).stroke({ width: 2, color: 0x6aa0e0 });
    const title = new Text({ text: 'The egg hatched!', style: { fontFamily: 'Arial', fontSize: 30, fontWeight: 'bold', fill: 0xffd54a } });
    title.anchor.set(0.5);
    title.position.set(this.width / 2, this.height / 2 - 35);
    const sub = new Text({ text: 'You win. The tank is yours — keep playing.', style: { fontFamily: 'Arial', fontSize: 15, fill: 0xcfe0f5 } });
    sub.anchor.set(0.5);
    sub.position.set(this.width / 2, this.height / 2 + 10);
    const btn = new Text({ text: 'Continue', style: { fontFamily: 'Arial', fontSize: 18, fontWeight: 'bold', fill: 0xffffff } });
    btn.anchor.set(0.5);
    btn.position.set(this.width / 2, this.height / 2 + 55);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', (e: FederatedPointerEvent) => { e.stopPropagation(); overlay.destroy({ children: true }); });

    overlay.addChild(dim, panel, title, sub, btn);
    this.layers.ui.addChild(overlay);
  }

  // ─── persistence ────────────────────────────────────────────────────

  markDirty() { this.dirty = true; }

  private persist() {
    this.dirty = false;
    this.saveTimer = 0;
    writeSave({
      coins: this.coinsBalance,
      eggStage: this.eggStage,
      fish: this.fish.filter(f => !f.dead).map(f => ({ stage: f.stage, points: f.points })),
    });
  }
}
