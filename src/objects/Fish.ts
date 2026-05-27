import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';
import { Coin } from './Coin';
import type { CoinType } from './Coin';

const MAX_HUNGER = 45;          // seconds when fully fed
const HUNGRY_THRESHOLD = 25;    // still orange, chases food, still drops coins
const STARVING_THRESHOLD = 15;  // turns green, stops dropping coins
const DESPERATE_THRESHOLD = 4;  // turns purple, last chance

// growth constants
const BABY_TO_MED = 3;            // pellets eaten to go baby → medium
const MED_TO_LARGE = 6;           // pellets eaten to go medium → large
const LARGE_TO_KING_POINTS = 75;  // growth points accrued while large
const DROP_INTERVAL_MS = 5500;    // coin drop interval for medium/large/king

// visual scale per stage: baby is small, king is big
const STAGE_SCALE: number[] = [0.9, 1.4, 1.7, 2.1];

export const GrowthStage = {
  Baby: 0,
  Medium: 1,
  Large: 2,
  King: 3,
} as const;
export type GrowthStage = (typeof GrowthStage)[keyof typeof GrowthStage];

export class Fish {
  private scene: AquariumScene;
  private container: Phaser.GameObjects.Container;
  private bodyGfx: Phaser.GameObjects.Graphics;
  private tailGfx: Phaser.GameObjects.Graphics;

  private targetX: number;
  private targetY: number;
  private speed = 0;
  private baseSpeed = 0;
  private wanderTimer = 0;
  private wanderInterval: number;
  private coinTimer = 0;
  private coinInterval = DROP_INTERVAL_MS;
  private tailPhase = Math.random() * Math.PI * 2;
  private lastTailAngle = -999;
  private facingRight = true;

  private margin = 60;
  private sandHeight = 60;

  // hunger system
  private hungerTimer = MAX_HUNGER;
  private lastHungerState = 0; // 0=full, 1=hungry, 2=starving, 3=desperate
  dead = false;
  private dying = false;

  // growth system
  growthStage: GrowthStage = GrowthStage.Baby;
  growthPoints = 0;
  private readyToKing = false; // large guppy has reached LARGE_TO_KING_POINTS, transforms on next feed

  constructor(scene: AquariumScene, x: number, y: number, stage: GrowthStage = GrowthStage.Baby, points = 0) {
    this.scene = scene;
    this.growthStage = stage;
    this.growthPoints = points;
    this.readyToKing = stage === GrowthStage.Large && points >= LARGE_TO_KING_POINTS;

    this.tailGfx = scene.add.graphics();
    this.bodyGfx = scene.add.graphics();
    this.drawBody();
    this.drawTail(0);

    const scale = STAGE_SCALE[this.growthStage];
    this.container = scene.add.container(x, y, [this.tailGfx, this.bodyGfx]);
    this.container.setDepth(10);
    this.container.setScale(0);

    scene.tweens.add({
      targets: this.container,
      scaleX: scale,
      scaleY: scale,
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.targetX = x;
    this.targetY = y;
    this.wanderInterval = Phaser.Math.Between(2000, 5000);
    this.pickNewTarget();
  }

  private get isHungry(): boolean {
    return this.hungerTimer <= HUNGRY_THRESHOLD;
  }

  private get isStarving(): boolean {
    return this.hungerTimer <= STARVING_THRESHOLD;
  }

  private get isDesperate(): boolean {
    return this.hungerTimer <= DESPERATE_THRESHOLD;
  }

  private getHungerTint(): number | null {
    if (this.isDesperate) return 0x9944cc;  // purple
    if (this.isStarving) return 0x44bb44;   // green
    return null;
  }

  // --- growth helpers ---

  private getDropType(): CoinType | null {
    switch (this.growthStage) {
      case GrowthStage.Baby: return null;       // babies don't drop
      case GrowthStage.Medium: return 'silver';
      case GrowthStage.Large: return 'gold';
      case GrowthStage.King: return 'diamond';
    }
  }

  private onEatFood() {
    this.growthPoints++;

    switch (this.growthStage) {
      case GrowthStage.Baby:
        if (this.growthPoints >= BABY_TO_MED) {
          this.stageUp(GrowthStage.Medium);
        }
        break;
      case GrowthStage.Medium:
        if (this.growthPoints >= MED_TO_LARGE) {
          this.stageUp(GrowthStage.Large);
        }
        break;
      case GrowthStage.Large:
        if (this.readyToKing) {
          // transform on this feed
          this.stageUp(GrowthStage.King);
        } else if (this.growthPoints >= LARGE_TO_KING_POINTS) {
          this.readyToKing = true;
        }
        break;
      case GrowthStage.King:
        // terminal — no further growth
        break;
    }
  }

  private stageUp(newStage: GrowthStage) {
    this.growthStage = newStage;
    this.growthPoints = 0;
    this.readyToKing = false;

    // redraw at new size with a little pop animation
    const scale = STAGE_SCALE[newStage];
    this.drawBody();
    this.drawTail(0);
    this.lastTailAngle = -999;

    // stage-up sound
    this.scene.playStageUpSound();

    // pop effect
    this.scene.tweens.add({
      targets: this.container,
      scaleX: (this.facingRight ? 1 : -1) * (scale + 0.3),
      scaleY: scale + 0.3,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.container,
          scaleX: (this.facingRight ? 1 : -1) * scale,
          scaleY: scale,
          duration: 200,
          ease: 'Quad.easeIn',
        });
      },
    });

