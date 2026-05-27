import Phaser from 'phaser';
import { Fish } from '../objects/Fish';
import { Coin } from '../objects/Coin';
import { FoodPellet } from '../objects/FoodPellet';
import { ShopPopup } from '../ui/ShopPopup';
import { SettingsPopup } from '../ui/SettingsPopup';
import { loadGame, saveGame } from '../SaveManager';

export class AquariumScene extends Phaser.Scene {
  coins = 100;
  fish: Fish[] = [];
  private droppedCoins: Coin[] = [];
  pellets: FoodPellet[] = [];
  private shopOpen = false;
  hungerEnabled = false;

  private coinText!: Phaser.GameObjects.Text;
  private coinDisplayGlow!: Phaser.GameObjects.Arc;
  private shopBar!: ShopPopup;
  settingsPopup!: SettingsPopup;
  private sandHeight = 60;

  constructor() {
    super('AquariumScene');
  }

  create() {
    const save = loadGame();
    this.coins = save.coins;

    this.createBackground();
    this.settingsPopup = new SettingsPopup(this);
    this.shopBar = new ShopPopup(this);
    this.createCoinDisplay();

    for (let i = 0; i < save.fishCount; i++) {
      const x = Phaser.Math.Between(80, this.scale.width - 80);
      const y = Phaser.Math.Between(80, this.scale.height - this.sandHeight - 80);
      const fish = new Fish(this, x, y);
      this.fish.push(fish);
    }

    const toGameCoords = (e: PointerEvent) => {
      const rect = this.game.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width * this.scale.width,
        y: (e.clientY - rect.top) / rect.height * this.scale.height,
      };
    };

    this.game.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      const { x, y } = toGameCoords(e);

      // try collecting a coin first
      for (const coin of this.droppedCoins) {
        if (coin.hitTest(x, y)) {
          coin.collect();
          return;
        }
      }

