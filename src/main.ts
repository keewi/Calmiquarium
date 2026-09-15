import { Application } from 'pixi.js';
import { World } from './world/World';

const app = new Application();
await app.init({
  resizeTo: window,
  background: 0x0a1628,
  antialias: true,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  autoDensity: true,
});
document.getElementById('app')!.appendChild(app.canvas);

const world = new World(app);

app.ticker.add((ticker) => {
  // clamp so a backgrounded tab doesn't fast-forward the simulation
  world.update(Math.min(ticker.deltaMS, 100) / 1000);
});
app.renderer.on('resize', (w: number, h: number) => world.resize(w, h));

(window as any).__WORLD__ = world;