    // sparkle effect at fish location
    this.scene.createPoofEffect(this.container.x, this.container.y);
    this.scene.save();
  }

  // --- drawing ---

  private getKingTint(): { bodyColor: number; darkColor: number; bellyColor: number; finColor: number; finHColor: number; sideFColor: number } | null {
    if (this.growthStage !== GrowthStage.King) return null;
    return {
      bodyColor: 0xff4500,    // deep red-orange
      darkColor: 0xcc3300,
      bellyColor: 0xffaa33,
      finColor: 0xff3300,
      finHColor: 0xff7744,
      sideFColor: 0xff5522,
    };
  }

  private drawBody() {
    const g = this.bodyGfx;
    g.clear();

    const tint = this.getHungerTint();
    const kingColors = this.getKingTint();

    // color helpers — blend base color toward tint
    const baseOrange = 0xff8c00;
    const darkOrange = 0xe07800;
    const bellyYellow = 0xffcc44;
    const finOrange = 0xff7800;
    const finHighlight = 0xffa848;
    const sideFinColor = 0xff9030;

    let bodyColor = kingColors ? kingColors.bodyColor : baseOrange;
    let darkColor = kingColors ? kingColors.darkColor : darkOrange;
    let bellyColor = kingColors ? kingColors.bellyColor : bellyYellow;
    let finColor = kingColors ? kingColors.finColor : finOrange;
    let finHColor = kingColors ? kingColors.finHColor : finHighlight;
    let sideFColor = kingColors ? kingColors.sideFColor : sideFinColor;

    if (tint) {
      const blend = (base: number) => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(base),
          Phaser.Display.Color.IntegerToColor(tint), 100, 60
        );
        return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
      };
      bodyColor = blend(bodyColor);
      darkColor = blend(darkColor);
      bellyColor = blend(bellyColor);
      finColor = blend(finColor);
      finHColor = blend(finHColor);
      sideFColor = blend(sideFColor);
    }

    // main body
    g.fillStyle(bodyColor, 1);
    g.fillEllipse(0, 0, 40, 26);

    // darker back/top half
    g.fillStyle(darkColor, 0.5);
    g.fillEllipse(0, -4, 36, 14);

    // lighter belly highlight
    g.fillStyle(bellyColor, 0.6);
    g.fillEllipse(2, 5, 28, 12);

    // shiny specular highlight on upper body
    g.fillStyle(0xffffff, 0.25);
    g.fillEllipse(4, -6, 16, 7);

    // dorsal fin — sharp pointed
    g.fillStyle(finColor, 0.8);
    g.beginPath();
    g.moveTo(-4, -12);
    g.lineTo(-1, -24);
    g.lineTo(8, -12);
    g.closePath();
    g.fillPath();
    // fin highlight
    g.fillStyle(finHColor, 0.5);
    g.beginPath();
    g.moveTo(-1, -13);
    g.lineTo(0, -20);
    g.lineTo(5, -13);
    g.closePath();
    g.fillPath();

    // king crown
    if (this.growthStage === GrowthStage.King) {
      this.drawCrown(g);
    }

    // pectoral fin (side fin)
    g.fillStyle(sideFColor, 0.7);
    g.fillEllipse(4, 8, 10, 6);

    // eye — large and expressive
    g.fillStyle(0xffffff, 1);
    g.fillCircle(12, -3, 6.5);
    // iris
    g.fillStyle(0x1a1a2e, 1);
    g.fillCircle(13.5, -3, 4);
    // pupil
    g.fillStyle(0x000000, 1);
    g.fillCircle(14, -3, 2.5);
    // eye sparkle (top)
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(12, -5, 1.8);
    // eye sparkle (bottom, smaller)
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(15, -1.5, 0.9);

    // cute little smile
    g.lineStyle(1.5, 0xcc6600, 0.7);
    g.beginPath();
    g.arc(16, 2, 3, 0.2, Math.PI * 0.7, false);
    g.strokePath();

    // subtle lip/cheek blush
    g.fillStyle(0xff6666, 0.15);
    g.fillCircle(14, 4, 4);
  }

  private drawCrown(g: Phaser.GameObjects.Graphics) {
    // small crown sitting on top of the fish's head
    const cx = 6;
    const cy = -14;
    const w = 14;
    const h = 10;

    // crown body — gold
    g.fillStyle(0xffd700, 1);
    g.beginPath();
    g.moveTo(cx - w / 2, cy);
    g.lineTo(cx - w / 2, cy - h * 0.5);
    g.lineTo(cx - w * 0.25, cy - h * 0.3);
    g.lineTo(cx, cy - h);
    g.lineTo(cx + w * 0.25, cy - h * 0.3);
    g.lineTo(cx + w / 2, cy - h * 0.5);
    g.lineTo(cx + w / 2, cy);
    g.closePath();
    g.fillPath();

    // crown rim
    g.fillStyle(0xdaa520, 1);
    g.fillRect(cx - w / 2, cy - 1, w, 3);

    // jewel on center point
    g.fillStyle(0xff0000, 1);
    g.fillCircle(cx, cy - h * 0.7, 1.5);

    // side jewels
    g.fillStyle(0x4444ff, 1);
    g.fillCircle(cx - w * 0.35, cy - h * 0.35, 1);
    g.fillCircle(cx + w * 0.35, cy - h * 0.35, 1);
  }

  private drawTail(angle: number) {
    const g = this.tailGfx;
    g.clear();

    const tint = this.getHungerTint();

    const baseTail = this.growthStage === GrowthStage.King ? 0xff5520 : 0xffa040;
    const baseHighlight = this.growthStage === GrowthStage.King ? 0xff8844 : 0xffcc66;

    let tailColor = baseTail;
    let hlColor = baseHighlight;

    if (tint) {
      const blend = (base: number) => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(base),
          Phaser.Display.Color.IntegerToColor(tint), 100, 60
        );
        return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
      };
      tailColor = blend(baseTail);
      hlColor = blend(baseHighlight);
    }

    const cx = -19;
    const len = 15;
    const spread = 12;

    const tipX = cx - Math.cos(angle) * len;
    const tipTopY = -spread + Math.sin(angle) * 4;
    const tipBotY = spread + Math.sin(angle) * 4;
    const midX = cx - Math.cos(angle) * (len * 0.5);
    const midY = Math.sin(angle) * 2;

    // outer tail
    g.fillStyle(tailColor, 0.9);
    g.beginPath();
    g.moveTo(cx, -3);
    g.lineTo(midX, tipTopY * 0.5 + midY);
    g.lineTo(tipX, tipTopY);
    g.lineTo(tipX + 2, 0 + Math.sin(angle) * 3);
    g.lineTo(tipX, tipBotY);
    g.lineTo(midX, tipBotY * 0.5 + midY);
    g.lineTo(cx, 3);
    g.closePath();
    g.fillPath();

    // tail highlight
    g.fillStyle(hlColor, 0.3);
    g.beginPath();
    g.moveTo(cx, -1);
    g.lineTo(midX, tipTopY * 0.3 + midY);
    g.lineTo(tipX + 1, tipTopY * 0.5);
    g.lineTo(tipX + 2, midY);
    g.lineTo(cx, 1);
    g.closePath();
    g.fillPath();
  }

  private drawDeadBody() {
    const g = this.bodyGfx;
    g.clear();

    // gray body
    g.fillStyle(0x888888, 1);
    g.fillEllipse(0, 0, 40, 26);
    g.fillStyle(0x777777, 0.5);
    g.fillEllipse(0, -4, 36, 14);
    g.fillStyle(0x999999, 0.6);
    g.fillEllipse(2, 5, 28, 12);

    // dorsal fin — sharp pointed
    g.fillStyle(0x777777, 0.8);
    g.beginPath();
    g.moveTo(-4, -12);
    g.lineTo(-1, -24);
    g.lineTo(8, -12);
    g.closePath();
    g.fillPath();

    // pectoral fin
    g.fillStyle(0x808080, 0.7);
    g.fillEllipse(4, 8, 10, 6);

    // X eyes
    g.lineStyle(2, 0x333333, 1);
    // left X
    g.beginPath();
    g.moveTo(9, -6); g.lineTo(15, 0);
    g.moveTo(15, -6); g.lineTo(9, 0);
    g.strokePath();
  }

  private drawDeadTail() {
    const g = this.tailGfx;
    g.clear();

    const cx = -19;
    const len = 15;
    const spread = 12;

    g.fillStyle(0x888888, 0.9);
    g.beginPath();
    g.moveTo(cx, -3);
    g.lineTo(cx - len * 0.5, -spread * 0.5);
    g.lineTo(cx - len, -spread);
    g.lineTo(cx - len + 2, 0);
    g.lineTo(cx - len, spread);
    g.lineTo(cx - len * 0.5, spread * 0.5);
    g.lineTo(cx, 3);
    g.closePath();
    g.fillPath();
  }

  private pickNewTarget() {
    const { width, height } = this.scene.scale;
    const minY = this.margin;
    const maxY = height - this.sandHeight - this.margin;

    // near a wall? always turn back. otherwise 50/50 chance to turn around
    const nearLeftWall = this.container.x < this.margin + 60;
    const nearRightWall = this.container.x > width - this.margin - 60;
    let goRight: boolean;
    if (nearLeftWall) goRight = true;
    else if (nearRightWall) goRight = false;
    else goRight = Math.random() < 0.5 ? this.facingRight : !this.facingRight;

    const forwardDist = Phaser.Math.Between(80, 250);
    const rawX = goRight ? this.container.x + forwardDist : this.container.x - forwardDist;
    this.targetX = Phaser.Math.Clamp(rawX, this.margin, width - this.margin);

    // gentle vertical drift
    const yDrift = Phaser.Math.Between(-50, 50);
    this.targetY = Phaser.Math.Clamp(this.container.y + yDrift, minY, maxY);

    this.baseSpeed = Phaser.Math.FloatBetween(1.0, 3.0);
    this.wanderInterval = Phaser.Math.Between(2000, 4500);
  }

  private _nearestPelletResult = { x: 0, y: 0 };
  private findNearestPellet(): { x: number; y: number } | null {
    let found = false;
    let closestDist = Infinity;
    for (const p of this.scene.pellets) {
      if (p.consumed) continue;
      const dx = p.x - this.container.x;
      const dy = p.y - this.container.y;
      const d = dx * dx + dy * dy;
      if (d < closestDist) {
        closestDist = d;
        this._nearestPelletResult.x = p.x;
        this._nearestPelletResult.y = p.y;
        found = true;
      }
    }
    return found ? this._nearestPelletResult : null;
  }

  private tryEatPellet(): boolean {
    for (const p of this.scene.pellets) {
      if (p.consumed) continue;
      const dx = p.x - this.container.x;
      const dy = p.y - this.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 35) {
        p.consume();
        this.hungerTimer = MAX_HUNGER;
        this.onEatFood();
        this.drawBody();
        return true;
      }
    }
    return false;
  }

  private die() {
    if (this.dying) return;
    this.dying = true;
    this.dead = true;

    // draw gray dead appearance
    this.drawDeadBody();
    this.drawDeadTail();

    // flip upside-down and sink
    const sandY = this.scene.scale.height - this.sandHeight;
    this.scene.tweens.add({
      targets: this.container,
      angle: 180,
      y: sandY - 10,
      alpha: 0,
      duration: 2000,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.container.destroy();
        this.scene.removeDead();
      },
    });
  }

  update(delta: number) {
    if (this.dead) return;

    // always try to eat nearby food (triggers growth regardless of hunger mode)
    this.tryEatPellet();

    // hunger countdown (only if enabled)
    if (this.scene.hungerEnabled) {
      this.hungerTimer -= delta / 1000;
      if (this.hungerTimer <= 0) {
        this.hungerTimer = 0;
        this.die();
        return;
      }
    } else {
      // keep hunger full when disabled — no timers, no color changes
      this.hungerTimer = MAX_HUNGER;
    }

    // drop coins (babies don't drop; starving fish stop dropping when hunger is enabled)
    const dropType = this.getDropType();
    if (dropType && (!this.scene.hungerEnabled || !this.isStarving)) {
      this.coinTimer += delta;
      if (this.coinTimer >= this.coinInterval) {
        this.coinTimer = 0;
        this.coinInterval = Phaser.Math.Between(5000, 6000);
        this.dropCoin(dropType);
      }
    }

    // chase food if available, otherwise wander
    const pelletPos = this.findNearestPellet();
    if (pelletPos) {
      this.targetX = pelletPos.x;
      this.targetY = pelletPos.y;
      // speed depends on hunger urgency when hunger is enabled
      if (this.scene.hungerEnabled && this.isHungry) {
        this.baseSpeed = this.isDesperate ? 4.0 : this.isStarving ? 3.0 : 2.2;
      } else {
        this.baseSpeed = 2.0; // casual swim toward food
      }
    } else {
      this.wanderTimer += delta;
      if (this.wanderTimer >= this.wanderInterval) {
        this.wanderTimer = 0;
        this.pickNewTarget();
      }
    }

    const dx = this.targetX - this.container.x;
    const dy = this.targetY - this.container.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      this.speed = Phaser.Math.Linear(this.speed, this.baseSpeed, 0.03);

      const moveX = (dx / dist) * this.speed * (delta / 16);
      const moveY = (dy / dist) * this.speed * (delta / 16);
      this.container.x += moveX;
      this.container.y += moveY;

      // only change direction with meaningful horizontal movement to prevent flipping
      if (Math.abs(dx) > 5) {
        this.facingRight = dx > 0;
      }
    } else {
      // glide to a gentle stop, then the wander timer will pick a new target
      this.speed = Phaser.Math.Linear(this.speed, 0, 0.03);
    }

    const scale = STAGE_SCALE[this.growthStage];
    this.container.setScale(this.facingRight ? scale : -scale, scale);

    // gentle body tilt toward movement direction
    const tiltAngle = (dy / (dist || 1)) * 8;
    this.container.setAngle(this.facingRight ? tiltAngle : -tiltAngle);

    // tail flutter — proportional to swimming speed, only redraw when angle changes enough
    const speedRatio = Math.min(this.speed / 2.5, 1); // 0 to 1
    const tailSpeed = 0.003 + speedRatio * 0.015;
    const tailAmplitude = 0.15 + speedRatio * 0.55;
    this.tailPhase += tailSpeed * delta;
    const tailAngle = Math.sin(this.tailPhase) * tailAmplitude;
    if (Math.abs(tailAngle - this.lastTailAngle) > 0.02) {
      this.lastTailAngle = tailAngle;
      this.drawTail(tailAngle);
    }

    // only redraw body when hunger state changes
    const currentState = this.isDesperate ? 3 : this.isStarving ? 2 : this.isHungry ? 1 : 0;
    if (currentState !== this.lastHungerState) {
      this.lastHungerState = currentState;
      this.drawBody();
    }
  }

  /** Instantly kill this fish (e.g. eaten by alien). */
  kill() {
    this.die();
  }

  get x() { return this.container.x; }
  get y() { return this.container.y; }

  private dropCoin(type: CoinType) {
    new Coin(this.scene, this.container.x, this.container.y + 12, type);
  }
}
