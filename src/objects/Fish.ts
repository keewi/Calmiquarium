import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';
import { Coin } from './Coin';

const MAX_HUNGER = 45;          // seconds when fully fed
const HUNGRY_THRESHOLD = 25;    // still orange, chases food, still drops coins
const STARVING_THRESHOLD = 15;  // turns green, stops dropping coins
const DESPERATE_THRESHOLD = 4;  // turns purple, last chance

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
  private coinInterval = 10000;
  private tailPhase = Math.random() * Math.PI * 2;
  private facingRight = true;

  private margin = 60;
  private sandHeight = 60;

  // hunger system
  private hungerTimer = MAX_HUNGER;
  dead = false;
  private dying = false;

  constructor(scene: AquariumScene, x: number, y: number) {
    this.scene = scene;

    this.tailGfx = scene.add.graphics();
    this.bodyGfx = scene.add.graphics();
    this.drawBody();
    this.drawTail(0);

    this.container = scene.add.container(x, y, [this.tailGfx, this.bodyGfx]);
    this.container.setDepth(10);
    this.container.setScale(0);

    scene.tweens.add({
      targets: this.container,
      scaleX: 1.4,
      scaleY: 1.4,
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
    return null; // hungry but still orange, or fully fed
  }

  private drawBody() {
    const g = this.bodyGfx;
    g.clear();

    const tint = this.getHungerTint();

    // color helpers — blend base color toward tint
    const baseOrange = 0xff8c00;
    const darkOrange = 0xe07800;
    const bellyYellow = 0xffcc44;
    const finOrange = 0xff7800;
    const finHighlight = 0xffa848;
    const sideFinColor = 0xff9030;

    const body = tint ? Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(baseOrange),
      Phaser.Display.Color.IntegerToColor(tint), 100, 60
    ) : null;
    const bodyColor = body ? Phaser.Display.Color.GetColor(body.r, body.g, body.b) : baseOrange;

    const dark = tint ? Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(darkOrange),
      Phaser.Display.Color.IntegerToColor(tint), 100, 60
    ) : null;
    const darkColor = dark ? Phaser.Display.Color.GetColor(dark.r, dark.g, dark.b) : darkOrange;

    const belly = tint ? Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(bellyYellow),
      Phaser.Display.Color.IntegerToColor(tint), 100, 40
    ) : null;
    const bellyColor = belly ? Phaser.Display.Color.GetColor(belly.r, belly.g, belly.b) : bellyYellow;

    const fin = tint ? Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(finOrange),
      Phaser.Display.Color.IntegerToColor(tint), 100, 60
    ) : null;
    const finColor = fin ? Phaser.Display.Color.GetColor(fin.r, fin.g, fin.b) : finOrange;

    const finH = tint ? Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(finHighlight),
      Phaser.Display.Color.IntegerToColor(tint), 100, 40
    ) : null;
    const finHColor = finH ? Phaser.Display.Color.GetColor(finH.r, finH.g, finH.b) : finHighlight;

    const sideF = tint ? Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(sideFinColor),
      Phaser.Display.Color.IntegerToColor(tint), 100, 60
    ) : null;
    const sideFColor = sideF ? Phaser.Display.Color.GetColor(sideF.r, sideF.g, sideF.b) : sideFinColor;

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

    // dorsal fin
    g.fillStyle(finColor, 0.8);
    g.beginPath();
    g.moveTo(-4, -12);
    g.lineTo(0, -20);
    g.lineTo(6, -18);
    g.lineTo(8, -12);
    g.closePath();
    g.fillPath();
    // fin highlight
    g.fillStyle(finHColor, 0.5);
    g.beginPath();
    g.moveTo(-1, -13);
    g.lineTo(1, -17);
    g.lineTo(5, -16);
    g.lineTo(5, -13);
    g.closePath();
    g.fillPath();

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

  private drawTail(angle: number) {
    const g = this.tailGfx;
    g.clear();

    const tint = this.getHungerTint();

    const baseTail = 0xffa040;
    const baseHighlight = 0xffcc66;

    const tail = tint ? Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(baseTail),
      Phaser.Display.Color.IntegerToColor(tint), 100, 60
    ) : null;
    const tailColor = tail ? Phaser.Display.Color.GetColor(tail.r, tail.g, tail.b) : baseTail;

    const hl = tint ? Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(baseHighlight),
      Phaser.Display.Color.IntegerToColor(tint), 100, 40
    ) : null;
    const hlColor = hl ? Phaser.Display.Color.GetColor(hl.r, hl.g, hl.b) : baseHighlight;

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

    // dorsal fin
    g.fillStyle(0x777777, 0.8);
    g.beginPath();
    g.moveTo(-4, -12);
    g.lineTo(0, -20);
    g.lineTo(6, -18);
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

  private findNearestPellet(): { x: number; y: number } | null {
    const pellets = this.scene.pellets.filter(p => !p.consumed);
    if (pellets.length === 0) return null;

    let closest = pellets[0];
    let closestDist = Infinity;
    for (const p of pellets) {
      const dx = p.x - this.container.x;
      const dy = p.y - this.container.y;
      const d = dx * dx + dy * dy;
      if (d < closestDist) {
        closestDist = d;
        closest = p;
      }
    }
    return { x: closest.x, y: closest.y };
  }

  private tryEatPellet(): boolean {
    const pellets = this.scene.pellets.filter(p => !p.consumed);
    for (const p of pellets) {
      const dx = p.x - this.container.x;
      const dy = p.y - this.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 35) {
        p.consume();
        this.hungerTimer = MAX_HUNGER;
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

    // hunger countdown
    this.hungerTimer -= delta / 1000;
    if (this.hungerTimer <= 0) {
      this.hungerTimer = 0;
      this.die();
      return;
    }

    // try to eat nearby pellets when hungry
    if (this.isHungry) {
      this.tryEatPellet();
    }

    // drop coins when not starving (hungry fish still drop coins)
    if (!this.isStarving) {
      this.coinTimer += delta;
      if (this.coinTimer >= this.coinInterval) {
        this.coinTimer = 0;
        this.dropCoin();
      }
    }

    // chase food when hungry, otherwise wander
    if (this.isHungry) {
      const pelletPos = this.findNearestPellet();
      if (pelletPos) {
        this.targetX = pelletPos.x;
        this.targetY = pelletPos.y;
        this.baseSpeed = this.isDesperate ? 4.0 : this.isStarving ? 3.0 : 2.2;
      } else {
        // wander normally even when hungry (no food available)
        this.wanderTimer += delta;
        if (this.wanderTimer >= this.wanderInterval) {
          this.wanderTimer = 0;
          this.pickNewTarget();
        }
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

    this.container.setScale(this.facingRight ? 1.4 : -1.4, 1.4);

    // gentle body tilt toward movement direction
    const tiltAngle = (dy / (dist || 1)) * 8;
    this.container.setAngle(this.facingRight ? tiltAngle : -tiltAngle);

    // tail flutter — proportional to swimming speed
    const speedRatio = Math.min(this.speed / 2.5, 1); // 0 to 1
    const tailSpeed = 0.003 + speedRatio * 0.015;
    const tailAmplitude = 0.15 + speedRatio * 0.55;
    this.tailPhase += tailSpeed * delta;
    this.drawTail(Math.sin(this.tailPhase) * tailAmplitude);

    // redraw body for hunger color changes (only when near threshold boundaries)
    this.drawBody();
  }

  private dropCoin() {
    new Coin(this.scene, this.container.x, this.container.y + 12);
  }
}
