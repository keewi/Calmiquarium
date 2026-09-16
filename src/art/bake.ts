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
  santa: Baked;
  chimney: Baked;
  pegasus: Baked[];   // wing frames: up, mid, down
  rainbow: Texture;
  puppy: Baked[][];   // [coat][frame: 0 grounded, 1 airborne]
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

// ─── santa (faces +x, feet at origin) ─────────────────────────────────

function drawSanta(g: Graphics) {
  const red = 0xd8262c, redDark = 0xa8161c, white = 0xfafafa, skin = 0xf6c9a0;
  // boots
  g.roundRect(-13, -8, 11, 8, 3).fill(0x1c1c1c);
  g.roundRect(2, -8, 11, 8, 3).fill(0x1c1c1c);
  // legs
  g.rect(-11, -18, 8, 11).fill(redDark);
  g.rect(3, -18, 8, 11).fill(redDark);
  // coat
  g.ellipse(0, -30, 17, 19).fill(red);
  g.rect(-17, -14, 34, 5).fill(white);               // hem trim
  g.rect(-16, -25, 32, 5).fill(0x1c1c1c);            // belt
  g.roundRect(-4, -26, 8, 7, 1.5).fill(0xf2c14e);    // buckle
  // arms + mittens
  g.roundRect(-24, -40, 10, 18, 5).fill(red);
  g.roundRect(14, -40, 10, 18, 5).fill(red);
  g.circle(-19, -22, 4.5).fill(white);
  g.circle(19, -22, 4.5).fill(white);
  // head
  g.circle(0, -50, 10).fill(skin);
  // beard
  g.ellipse(1, -43, 10, 8).fill(white);
  g.ellipse(1, -40, 7, 6).fill(white);
  // hat
  g.poly([-11, -56, 11, -56, 5, -74]).fill(red);
  g.roundRect(-12, -59, 24, 5, 2).fill(white);
  g.circle(5, -74, 3.2).fill(white);
  // face
  g.circle(-3, -52, 1.3).fill(0x222222);
  g.circle(4, -52, 1.3).fill(0x222222);
  g.circle(1, -48, 2.2).fill(0xe98b85);
  g.circle(-5, -48, 2).fill({ color: 0xff8080, alpha: 0.35 });   // rosy cheek
}

const SANTA_FRAME = new Rectangle(-26, -80, 52, 82);

// ─── chimney (base at origin) ─────────────────────────────────────────

function drawChimney(g: Graphics) {
  const brick = 0x9b3b2f, mortar = 0xc46a5b, cap = 0x6e6e70;
  g.rect(-20, -60, 40, 60).fill(brick);
  // mortar lines
  for (let y = -52; y < 0; y += 10) g.rect(-20, y, 40, 1.5).fill({ color: mortar, alpha: 0.8 });
  for (let y = -52, row = 0; y < 0; y += 10, row++) {
    for (let x = -20 + (row % 2 ? 7 : 0); x < 20; x += 14) g.rect(x, y - 9, 1.5, 9).fill({ color: mortar, alpha: 0.6 });
  }
  // cap + opening
  g.rect(-24, -66, 48, 7).fill(cap);
  g.rect(-24, -66, 48, 2).fill({ color: 0xffffff, alpha: 0.2 });
  g.ellipse(0, -66, 16, 3.5).fill(0x151515);
}

const CHIMNEY_FRAME = new Rectangle(-26, -70, 52, 72);

// ─── pegasus (faces +x, centred on the body) ──────────────────────────