      // drop food if clicking in open water (below the top bar)
      const sandTop = this.scale.height - this.sandHeight;
      const onTopBar = y < 100;
      const activePellets = this.pellets.filter(p => !p.consumed).length;
      if (!this.shopOpen && !onTopBar && y < sandTop && this.coins >= 5 && activePellets < 3) {
        this.dropFood(x, y);
      }
    });

    this.game.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      const { x, y } = toGameCoords(e);
      let overCoin = false;
      for (const coin of this.droppedCoins) {
        if (coin.hitTest(x, y)) {
          overCoin = true;
          break;
        }
      }
      this.game.canvas.style.cursor = overCoin ? 'pointer' : 'default';
    });

    this.scale.on('resize', () => {
      this.repositionUI();
    });
  }

  addCoin(coin: Coin) {
    this.droppedCoins.push(coin);
  }

  setShopOpen(open: boolean) {
    this.shopOpen = open;
  }

  private dropFood(x: number, y: number) {
    this.coins -= 5;
    this.updateCoinDisplay();

    // sparkle burst at click point
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = Phaser.Math.Between(8, 18);
      const spark = this.add.circle(x, y, Phaser.Math.Between(1, 3), 0xffffaa, 0.9);
      spark.setDepth(20);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }

    const pellet = new FoodPellet(this, x, y);
    this.pellets.push(pellet);
  }

  private createBackground() {
    const { width, height } = this.scale;
    const sandDepthZone = 120;
    const totalSandHeight = this.sandHeight + sandDepthZone;
    const sandBgTop = height - totalSandHeight;
    const sandTop = height - this.sandHeight;

    // === entire background baked into ONE canvas texture ===
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    const ctx = bgCanvas.getContext('2d')!;

    // --- blue water fill ---
    ctx.fillStyle = '#5cb8e8';
    ctx.fillRect(0, 0, width, height);

    // --- sand with continuous depth ---
    const mainGrad = ctx.createLinearGradient(0, sandBgTop, 0, height);
    mainGrad.addColorStop(0, '#9a8860');
    mainGrad.addColorStop(0.08, '#a89468');
    mainGrad.addColorStop(0.18, '#b8a474');
    mainGrad.addColorStop(0.35, '#c8b480');
    mainGrad.addColorStop(0.55, '#d8c898');
    mainGrad.addColorStop(0.65, '#e4d4a4');
    mainGrad.addColorStop(0.78, '#ecdcb0');
    mainGrad.addColorStop(0.88, '#f0e0b8');
    mainGrad.addColorStop(0.95, '#e8d8a8');
    mainGrad.addColorStop(1, '#dcc898');
    ctx.fillStyle = mainGrad;
    ctx.fillRect(0, sandBgTop, width, totalSandHeight);

    // noise blotches
    for (let i = 0; i < 40; i++) {
      const bx = Math.random() * width;
      const by = sandBgTop + Math.random() * totalSandHeight;
      const br = 30 + Math.random() * 80;
      const t = (by - sandBgTop) / totalSandHeight;
      const radGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      if (Math.random() < 0.5) {
        radGrad.addColorStop(0, `rgba(60,45,20,${0.04 + t * 0.04})`);
        radGrad.addColorStop(1, 'rgba(60,45,20,0)');
      } else {
        radGrad.addColorStop(0, `rgba(220,200,150,${0.03 + t * 0.04})`);
        radGrad.addColorStop(1, 'rgba(220,200,150,0)');
      }
      ctx.fillStyle = radGrad;
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }

    // medium patches
    for (let i = 0; i < 60; i++) {
      const bx = Math.random() * width;
      const by = sandBgTop + Math.random() * totalSandHeight;
      const br = 15 + Math.random() * 40;
      const t = (by - sandBgTop) / totalSandHeight;
      const colors = [
        `rgba(180,140,80,${0.03 + t * 0.03})`,
        `rgba(140,110,65,${0.04 + t * 0.03})`,
        `rgba(200,180,130,${0.03 + t * 0.03})`,
        `rgba(120,95,50,${0.03 + t * 0.02})`,
      ];
      const radGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      radGrad.addColorStop(0, colors[Math.floor(Math.random() * 4)]);
      radGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }

    // caustics
    for (let i = 0; i < 25; i++) {
      const cx2 = Math.random() * width;
      const cy = sandBgTop + sandDepthZone * 0.6 + Math.random() * (totalSandHeight - sandDepthZone * 0.6);
      const crx = 20 + Math.random() * 50;
      const cry = 8 + Math.random() * 20;
      const t = (cy - sandBgTop) / totalSandHeight;
      ctx.save();
      ctx.translate(cx2, cy);
      ctx.rotate(Math.random() * 0.4 - 0.2);
      const cGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, crx);
      cGrad.addColorStop(0, `rgba(255,245,200,${0.04 + t * 0.06})`);
      cGrad.addColorStop(0.5, `rgba(255,240,180,${0.02 + t * 0.03})`);
      cGrad.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = cGrad;
      ctx.scale(1, cry / crx);
      ctx.beginPath();
      ctx.arc(0, 0, crx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // grain speckles
    const grainColors = ['#d4b478', '#c8a870', '#dcc490', '#e4d0a0', '#c0a868', '#dcbc80', '#b89858', '#e8d8a8', '#ecddac', '#c8b070'];
    const totalGrains = Math.floor(width * totalSandHeight * 0.06);
    for (let i = 0; i < totalGrains; i++) {
      const gx = Math.random() * width;
      const gy = sandBgTop + Math.random() * totalSandHeight;
      const t = (gy - sandBgTop) / totalSandHeight;
      const gr = (0.2 + Math.random() * 0.5) + t * (0.3 + Math.random() * 0.8);
      ctx.globalAlpha = (0.06 + Math.random() * 0.1) + t * (0.08 + Math.random() * 0.12);
      ctx.fillStyle = grainColors[Math.floor(Math.random() * grainColors.length)];
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // pebbles
    for (let i = 0; i < 30; i++) {
      const px = Math.random() * width;
      const py = sandBgTop + sandDepthZone * 0.7 + Math.random() * (totalSandHeight - sandDepthZone * 0.7);
      const pr = 1 + Math.random() * 2.5;
      ctx.globalAlpha = 0.08 + Math.random() * 0.12;
      ctx.fillStyle = Math.random() < 0.5 ? '#a08858' : '#b89868';
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * (0.5 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ripple marks
    for (let r = 0; r < 8; r++) {
      const ry = sandBgTop + sandDepthZone * 0.4 + r * (totalSandHeight / 10) + (Math.random() - 0.5) * 10;
      const t = (ry - sandBgTop) / totalSandHeight;
      ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? '160,130,80' : '210,190,140'},${0.04 + t * 0.06})`;
      ctx.lineWidth = 0.5 + t * 0.8;
      ctx.beginPath();
      const freq = 0.01 + Math.random() * 0.02;
      const amp = 1 + t * 2;
      ctx.moveTo(0, ry);
      for (let rx = 0; rx < width; rx += 6) {
        ctx.lineTo(rx, ry + Math.sin(rx * freq + r) * amp + (Math.random() - 0.5) * 0.5);
      }
      ctx.stroke();
    }

    // --- terrain heightmap ---
    const terrainPts: number[] = [];
    for (let ex = 0; ex <= width; ex++) {
      const y = Math.sin(ex * 0.004) * 25 + Math.sin(ex * 0.012 + 1.3) * 12
        + Math.sin(ex * 0.035 + 0.7) * 6 + Math.sin(ex * 0.08 + 2.1) * 3
        + (Math.sin(ex * 0.15) * Math.sin(ex * 0.07)) * 4;
      terrainPts.push(y);
    }
    const tMin = Math.min(...terrainPts);
    const tMax = Math.max(...terrainPts);
    const tRange = tMax - tMin || 1;

    // terrain edge in screen Y
    const terrainScreenY: number[] = [];
    for (let ex = 0; ex <= width; ex++) {
      terrainScreenY.push(sandBgTop + ((terrainPts[ex] - tMin) / tRange) * 40);
    }

    // cut away sand above terrain line
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let ex = 0; ex <= width; ex++) ctx.lineTo(ex, terrainScreenY[ex]);
    ctx.lineTo(width, 0);
    ctx.closePath();
    ctx.fill();

    // soft fade below terrain edge
    for (let ex = 0; ex <= width; ex++) {
      const edgeY = terrainScreenY[ex];
      const fadeGrad = ctx.createLinearGradient(0, edgeY, 0, edgeY + 10);
      fadeGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
      fadeGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(ex, edgeY, 1, 10);
    }
    ctx.globalCompositeOperation = 'source-over';

    // restore water above the cut
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let ex = 0; ex <= width; ex++) ctx.lineTo(ex, terrainScreenY[ex] - 2);
    ctx.lineTo(width, 0);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#5cb8e8';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // --- generate seaweed cluster data and sort by depth ---
    interface SeaweedCluster {
      clusterX: number; rootY: number; depthT: number; perspScale: number;
      strands: { fanAngle: number; h: number; maxW: number; lean: number;
        curveF1: number; curveA1: number; curveF2: number; curveA2: number; curvePhase: number;
        brightness: number; seed: number; }[];
    }
    const clusters: SeaweedCluster[] = [];
    const numClusters = 24;
    const clusterSpacing = (width - 80) / numClusters;

    for (let c = 0; c < numClusters; c++) {
      const clusterX = 40 + c * clusterSpacing + (Math.random() - 0.5) * clusterSpacing * 0.6;
      const terrainEdgeAtX = terrainScreenY[Math.round(Math.max(0, Math.min(width, clusterX)))] + 8;
      const rootMin = terrainEdgeAtX;
      const rootMax = sandTop + Math.floor(this.sandHeight / 2);
      const rootY = rootMin + Math.random() * (rootMax - rootMin);
      const depthT = (rootY - rootMin) / (rootMax - rootMin || 1);
      const perspScale = 0.35 + depthT * 0.65;
      const strandsInCluster = 3 + Math.floor(Math.random() * 4);

      const strands = [];
      for (let s = 0; s < strandsInCluster; s++) {
        strands.push({
          fanAngle: (s - (strandsInCluster - 1) / 2) * (0.12 + Math.random() * 0.18),
          h: (30 + Math.random() * 190) * perspScale,
          maxW: (12 + Math.random() * 16) * perspScale,
          lean: (Math.random() * 30 - 15) * perspScale,
          curveF1: 1.5 + Math.random() * 1.5,
          curveA1: (3 + Math.random() * 5) * perspScale,
          curveF2: 3 + Math.random() * 2.5,
          curveA2: (1 + Math.random() * 2) * perspScale,
          curvePhase: Math.random() * Math.PI * 2,
          brightness: Math.random() * 100,
          seed: c * 100 + s,
        });
      }
      clusters.push({ clusterX, rootY, depthT, perspScale, strands });
    }

    // sort back-to-front
    clusters.sort((a, b) => a.depthT - b.depthT);

    // helper: interpolate colors
    const lerpColor = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, t: number) => {
      return { r: r1 + (r2 - r1) * t, g: g1 + (g2 - g1) * t, b: b1 + (b2 - b1) * t };
    };
    const toRgba = (c: { r: number; g: number; b: number }, a: number) =>
      `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${a})`;

    // helper: draw one seaweed cluster onto canvas
    const drawCluster = (cl: SeaweedCluster) => {
      const fogT = (1 - cl.depthT) * 0.4;
      const alphaScale = 0.5 + cl.depthT * 0.5;

      for (const st of cl.strands) {
        const greenBase = lerpColor(60, 170, 80, 90, 210, 110, st.brightness / 100);
        const green = lerpColor(greenBase.r, greenBase.g, greenBase.b, 70, 120, 90, fogT);
        const darkBase = lerpColor(40, 120, 60, 65, 160, 80, st.brightness / 100);
        const dark = lerpColor(darkBase.r, darkBase.g, darkBase.b, 70, 120, 90, fogT);
        const hlBase = lerpColor(100, 210, 120, 140, 240, 160, st.brightness / 100);
        const hl = lerpColor(hlBase.r, hlBase.g, hlBase.b, 70, 120, 90, fogT);

        const steps = 16;
        const leftPts: { x: number; y: number }[] = [];
        const rightPts: { x: number; y: number }[] = [];
        const centerPts: { x: number; y: number }[] = [];

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const py = cl.rootY - t * st.h;
          const sway = Math.sin(t * st.curveF1 * Math.PI + st.curvePhase) * st.curveA1 * t
                     + Math.sin(t * st.curveF2 * Math.PI + st.curvePhase * 0.7) * st.curveA2 * t;
          const drift = st.lean * Math.pow(t, 1.5) + Math.sin(st.fanAngle) * t * st.h + sway;
          const leafShape = Math.sin(t * Math.PI) * Math.pow(1 - t * 0.3, 0.5);
          const stemFactor = Math.min(t * 5, 1);
          const halfW = (st.maxW / 2) * leafShape * stemFactor;
          const ruffleL = Math.sin(i * 2.3 + st.seed) * halfW * 0.25;
          const ruffleR = Math.sin(i * 1.9 + st.seed + 1) * halfW * 0.25;
          const cx2 = cl.clusterX + drift;
          centerPts.push({ x: cx2, y: py });
          leftPts.push({ x: cx2 - halfW + ruffleL, y: py });
          rightPts.push({ x: cx2 + halfW + ruffleR, y: py });
        }

        const tracePath = (pts: { x: number; y: number }[], ox = 0) => {
          ctx.moveTo(pts[0].x + ox, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x + ox, pts[i].y);
        };

        // dark back
        ctx.fillStyle = toRgba(dark, 0.5 * alphaScale);
        ctx.beginPath();
        tracePath(leftPts, 2);
        for (let i = rightPts.length - 1; i >= 0; i--) ctx.lineTo(rightPts[i].x + 2, rightPts[i].y);
        ctx.closePath();
        ctx.fill();

        // main blade
        ctx.fillStyle = toRgba(green, 0.9 * alphaScale);
        ctx.beginPath();
        tracePath(leftPts);
        for (let i = rightPts.length - 1; i >= 0; i--) ctx.lineTo(rightPts[i].x, rightPts[i].y);
        ctx.closePath();
        ctx.fill();

        // highlight
        ctx.fillStyle = toRgba(hl, 0.2 * alphaScale);
        ctx.beginPath();
        tracePath(centerPts);
        for (let i = rightPts.length - 1; i >= 0; i--) ctx.lineTo(rightPts[i].x, rightPts[i].y);
        ctx.closePath();
        ctx.fill();

        // midrib vein
        ctx.strokeStyle = toRgba(dark, 0.4 * alphaScale);
        ctx.lineWidth = 1.5 * cl.perspScale;
        ctx.beginPath();
        for (let i = 0; i < centerPts.length; i++) {
          if (i === 0) ctx.moveTo(centerPts[i].x, centerPts[i].y);
          else ctx.lineTo(centerPts[i].x, centerPts[i].y);
        }
        ctx.stroke();
      }
    };

    // --- draw back seaweed, then sandcastle, then front seaweed ---
    const castleDepthT = 0.35; // sandcastle sits at this depth level

    // back seaweed
    for (const cl of clusters) {
      if (cl.depthT < castleDepthT) drawCluster(cl);
    }

    // --- photorealistic sandcastle (2.5x scale) ---
    this.drawSandcastle(ctx, width * 0.75, sandBgTop + 50, 2.5);

    // front seaweed
    for (const cl of clusters) {
      if (cl.depthT >= castleDepthT) drawCluster(cl);
    }

    // --- bake into single Phaser image ---
    if (this.textures.exists('bg-texture')) this.textures.remove('bg-texture');
    this.textures.addCanvas('bg-texture', bgCanvas);
    const bg = this.add.image(width / 2, height / 2, 'bg-texture');
    bg.setDisplaySize(width, height);
    bg.setDepth(-10);
  }

  private drawSandcastle(ctx: CanvasRenderingContext2D, cx: number, baseY: number, sc: number) {
    // photorealistic sandcastle drawn with Canvas 2D at scale `sc`

    // helper to draw a rounded tower with gradient shading
    const drawTower = (tx: number, ty: number, tw: number, th: number, numB: number) => {
      const tTop = ty - th;

      // tower body with vertical gradient
      const tGrad = ctx.createLinearGradient(tx - tw / 2, tTop, tx + tw / 2, tTop);
      tGrad.addColorStop(0, 'rgba(235,215,170,0.95)');   // lit left
      tGrad.addColorStop(0.4, 'rgba(220,200,155,0.95)');
      tGrad.addColorStop(0.7, 'rgba(200,178,135,0.95)');
      tGrad.addColorStop(1, 'rgba(175,155,115,0.9)');     // shadow right
      ctx.fillStyle = tGrad;

      // rounded top corners
      const cornerR = 3 * sc;
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2, ty);
      ctx.lineTo(tx - tw / 2, tTop + cornerR);
      ctx.arcTo(tx - tw / 2, tTop, tx - tw / 2 + cornerR, tTop, cornerR);
      ctx.lineTo(tx + tw / 2 - cornerR, tTop);
      ctx.arcTo(tx + tw / 2, tTop, tx + tw / 2, tTop + cornerR, cornerR);
      ctx.lineTo(tx + tw / 2, ty);
      ctx.closePath();
      ctx.fill();

      // vertical sand texture lines
      ctx.globalAlpha = 0.08;
      for (let vx = tx - tw / 2 + 3 * sc; vx < tx + tw / 2; vx += 4 * sc) {
        ctx.strokeStyle = '#a08848';
        ctx.lineWidth = 0.5 * sc;
        ctx.beginPath();
        ctx.moveTo(vx + (Math.random() - 0.5) * sc, tTop + 4 * sc);
        ctx.lineTo(vx + (Math.random() - 0.5) * sc, ty);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // horizontal mortar lines
      ctx.strokeStyle = 'rgba(160,135,95,0.15)';
      ctx.lineWidth = 0.5 * sc;
      for (let ly = tTop + 8 * sc; ly < ty; ly += 8 * sc) {
        ctx.beginPath();
        ctx.moveTo(tx - tw / 2 + sc, ly + (Math.random() - 0.5) * sc);
        ctx.lineTo(tx + tw / 2 - sc, ly + (Math.random() - 0.5) * sc);
        ctx.stroke();
      }

      // battlements
      const bW = (tw - 2 * sc) / (numB * 2 - 1);
      const bH = 6 * sc;
      for (let b = 0; b < numB; b++) {
        const bx = tx - tw / 2 + sc + b * bW * 2;
        const bGrad = ctx.createLinearGradient(bx, tTop - bH, bx + bW, tTop - bH);
        bGrad.addColorStop(0, 'rgba(230,210,165,0.95)');
        bGrad.addColorStop(1, 'rgba(195,175,130,0.9)');
        ctx.fillStyle = bGrad;
        ctx.fillRect(bx, tTop - bH, bW, bH);
        // tiny shadow under battlement
        ctx.fillStyle = 'rgba(140,120,85,0.15)';
        ctx.fillRect(bx, tTop, bW, 1.5 * sc);
      }

      // specular highlight stripe
      ctx.fillStyle = 'rgba(255,250,230,0.12)';
      ctx.fillRect(tx - tw / 2 + 2 * sc, tTop + 2 * sc, tw * 0.2, th - 4 * sc);
    };

    // conical roof on a tower
    const drawRoof = (tx: number, tTop: number, tw: number) => {
      const roofH = 14 * sc;
      const rGrad = ctx.createLinearGradient(tx - tw / 2, tTop - roofH, tx + tw / 2, tTop - roofH);
      rGrad.addColorStop(0, 'rgba(210,185,140,0.9)');
      rGrad.addColorStop(0.5, 'rgba(195,170,125,0.95)');
      rGrad.addColorStop(1, 'rgba(170,148,108,0.9)');
      ctx.fillStyle = rGrad;
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2 - 2 * sc, tTop);
      ctx.lineTo(tx, tTop - roofH);
      ctx.lineTo(tx + tw / 2 + 2 * sc, tTop);
      ctx.closePath();
      ctx.fill();
      // ridge highlight
      ctx.strokeStyle = 'rgba(255,245,220,0.2)';
      ctx.lineWidth = sc;
      ctx.beginPath();
      ctx.moveTo(tx, tTop - roofH);
      ctx.lineTo(tx - tw / 4, tTop);
      ctx.stroke();
    };

    // main center tower
    const towerW = 36 * sc;
    const towerH = 70 * sc;
    drawTower(cx, baseY, towerW, towerH, 3);
    drawRoof(cx, baseY - towerH, towerW);

    // left tower
    const ltX = cx - 38 * sc;
    const ltW = 28 * sc;
    const ltH = 50 * sc;
    drawTower(ltX, baseY, ltW, ltH, 2);
    drawRoof(ltX, baseY - ltH, ltW);

    // right tower
    const rtX = cx + 38 * sc;
    const rtW = 28 * sc;
    const rtH = 45 * sc;
    drawTower(rtX, baseY, rtW, rtH, 2);
    drawRoof(rtX, baseY - rtH, rtW);

    // connecting walls
    const wallH = 28 * sc;
    const wallTop = baseY - wallH;

    // left wall
    const lwGrad = ctx.createLinearGradient(0, wallTop, 0, baseY);
    lwGrad.addColorStop(0, 'rgba(210,190,148,0.9)');
    lwGrad.addColorStop(1, 'rgba(190,170,128,0.85)');
    ctx.fillStyle = lwGrad;
    ctx.fillRect(ltX + ltW / 2, wallTop, cx - towerW / 2 - (ltX + ltW / 2), wallH);

    // right wall
    ctx.fillStyle = lwGrad;
    ctx.fillRect(cx + towerW / 2, wallTop, rtX - rtW / 2 - (cx + towerW / 2), wallH);

    // wall battlements
    const wallBW = 5 * sc;
    const wallBH = 4 * sc;
    ctx.fillStyle = 'rgba(215,195,152,0.9)';
    for (let wx = ltX + ltW / 2 + 2 * sc; wx < cx - towerW / 2 - wallBW; wx += wallBW * 2) {
      ctx.fillRect(wx, wallTop - wallBH, wallBW, wallBH);
    }
    for (let wx = cx + towerW / 2 + 2 * sc; wx < rtX - rtW / 2 - wallBW; wx += wallBW * 2) {
      ctx.fillRect(wx, wallTop - wallBH, wallBW, wallBH);
    }

    // doorway arch
    ctx.fillStyle = 'rgba(140,115,75,0.7)';
    const doorW = 8 * sc;
    const doorH = 16 * sc;
    ctx.fillRect(cx - doorW / 2, baseY - doorH, doorW, doorH);
    ctx.beginPath();
    ctx.arc(cx, baseY - doorH, doorW / 2, Math.PI, 0, false);
    ctx.fill();

    // window on center tower
    ctx.fillStyle = 'rgba(140,115,75,0.5)';
    ctx.fillRect(cx - 3 * sc, baseY - towerH + 18 * sc, 6 * sc, 7 * sc);
    ctx.fillStyle = 'rgba(92,184,232,0.35)';
    ctx.fillRect(cx - 2 * sc, baseY - towerH + 19 * sc, 4 * sc, 5 * sc);

    // flag
    ctx.fillStyle = 'rgba(140,115,75,0.8)';
    ctx.fillRect(cx, baseY - towerH - 14 * sc - 10 * sc, 1.5 * sc, 24 * sc);
    ctx.fillStyle = 'rgba(220,70,60,0.85)';
    ctx.beginPath();
    ctx.moveTo(cx + 1.5 * sc, baseY - towerH - 14 * sc - 10 * sc);
    ctx.lineTo(cx + 14 * sc, baseY - towerH - 14 * sc - 6 * sc);
    ctx.lineTo(cx + 1.5 * sc, baseY - towerH - 14 * sc - 2 * sc);
    ctx.closePath();
    ctx.fill();

    // sand mound at base
    ctx.fillStyle = 'rgba(216,196,152,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 3 * sc, 65 * sc, 8 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(235,220,180,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx - 5 * sc, baseY + 1 * sc, 40 * sc, 5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private createCoinDisplay() {
    // hidden — coin display is now in the top bar, but we keep coinText for internal tracking
    this.coinDisplayGlow = this.add.circle(0, 0, 1, 0xffd700, 0);
    this.coinText = this.add.text(0, 0, `${this.coins}`, {
      fontSize: '1px', color: '#000',
    }).setVisible(false);
  }

  private repositionUI() {
    const coinDisplay = this.children.getByName('coinDisplay') as Phaser.GameObjects.Container;
    if (coinDisplay) {
      coinDisplay.setPosition(this.scale.width - 80, 32);
    }
  }

  updateCoinDisplay() {
    this.coinText.setText(`${this.coins}`);
    this.shopBar.updatePriceColor();
    this.shopBar.updateCoinText();
    this.save();
  }

  save() {
    saveGame({ coins: this.coins, fishCount: this.fish.length });
  }

  flashCoinDisplay(onPeak: () => void) {
    this.tweens.add({
      targets: this.coinDisplayGlow,
      alpha: 0.4,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        onPeak();
        this.tweens.add({
          targets: this.coinDisplayGlow,
          alpha: 0,
          duration: 250,
          ease: 'Quad.easeIn',
        });
      },
    });
  }

  removeDead() {
    this.fish = this.fish.filter(f => !f.dead);
    this.save();
  }

  spawnFish() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const fish = new Fish(this, cx, cy);
    this.fish.push(fish);
    this.save();
    this.createPoofEffect(cx, cy);
  }

  private createPoofEffect(x: number, y: number) {
    const particles = 12;
    for (let i = 0; i < particles; i++) {
      const angle = (i / particles) * Math.PI * 2;
      const dist = Phaser.Math.Between(20, 50);
      const size = Phaser.Math.Between(4, 10);
      const circle = this.add.circle(x, y, size, 0xffffff, 0.8);
      circle.setDepth(9);

      this.tweens.add({
        targets: circle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => circle.destroy(),
      });
    }

    const flash = this.add.circle(x, y, 30, 0xffffff, 0.6);
    flash.setDepth(8);
    this.tweens.add({
      targets: flash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  update(_time: number, delta: number) {
    for (const fish of this.fish) {
      fish.update(delta);
    }
    for (const coin of this.droppedCoins) {
      coin.update(delta);
    }
    this.droppedCoins = this.droppedCoins.filter(c => !c.collected);

    for (const pellet of this.pellets) {
      pellet.update(delta);
    }
    this.pellets = this.pellets.filter(p => !p.consumed);
  }
}
