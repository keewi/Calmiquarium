import { Application, Container, FederatedPointerEvent, Graphics } from 'pixi.js';
import { CONFIG, CoinType, Stage } from '../config';
import { bakeTextures, Textures } from '../art/bake';
import { audio } from '../core/audio';
import { loadSave, writeSave } from '../core/save';
import { ease, Tweens } from '../core/tween';
import { Coin } from '../entities/Coin';
import { Fish } from '../entities/Fish';
import { Pegasus } from '../entities/Pegasus';
import { Pellet } from '../entities/Pellet';
import { SantaVisit } from '../entities/SantaVisit';
import { Background } from '../ui/Background';
import { Sidebar } from '../ui/Sidebar';
import { Seaweed } from '../ui/Seaweed';

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
  santa: SantaVisit | null = null;
  pegasi: Pegasus[] = [];

  gold = 0;
  hungerEnabled = false;

  width: number;
  height: number;

  private layers = {
    bg: new Container(), pellets: new Container(), fish: new Container(),
    coins: new Container(), fx: new Container(), ui: new Container(),
  };
  private background = new Background();
  private seaweed: Seaweed;
  private sidebar: Sidebar;
  private dirty = false;
  private saveTimer = 0;

  constructor(private app: Application) {
    this.textures = bakeTextures(app.renderer);
    this.width = app.screen.width;
    this.height = app.screen.height;

    const L = this.layers;
    app.stage.addChild(L.bg, L.pellets, L.fish, L.coins, L.fx, L.ui);
    L.bg.addChild(this.background.view);
    this.seaweed = new Seaweed(app.renderer);
    L.bg.addChild(this.seaweed.view);

    this.sidebar = new Sidebar(this);
    L.ui.addChild(this.sidebar.view);

    const save = loadSave();
    this.gold = save.coins;
    for (const f of save.fish) this.spawnFish(f.stage as Stage, f.points);

    // tap anywhere in the water → buy a guppy
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointerdown', (e: FederatedPointerEvent) => this.onTap(e.global.x, e.global.y));

    this.resize(this.width, this.height);
    this.sidebar.refresh();

    window.addEventListener('beforeunload', () => this.persist());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.persist(); });
  }

  get sandTop() { return this.height - CONFIG.layout.sandHeight; }
  get waterTop() { return CONFIG.layout.topBarHeight; }
  get waterLeft() { return CONFIG.layout.sidebarWidth; }
  get waterWidth() { return this.width - this.waterLeft; }

  // ─── lifecycle ──────────────────────────────────────────────────────

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.app.stage.hitArea = this.app.screen;
    this.background.draw(this.waterLeft, width, height);
    this.seaweed.layout(this.waterLeft, width, height);
    this.sidebar.layout(height);
  }

  update(dt: number) {
    this.tweens.update(dt);
    this.seaweed.update(dt);

    for (const p of this.pellets) p.update(dt);
    compact(this.pellets, p => p.consumed);

    for (const f of this.fish) f.update(dt);

    for (const c of this.droppedCoins) c.update(dt);
    compact(this.droppedCoins, c => c.collected);

    if (this.santa) {
      this.santa.update(dt);
      if (this.santa.done) { this.santa = null; this.sidebar.refresh(); }
    }

    for (const p of this.pegasi) p.update(dt);
    compact(this.pegasi, p => p.done);

    if (this.dirty) {
      this.saveTimer += dt;
      if (this.saveTimer >= 1) this.persist();
    }
  }

  // ─── input ──────────────────────────────────────────────────────────

  private onTap(x: number, y: number) {
    if (x < this.waterLeft || y < this.waterTop || y > this.sandTop) return;
    if (this.gold < CONFIG.shop.guppy) return;
    this.spend(CONFIG.shop.guppy);
    this.plopFish();
  }

  /** A new guppy falls in from above the surface at the centre of the tank. */
  private plopFish() {
    const cx = this.waterLeft + this.waterWidth / 2;
    const landY = this.waterTop + 90 + Math.random() * 60;
    const fish = this.spawnFish(Stage.Baby, 0, cx, this.waterTop - 30);
    fish.dropIn(landY);
    this.splash(cx, this.waterTop + 6);
  }

  // ─── economy ────────────────────────────────────────────────────────

  addCoins(n: number) {
    this.gold += n;
    this.sidebar.refresh();
    this.markDirty();
  }

  private spend(n: number) {
    this.gold -= n;
    this.sidebar.refresh();
    this.markDirty();
  }

  buySanta() {
    if (this.santa || this.gold < CONFIG.shop.santa) return;
    audio.unlock();
    this.spend(CONFIG.shop.santa);
    const m = CONFIG.layout.margin + 40;
    const x = this.waterLeft + m + Math.random() * (this.waterWidth - m * 2);
    this.santa = new SantaVisit(this, x);
    this.layers.fish.addChild(this.santa.view);
    this.sidebar.refresh();
  }

  buyPegasus() {
    if (this.gold < CONFIG.shop.pegasus) return;
    audio.unlock();
    this.spend(CONFIG.shop.pegasus);
    const p = new Pegasus(this);
    this.pegasi.push(p);
    this.layers.fx.addChild(p.view);   // above fish and coins — it's flying past the glass
  }

  // ─── entities ───────────────────────────────────────────────────────

  spawnFish(stage: Stage, points: number, x?: number, y?: number): Fish {
    const m = CONFIG.layout.margin + 40;
    const fx = x ?? this.waterLeft + m + Math.random() * (this.waterWidth - m * 2);
    const fy = y ?? this.waterTop + m + Math.random() * (this.sandTop - this.waterTop - m * 2);
    const fish = new Fish(this, fx, fy, stage, points);
    if (x === undefined) fish.popIn();
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

  private splash(x: number, y: number) {
    const fx = this.layers.fx;

    // expanding ripple rings on the surface
    for (const delay of [0, 120]) {
      const ring = new Graphics().ellipse(0, 0, 22, 7).stroke({ width: 2.5, color: 0xffffff, alpha: 0.85 });
      ring.position.set(x, y);
      ring.scale.set(0.3);
      ring.alpha = 0;
      fx.addChild(ring);
      this.tweens.add(ring, { alpha: 0.9 }, { duration: 60 + delay, ease: ease.linear, onComplete: () => {
        this.tweens.add(ring.scale, { x: 2.6, y: 2.6 }, { duration: 650, ease: ease.quadOut });
        this.tweens.add(ring, { alpha: 0 }, { duration: 650, ease: ease.quadIn, onComplete: () => ring.destroy() });
      } });
    }

    // droplets thrown up and outward, then falling back
    for (let i = 0; i < 14; i++) {
      const spread = (Math.random() - 0.5) * 1.6;            // radians off vertical
      const power = 40 + Math.random() * 50;
      const drop = new Graphics().circle(0, 0, 1.5 + Math.random() * 2.5).fill({ color: 0xdff4ff, alpha: 0.95 });
      drop.position.set(x, y);
      fx.addChild(drop);
      const dx = Math.sin(spread) * power;
      const up = Math.cos(spread) * power;
      this.tweens.add(drop, { x: x + dx * 0.55, y: y - up }, { duration: 260, ease: ease.quadOut, onComplete: () => {
        this.tweens.add(drop, { x: x + dx, y: y + 10, alpha: 0 }, { duration: 320, ease: ease.quadIn, onComplete: () => drop.destroy() });
      } });
    }

    // white foam burst
    const foam = new Graphics().ellipse(0, 0, 18, 6).fill({ color: 0xffffff, alpha: 0.7 });
    foam.position.set(x, y);
    fx.addChild(foam);
    this.tweens.add(foam.scale, { x: 1.8, y: 1.2 }, { duration: 300, ease: ease.quadOut });
    this.tweens.add(foam, { alpha: 0 }, { duration: 300, ease: ease.quadIn, onComplete: () => foam.destroy() });
  }

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