function drawPegasus(g: Graphics, wing: number) {
  const white = 0xfdfdfd, shade = 0xdfe3ee, mane = 0xd9a6f5, mane2 = 0xf5b3d6, hoof = 0x8e8e9a;
  const lift = wing * 18;   // -1 down … 1 up

  // tail: a bundle of strands sweeping back and down from the rump
  const strands: [number, number, number, number, number, number][] = [
    // [ctrl1x, ctrl1y, ctrl2x, ctrl2y, endx, endy]
    [-40, -10, -54, -2, -56, 10],
    [-40, -6, -52, 4, -52, 18],
    [-38, -2, -50, 10, -46, 26],
    [-36, 2, -46, 14, -40, 30],
  ];
  strands.forEach(([c1x, c1y, c2x, c2y, ex, ey], i) => {
    g.moveTo(-26, -3);
    g.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
    g.stroke({ width: 6 - i, color: i % 2 ? mane2 : mane, cap: 'round' });
  });
  g.circle(-26, -3, 4).fill(mane);   // tail root tuft

  // back wing (behind body), rooted at the shoulder
  g.poly([8, -9, -6, -24 - lift, -24, -20 - lift * 0.6, -18, -9 - lift * 0.3, -2, -2]).fill(shade);

  // legs
  for (const [x, ang] of [[-16, -0.35], [-8, 0.25], [10, -0.3], [18, 0.3]]) {
    g.moveTo(x, 6).lineTo(x + Math.sin(ang) * 14, 20).stroke({ width: 5, color: white, cap: 'round' });
    g.circle(x + Math.sin(ang) * 14, 21, 2.8).fill(hoof);
  }

  // body
  g.ellipse(0, 0, 28, 15).fill(white);
  g.ellipse(2, 5, 20, 8).fill({ color: shade, alpha: 0.5 });

  // neck + head
  g.poly([14, -8, 24, -30, 34, -28, 26, -2]).fill(white);
  g.ellipse(32, -32, 11, 8).fill(white);
  g.ellipse(41, -30, 6, 4.5).fill(white);              // muzzle
  g.circle(43, -29, 1.3).fill(0x6a6a75);               // nostril
  g.poly([25, -38, 28, -47, 31, -38]).fill(white);      // ear
  g.circle(34, -34, 2).fill(0x333344);                 // eye
  g.circle(34.6, -34.6, 0.7).fill(0xffffff);
  g.circle(36, -30, 2.5).fill({ color: 0xff9ec8, alpha: 0.5 });   // blush

  // mane
  g.moveTo(24, -40);
  g.bezierCurveTo(18, -36, 14, -22, 16, -10);
  g.stroke({ width: 5, color: mane, cap: 'round' });
  g.moveTo(22, -38);
  g.bezierCurveTo(17, -30, 15, -20, 17, -12);
  g.stroke({ width: 2.5, color: mane2, cap: 'round' });

  // front wing, rooted just behind the neck
  g.poly([16, -12, 2, -28 - lift, -14, -26 - lift * 0.7, -10, -14 - lift * 0.3, 6, -6]).fill(white);
  g.poly([14, -12, 2, -24 - lift * 0.9, -10, -22 - lift * 0.6, -4, -13 - lift * 0.3]).fill({ color: shade, alpha: 0.6 });
  // feather notches along the trailing edge
  for (const k of [0.3, 0.55, 0.8]) {
    const x = 2 + (-14 - 2) * k, y = (-28 - lift) + ((-26 - lift * 0.7) - (-28 - lift)) * k;
    g.circle(x, y + 3, 2.2).fill(white);
  }
}

const PEGASUS_FRAME = new Rectangle(-62, -60, 114, 96);

/** Rainbow strip used as a MeshRope texture: bands across, fading in along x. */
function drawRainbow(g: Graphics) {
  const colors = [0xff5c5c, 0xffa64d, 0xffe14d, 0x6ee06e, 0x5cb8ff, 0xb98cff];
  const len = 128, band = 4;
  const steps = 16;
  for (let sx = 0; sx < steps; sx++) {
    const alpha = 0.05 + (sx / (steps - 1)) * 0.75;
    for (let i = 0; i < colors.length; i++) {
      g.rect((sx * len) / steps, i * band, len / steps + 0.5, band).fill({ color: colors[i], alpha });
    }
  }
}

