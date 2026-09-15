import { Container, Graphics, Rectangle, Renderer, Text, Texture } from 'pixi.js';
import { CONFIG, CoinType } from '../config';
import { lerpColor } from '../core/color';

/**
 * All procedural art is drawn ONCE here and turned into textures.
 * Entities are plain Sprites that swap textures — nothing is redrawn per frame.
 */

/** Visual variants driven by hunger: 0 normal, 1 starving (green), 2 desperate (purple). */
export type Look = 0 | 1 | 2;
export const LOOKS: Look[] = [0, 1, 2];
const LOOK_TINT: (number | null)[] = [null, 0x66cc66, 0xaa66dd];

export const TAIL_FRAMES = 9;
export const TAIL_MAX_ANGLE = 0.7; // radians, either side

export interface Baked { texture: Texture; anchorX: number; anchorY: number }

export interface Textures {
  body: Baked[][];  // [kind: 0 guppy, 1 king][look]
  tail: Baked[][];  // [look][frame]
  coin: Record<CoinType, Baked>;
  pellet: Baked;
}

const BASE = {
  body: 0xff8c00, dark: 0xe07800, belly: 0xffcc44,
  fin: 0xff7800, finHi: 0xffa848, tail: 0xffa040, tailHi: 0xffcc66,
};
const KING = {
  body: 0xff5520, dark: 0xcc3a10, belly: 0xffaa66,
  fin: 0xff4410, finHi: 0xff8844, tail: 0xff5520, tailHi: 0xff8844,
};

type Palette = typeof BASE;

function paletteFor(kind: 0 | 1, look: Look): Palette {
  const base = kind === 1 ? KING : BASE;
  const tint = LOOK_TINT[look];
  if (tint === null) return base;
  const out = { ...base };
  for (const k of Object.keys(out) as (keyof Palette)[]) out[k] = lerpColor(base[k], tint, 0.6);
  return out;
}

function bake(renderer: Renderer, target: Container, frame: Rectangle): Baked {
  const texture = renderer.generateTexture({ target, frame, resolution: 2, antialias: true });
  target.destroy({ children: true });
  return { texture, anchorX: -frame.x / frame.width, anchorY: -frame.y / frame.height };
}

// ─── fish body (faces +x, tail root at x≈-19) ─────────────────────────

function drawBody(g: Graphics, p: Palette, king: boolean) {
  // dorsal fin
  g.poly([-6, -10, 2, -20, 10, -9]).fill(p.fin);
  g.poly([-4, -11, 2, -17, 7, -10]).fill({ color: p.finHi, alpha: 0.6 });
  // ventral fin
  g.poly([-2, 9, 3, 17, 8, 9]).fill(p.fin);
  // body
  g.ellipse(0, 0, 22, 13).fill(p.body);
  // belly
  g.ellipse(2, 5, 15, 6).fill({ color: p.belly, alpha: 0.7 });
  // back shading
  g.ellipse(-3, -6, 16, 5).fill({ color: p.dark, alpha: 0.35 });
  // side fin
  g.poly([-2, 3, 5, 12, 9, 4]).fill({ color: p.finHi, alpha: 0.9 });
  // eye
  g.circle(12, -4, 3.6).fill(0xffffff);
  g.circle(13, -4, 1.9).fill(0x222222);
  g.circle(13.8, -4.8, 0.7).fill(0xffffff);
  // mouth
  g.moveTo(19, 1).lineTo(22, 2).stroke({ width: 1.2, color: p.dark });

  if (king) {
    g.poly([-6, -22, -3, -30, 0, -23, 3, -31, 6, -23, 9, -30, 11, -22]).fill(0xffd700);
    g.rect(-6, -23, 17, 3).fill(0xe6b800);
    g.circle(-3, -28, 1.2).fill(0xff3366);
    g.circle(3, -29, 1.2).fill(0x33aaff);
    g.circle(9, -28, 1.2).fill(0x33ff88);
  }
}

const BODY_FRAME = new Rectangle(-26, -34, 52, 54);

// ─── fish tail (root at origin, extends to -x) ────────────────────────

