import { Container, Graphics, MeshRope, Point, Rectangle, Renderer, Texture } from 'pixi.js';
import { CONFIG } from '../config';

const SEGMENTS = 9;

interface Strand {
  rope: MeshRope;
  points: Point[];
  fx: number;       // x as a fraction of screen width
  height: number;
  phase: number;
  freq: number;
  amp: number;
}

/** Bake one horizontal strand: wide at the left (base), tapered to the right (tip). */
function bakeStrandTexture(renderer: Renderer): Texture {
  const g = new Graphics();
  const len = 120, half = 7;
  g.moveTo(0, -half);
  g.bezierCurveTo(len * 0.4, -half * 1.1, len * 0.8, -half * 0.5, len, 0);
  g.bezierCurveTo(len * 0.8, half * 0.5, len * 0.4, half * 1.1, 0, half);
  g.closePath();
  g.fill(0x2f8f5a);
  g.moveTo(4, 0).lineTo(len - 8, 0).stroke({ width: 1.5, color: 0x58b87c, alpha: 0.7 });
  const texture = renderer.generateTexture({ target: g, frame: new Rectangle(0, -half - 1, len, half * 2 + 2), resolution: 2, antialias: true });
  g.destroy();
  return texture;
}

/** Gently swaying seaweed, drawn as texture ropes whose control points move each frame. */
export class Seaweed {
  readonly view = new Container();
  private strands: Strand[] = [];
  private t = 0;
  private width = 0;
  private height = 0;

  constructor(renderer: Renderer) {
    const texture = bakeStrandTexture(renderer);
    const specs = [
      { fx: 0.30, height: 95 }, { fx: 0.335, height: 70 }, { fx: 0.62, height: 110 },
      { fx: 0.655, height: 60 }, { fx: 0.90, height: 85 }, { fx: 0.08, height: 65 },
    ];
    for (const s of specs) {
      const points = Array.from({ length: SEGMENTS }, () => new Point());
      const rope = new MeshRope({ texture, points });
      this.view.addChild(rope);
      this.strands.push({
        rope, points, fx: s.fx, height: s.height,
        phase: Math.random() * Math.PI * 2,
        freq: 0.9 + Math.random() * 0.5,
        amp: 6 + Math.random() * 5,
      });
    }
  }

  layout(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.update(0);
  }

  update(dt: number) {
    this.t += dt;
    const base = this.height - CONFIG.layout.sandHeight + 4;
    for (const s of this.strands) {
      const x0 = this.width * s.fx;
      const seg = s.height / (SEGMENTS - 1);
      for (let i = 0; i < SEGMENTS; i++) {
        const k = i / (SEGMENTS - 1);           // 0 at base, 1 at tip
        const sway = Math.sin(this.t * s.freq + s.phase + k * 2.2) * s.amp * k * k;
        s.points[i].set(x0 + sway, base - i * seg);
      }
    }
  }
}
