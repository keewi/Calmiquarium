import { Application, Container, FederatedPointerEvent, Graphics } from 'pixi.js';
import { CONFIG, CoinType, Stage } from '../config';
import { bakeTextures, Textures } from '../art/bake';
import { loadSave, writeSave } from '../core/save';
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

  gold = 0;
  hungerEnabled = false;

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

  constructor(private app: Application) {
    this.textures = bakeTextures(app.renderer);
    this.width = app.screen.width;
    this.height = app.screen.height;

    const L = this.layers;
    app.stage.addChild(L.bg, L.pellets, L.fish, L.coins, L.fx, L.ui);
    L.bg.addChild(this.background.view);

    this.hud = new Hud(this);
    L.ui.addChild(this.hud.view);

    const save = loadSave();
    this.gold = save.coins;
    for (const f of save.fish) this.spawnFish(f.stage as Stage, f.points);

    // tap anywhere in the water → buy a guppy
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointerdown', (e: FederatedPointerEvent) => this.onTap(e.global.x, e.global.y));

    this.resize(this.width, this.height);
    this.hud.refresh();

    window.addEventListener('beforeunload', () => this.persist());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.persist(); });
  }

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
    if (this.gold < CONFIG.shop.guppy) return;
    this.spend(CONFIG.shop.guppy);
    const fish = this.spawnFish(Stage.Baby, 0, x, y);
    this.sparkle(fish.x, fish.y, 0xaaddff, 8, 12, 30);
  }

  // ─── economy ────────────────────────────────────────────────────────

  addCoins(n: number) {
    this.gold += n;
    this.hud.refresh();
    this.markDirty();
  }

  private spend(n: number) {
    this.gold -= n;
    this.hud.refresh();
    this.markDirty();
  }

  // ─── entities ───────────────────────────────────────────────────────

  spawnFish(stage: Stage, points: number, x?: number, y?: number): Fish {
    const m = CONFIG.layout.margin + 40;
    const fx = x ?? m + Math.random() * (this.width - m * 2);
    const fy = y ?? this.waterTop + m + Math.random() * (this.sandTop - this.waterTop - m * 2);
    const fish = new Fish(this, fx, fy, stage, points);
    this.fish.push(fish);
    this.layers.fish.addChild(fish.view);
    this.markDirty();
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

  // ─── persistence ────────────────────────────────────────────────────

  markDirty() { this.dirty = true; }

  private persist() {
    this.dirty = false;
    this.saveTimer = 0;
    writeSave({
      coins: this.gold,
      eggStage: 0,
      fish: this.fish.filter(f => !f.dead).map(f => ({ stage: f.stage, points: f.points })),
    });
  }
}