function drawTail(g: Graphics, p: Palette, angle: number) {
  const len = 15, spread = 12;
  const tipX = -Math.cos(angle) * len;
  const tipTopY = -spread + Math.sin(angle) * 4;
  const tipBotY = spread + Math.sin(angle) * 4;
  const midX = -Math.cos(angle) * (len * 0.5);
  const midY = Math.sin(angle) * 2;

  g.poly([
    0, -3,
    midX, tipTopY * 0.5 + midY,
    tipX, tipTopY,
    tipX + 2, Math.sin(angle) * 3,
    tipX, tipBotY,
    midX, tipBotY * 0.5 + midY,
    0, 3,
  ]).fill({ color: p.tail, alpha: 0.95 });

  g.poly([
    0, -1,
    midX, tipTopY * 0.3 + midY,
    tipX + 1, tipTopY * 0.5,
    tipX + 2, midY,
    0, 1,
  ]).fill({ color: p.tailHi, alpha: 0.35 });
}

const TAIL_FRAME = new Rectangle(-20, -18, 24, 36);

// ─── coins ────────────────────────────────────────────────────────────

function drawCoin(type: CoinType): Container {
  const c = new Container();
  const g = new Graphics();
  const value = CONFIG.coins.values[type];

  if (type === 'diamond') {
    const r = 14;
    g.poly([0, -r, r * 0.7, -r * 0.25, r * 0.5, r * 0.8, 0, r, -r * 0.5, r * 0.8, -r * 0.7, -r * 0.25]).fill(0x8899dd);
    g.poly([0, -r, r * 0.3, -r * 0.15, 0, r * 0.4, -r * 0.3, -r * 0.15]).fill({ color: 0xaaccff, alpha: 0.85 });
    g.poly([0, -r, r * 0.7, -r * 0.25, 0, -r * 0.25]).fill({ color: 0xddeeff, alpha: 0.9 });
    g.poly([0, -r, -r * 0.7, -r * 0.25, 0, -r * 0.25]).fill({ color: 0xeef6ff, alpha: 0.7 });
    c.addChild(g);
    return c;
  }

  const outer = type === 'gold' ? 0xd4a017 : 0x9aa0a8;
  const inner = type === 'gold' ? 0xffd54a : 0xd8dde3;
  const text = type === 'gold' ? 0x8b6914 : 0x4a4f55;
  g.circle(0, 0, 14).fill(outer);
  g.circle(0, 0, 11).fill(inner);
  g.circle(-4, -5, 4).fill({ color: 0xffffff, alpha: 0.45 });
  c.addChild(g);
  const label = new Text({ text: String(value), style: { fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: text } });
  label.anchor.set(0.5);
  label.y = 0.5;
  c.addChild(label);
  return c;
}

const COIN_FRAME = new Rectangle(-16, -16, 32, 32);

// ─── pellet ───────────────────────────────────────────────────────────

function drawPellet(g: Graphics) {
  g.circle(0, 0, 5).fill(0x5c3a1a);
  g.circle(0, 0, 4).fill(0x8b5e3c);
  g.circle(-1.5, -1.5, 1.5).fill({ color: 0xffffff, alpha: 0.35 });
}

const PELLET_FRAME = new Rectangle(-6, -6, 12, 12);

// ─── entry point ──────────────────────────────────────────────────────

export function bakeTextures(renderer: Renderer): Textures {
  const body: Baked[][] = [];
  for (const kind of [0, 1] as const) {
    body[kind] = [];
    for (const look of LOOKS) {
      const g = new Graphics();
      drawBody(g, paletteFor(kind, look), kind === 1);
      body[kind][look] = bake(renderer, g, BODY_FRAME);
    }
  }

  const tail: Baked[][] = [];
  for (const look of LOOKS) {
    tail[look] = [];
    const p = paletteFor(0, look);
    for (let f = 0; f < TAIL_FRAMES; f++) {
      const angle = -TAIL_MAX_ANGLE + (2 * TAIL_MAX_ANGLE * f) / (TAIL_FRAMES - 1);
      const g = new Graphics();
      drawTail(g, p, angle);
      tail[look][f] = bake(renderer, g, TAIL_FRAME);
    }
  }

  const coin = {} as Record<CoinType, Baked>;
  for (const type of Object.keys(CONFIG.coins.values) as CoinType[]) {
    coin[type] = bake(renderer, drawCoin(type), COIN_FRAME);
  }

  const pg = new Graphics();
  drawPellet(pg);
  const pellet = bake(renderer, pg, PELLET_FRAME);

  return { body, tail, coin, pellet };
}

/** Map a tail angle in [-MAX, MAX] to the nearest baked frame. */
export function tailFrameFor(angle: number): number {
  const t = (angle / TAIL_MAX_ANGLE + 1) / 2;
  return Math.max(0, Math.min(TAIL_FRAMES - 1, Math.round(t * (TAIL_FRAMES - 1))));
}