const RAINBOW_FRAME = new Rectangle(0, 0, 128, 24);

// ─── puppy (faces +x, paws at origin) ─────────────────────────────────

const PUPPY_COATS = [
  { fur: 0xe8b45a, dark: 0xc48f3a, spots: null },
  { fur: 0x8b5a2b, dark: 0x6b4220, spots: null },
  { fur: 0xf4f0e8, dark: 0xd8d2c6, spots: 0x8b5a2b },
];

function drawPuppy(g: Graphics, coat: typeof PUPPY_COATS[number], airborne: boolean) {
  const { fur, dark, spots } = coat;
  const earLift = airborne ? -6 : 0;
  const legSpread = airborne ? 4 : 0;

  // tail: wags up when airborne
  g.moveTo(-13, -14);
  g.bezierCurveTo(-20, airborne ? -26 : -14, -22, airborne ? -20 : -8, airborne ? -19 : -22, airborne ? -24 : -6);
  g.stroke({ width: 4, color: dark, cap: 'round' });

  // back legs
  g.roundRect(-11 - legSpread, -9, 5, 10, 2.5).fill(dark);
  g.roundRect(-4, -9, 5, 10, 2.5).fill(dark);

  // body
  g.ellipse(0, -13, 14, 9).fill(fur);
  g.ellipse(2, -9, 9, 4.5).fill({ color: 0xffffff, alpha: 0.25 });   // belly
  if (spots !== null) {
    g.ellipse(-5, -15, 5, 3.5).fill(spots);
    g.circle(4, -18, 2.5).fill(spots);
  }

  // front legs
  g.roundRect(3, -9, 5, 10, 2.5).fill(fur);
  g.roundRect(9 + legSpread, -9, 5, 10, 2.5).fill(fur);

  // collar
  g.rect(6, -20, 8, 3).fill(0xd8262c);

  // head
  g.circle(13, -23, 8.5).fill(fur);
  if (spots !== null) g.ellipse(11, -27, 4.5, 3.5).fill(spots);
  g.ellipse(19, -20, 5, 3.6).fill(fur);            // muzzle
  g.circle(22.5, -21, 1.8).fill(0x2a2a2a);         // nose
  g.ellipse(19, -16.5, 2, 2.5).fill(0xf08aa0);      // tongue
  g.circle(14, -25.5, 1.6).fill(0x2a2a2a);          // eye
  g.circle(14.5, -26, 0.6).fill(0xffffff);

  // floppy ear (flaps up in the air)
  g.ellipse(7.5, -22 + earLift, 4, 7).fill(dark);
}

const PUPPY_FRAME = new Rectangle(-28, -40, 56, 42);

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

  const sg = new Graphics();
  drawSanta(sg);
  const santa = bake(renderer, sg, SANTA_FRAME);

  const cg = new Graphics();
  drawChimney(cg);
  const chimney = bake(renderer, cg, CHIMNEY_FRAME);

  const pegasus = [1, 0, -1].map(w => {
    const g = new Graphics();
    drawPegasus(g, w);
    return bake(renderer, g, PEGASUS_FRAME);
  });

  const rg = new Graphics();
  drawRainbow(rg);
  const rainbow = bake(renderer, rg, RAINBOW_FRAME).texture;

  const puppy = PUPPY_COATS.map(coat => [false, true].map(air => {
    const g = new Graphics();
    drawPuppy(g, coat, air);
    return bake(renderer, g, PUPPY_FRAME);
  }));

  return { body, tail, coin, pellet, santa, chimney, pegasus, rainbow, puppy };
}

/** Map a tail angle in [-MAX, MAX] to the nearest baked frame. */
export function tailFrameFor(angle: number): number {
  const t = (angle / TAIL_MAX_ANGLE + 1) / 2;
  return Math.max(0, Math.min(TAIL_FRAMES - 1, Math.round(t * (TAIL_FRAMES - 1))));
}
