import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';

export class SettingsPopup {
  private scene: AquariumScene;
  private overlay: Phaser.GameObjects.Rectangle;
  private container: Phaser.GameObjects.Container;
  private confirmContainer: Phaser.GameObjects.Container;
  private testingContainer: Phaser.GameObjects.Container;
  private visible = false;
  private confirming = false;
  private testingOpen = false;

  // testing mode state (pending changes before save)
  private pendingHunger = true;
  private hungerToggleBg!: Phaser.GameObjects.Graphics;
  private hungerToggleKnob!: Phaser.GameObjects.Arc;
  private hungerStatusText!: Phaser.GameObjects.Text;

  constructor(scene: AquariumScene) {
    this.scene = scene;
    this.pendingHunger = scene.hungerEnabled;

    // overlay
    this.overlay = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5);
    this.overlay.setOrigin(0, 0);
    this.overlay.setInteractive();
    this.overlay.on('pointerdown', () => {
      if (this.confirming || this.testingOpen) return;
      this.hide();
    });

    // --- main settings panel ---
    const panel = scene.add.graphics();
    panel.fillStyle(0x1a2a4a, 0.95);
    panel.fillRoundedRect(-160, -130, 320, 280, 16);
    panel.lineStyle(2, 0x4488cc, 1);
    panel.strokeRoundedRect(-160, -130, 320, 280, 16);

    const title = scene.add.text(0, -105, 'Settings', {
      fontSize: '26px', color: '#88ccff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const divider = scene.add.graphics();
    divider.lineStyle(1, 0x4488cc, 0.5);
    divider.lineBetween(-140, -75, 140, -75);

    // testing mode button
    const testBg = scene.add.graphics();
    testBg.fillStyle(0x2a4a6a, 0.9);
    testBg.fillRoundedRect(-120, -55, 240, 50, 10);
    const testIcon = scene.add.text(-100, -30, '🧪', { fontSize: '20px' }).setOrigin(0.5);
    const testText = scene.add.text(-10, -30, 'Testing Mode', {
      fontSize: '18px', color: '#aaddff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const testZone = scene.add.rectangle(0, -30, 240, 50);
    testZone.setInteractive({ useHandCursor: true });
    testZone.on('pointerover', () => {
      testBg.clear(); testBg.fillStyle(0x3a5a7a, 0.9); testBg.fillRoundedRect(-120, -55, 240, 50, 10);
    });
    testZone.on('pointerout', () => {
      testBg.clear(); testBg.fillStyle(0x2a4a6a, 0.9); testBg.fillRoundedRect(-120, -55, 240, 50, 10);
    });
    testZone.on('pointerdown', () => this.showTesting());

    // restart button
    const restartBg = scene.add.graphics();
    restartBg.fillStyle(0xaa3333, 0.9);
    restartBg.fillRoundedRect(-120, 15, 240, 50, 10);
    const restartText = scene.add.text(0, 40, 'Restart Game', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const restartZone = scene.add.rectangle(0, 40, 240, 50);
    restartZone.setInteractive({ useHandCursor: true });
    restartZone.on('pointerover', () => {
      restartBg.clear(); restartBg.fillStyle(0xcc4444, 0.9); restartBg.fillRoundedRect(-120, 15, 240, 50, 10);
    });
    restartZone.on('pointerout', () => {
      restartBg.clear(); restartBg.fillStyle(0xaa3333, 0.9); restartBg.fillRoundedRect(-120, 15, 240, 50, 10);
    });
    restartZone.on('pointerdown', () => this.showConfirm());

    // close button
    const closeBg = scene.add.graphics();
    closeBg.fillStyle(0x334466, 0.9);
    closeBg.fillRoundedRect(-120, 85, 240, 45, 10);
    const closeText = scene.add.text(0, 107, 'Close', {
      fontSize: '16px', color: '#aaccee', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const closeZone = scene.add.rectangle(0, 107, 240, 45);
    closeZone.setInteractive({ useHandCursor: true });
    closeZone.on('pointerover', () => {
      closeBg.clear(); closeBg.fillStyle(0x445577, 0.9); closeBg.fillRoundedRect(-120, 85, 240, 45, 10);
    });
    closeZone.on('pointerout', () => {
      closeBg.clear(); closeBg.fillStyle(0x334466, 0.9); closeBg.fillRoundedRect(-120, 85, 240, 45, 10);
    });
    closeZone.on('pointerdown', () => this.hide());

    this.container = scene.add.container(
      scene.scale.width / 2, scene.scale.height / 2,
      [panel, title, divider, testBg, testIcon, testText, testZone, restartBg, restartText, restartZone, closeBg, closeText, closeZone]
    );

    // --- confirmation dialog ---
    this.confirmContainer = this.createConfirmDialog(scene);

    // --- testing mode dialog ---
    this.testingContainer = this.createTestingDialog(scene);

    this.overlay.setDepth(200);
    this.container.setDepth(201);
    this.confirmContainer.setDepth(202);
    this.testingContainer.setDepth(202);

    this.overlay.setVisible(false);
    this.container.setVisible(false);
    this.confirmContainer.setVisible(false);
    this.testingContainer.setVisible(false);

    scene.scale.on('resize', () => {
      this.overlay.setSize(scene.scale.width, scene.scale.height);
      this.container.setPosition(scene.scale.width / 2, scene.scale.height / 2);
      this.confirmContainer.setPosition(scene.scale.width / 2, scene.scale.height / 2);
      this.testingContainer.setPosition(scene.scale.width / 2, scene.scale.height / 2);
    });
  }

  private createConfirmDialog(scene: AquariumScene): Phaser.GameObjects.Container {
    const confirmPanel = scene.add.graphics();
    confirmPanel.fillStyle(0x1a2a4a, 0.98);
    confirmPanel.fillRoundedRect(-150, -80, 300, 160, 16);
    confirmPanel.lineStyle(2, 0xcc4444, 1);
    confirmPanel.strokeRoundedRect(-150, -80, 300, 160, 16);

    const confirmText = scene.add.text(0, -50, 'Are you sure?', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const confirmDesc = scene.add.text(0, -20, 'All progress will be lost.', {
      fontSize: '14px', color: '#aaaacc', fontFamily: 'Arial',
    }).setOrigin(0.5);

    const yesBg = scene.add.graphics();
    yesBg.fillStyle(0xaa3333, 0.9);
    yesBg.fillRoundedRect(-130, 15, 125, 45, 10);
    const yesText = scene.add.text(-68, 37, 'Restart', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const yesZone = scene.add.rectangle(-68, 37, 125, 45);
    yesZone.setInteractive({ useHandCursor: true });
    yesZone.on('pointerover', () => {
      yesBg.clear(); yesBg.fillStyle(0xcc4444, 0.9); yesBg.fillRoundedRect(-130, 15, 125, 45, 10);
    });
    yesZone.on('pointerout', () => {
      yesBg.clear(); yesBg.fillStyle(0xaa3333, 0.9); yesBg.fillRoundedRect(-130, 15, 125, 45, 10);
    });
    yesZone.on('pointerdown', () => this.resetGame());

    const noBg = scene.add.graphics();
    noBg.fillStyle(0x334466, 0.9);
    noBg.fillRoundedRect(5, 15, 125, 45, 10);
    const noText = scene.add.text(68, 37, 'Cancel', {
      fontSize: '18px', color: '#aaccee', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const noZone = scene.add.rectangle(68, 37, 125, 45);
    noZone.setInteractive({ useHandCursor: true });
    noZone.on('pointerover', () => {
      noBg.clear(); noBg.fillStyle(0x445577, 0.9); noBg.fillRoundedRect(5, 15, 125, 45, 10);
    });
    noZone.on('pointerout', () => {
      noBg.clear(); noBg.fillStyle(0x334466, 0.9); noBg.fillRoundedRect(5, 15, 125, 45, 10);
    });
    noZone.on('pointerdown', () => this.hideConfirm());

    return scene.add.container(
      scene.scale.width / 2, scene.scale.height / 2,
      [confirmPanel, confirmText, confirmDesc, yesBg, yesText, yesZone, noBg, noText, noZone]
    );
  }

  private createTestingDialog(scene: AquariumScene): Phaser.GameObjects.Container {
    const panel = scene.add.graphics();
    panel.fillStyle(0x1a2a4a, 0.98);
    panel.fillRoundedRect(-160, -110, 320, 220, 16);
    panel.lineStyle(2, 0x44aacc, 1);
    panel.strokeRoundedRect(-160, -110, 320, 220, 16);

    const title = scene.add.text(0, -85, '🧪 Testing Mode', {
      fontSize: '22px', color: '#88ddff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const divider = scene.add.graphics();
    divider.lineStyle(1, 0x44aacc, 0.5);
    divider.lineBetween(-140, -60, 140, -60);

    // --- Hunger toggle ---
    const hungerLabel = scene.add.text(-120, -30, 'Hunger', {
      fontSize: '18px', color: '#ccddee', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // toggle switch
    this.hungerToggleBg = scene.add.graphics();
    this.hungerToggleKnob = scene.add.circle(0, -30, 10, 0xffffff, 1);

    this.hungerStatusText = scene.add.text(130, -30, 'ON', {
      fontSize: '13px', color: '#66cc88', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this.drawToggle(this.pendingHunger);

    const toggleZone = scene.add.rectangle(95, -30, 50, 28);
    toggleZone.setInteractive({ useHandCursor: true });
    toggleZone.on('pointerdown', () => {
      this.pendingHunger = !this.pendingHunger;
      this.drawToggle(this.pendingHunger);
    });

    // --- Save button ---
    const saveBg = scene.add.graphics();
    saveBg.fillStyle(0x22aa44, 0.9);
    saveBg.fillRoundedRect(-140, 30, 135, 50, 10);
    const saveText = scene.add.text(-72, 55, 'Save', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const saveZone = scene.add.rectangle(-72, 55, 135, 50);
    saveZone.setInteractive({ useHandCursor: true });
    saveZone.on('pointerover', () => {
      saveBg.clear(); saveBg.fillStyle(0x33cc55, 0.9); saveBg.fillRoundedRect(-140, 30, 135, 50, 10);
    });
    saveZone.on('pointerout', () => {
      saveBg.clear(); saveBg.fillStyle(0x22aa44, 0.9); saveBg.fillRoundedRect(-140, 30, 135, 50, 10);
    });
    saveZone.on('pointerdown', () => this.saveTestingMode());

    // --- Cancel button ---
    const cancelBg = scene.add.graphics();
    cancelBg.fillStyle(0x334466, 0.9);
    cancelBg.fillRoundedRect(5, 30, 135, 50, 10);
    const cancelText = scene.add.text(72, 55, 'Cancel', {
      fontSize: '18px', color: '#aaccee', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const cancelZone = scene.add.rectangle(72, 55, 135, 50);
    cancelZone.setInteractive({ useHandCursor: true });
    cancelZone.on('pointerover', () => {
      cancelBg.clear(); cancelBg.fillStyle(0x445577, 0.9); cancelBg.fillRoundedRect(5, 30, 135, 50, 10);
    });
    cancelZone.on('pointerout', () => {
      cancelBg.clear(); cancelBg.fillStyle(0x334466, 0.9); cancelBg.fillRoundedRect(5, 30, 135, 50, 10);
    });
    cancelZone.on('pointerdown', () => this.cancelTestingMode());

    return scene.add.container(
      scene.scale.width / 2, scene.scale.height / 2,
      [panel, title, divider, hungerLabel, this.hungerToggleBg, this.hungerToggleKnob, this.hungerStatusText, toggleZone, saveBg, saveText, saveZone, cancelBg, cancelText, cancelZone]
    );
  }

  private drawToggle(on: boolean) {
    const g = this.hungerToggleBg;
    g.clear();

    const x = 80;
    const y = -30;
    const w = 44;
    const h = 24;
    const r = h / 2;

    // track
    g.fillStyle(on ? 0x33aa55 : 0x555566, 0.9);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    g.lineStyle(1.5, on ? 0x44cc66 : 0x666677, 0.6);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);

    // knob position
    const knobX = on ? x + w / 2 - r - 1 : x - w / 2 + r + 1;
    this.hungerToggleKnob.setPosition(knobX, y);

    // status text
    this.hungerStatusText.setText(on ? 'ON' : 'OFF');
    this.hungerStatusText.setColor(on ? '#66cc88' : '#aa6666');
  }

  show() {
    if (this.visible) return;
    this.visible = true;
    this.scene.setShopOpen(true);
    this.overlay.setVisible(true);
    this.container.setVisible(true);
    this.container.setScale(0.8);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container, scaleX: 1, scaleY: 1, alpha: 1, duration: 200, ease: 'Back.easeOut',
    });
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.confirming = false;
    this.testingOpen = false;
    this.scene.setShopOpen(false);
    this.confirmContainer.setVisible(false);
    this.testingContainer.setVisible(false);
    this.scene.tweens.add({
      targets: this.container, scaleX: 0.8, scaleY: 0.8, alpha: 0, duration: 150, ease: 'Quad.easeIn',
      onComplete: () => {
        this.overlay.setVisible(false);
        this.container.setVisible(false);
      },
    });
  }

  private showConfirm() {
    this.confirming = true;
    this.confirmContainer.setVisible(true);
    this.confirmContainer.setScale(0.8);
    this.confirmContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.confirmContainer, scaleX: 1, scaleY: 1, alpha: 1, duration: 200, ease: 'Back.easeOut',
    });
  }

  private hideConfirm() {
    this.confirming = false;
    this.scene.tweens.add({
      targets: this.confirmContainer, scaleX: 0.8, scaleY: 0.8, alpha: 0, duration: 150, ease: 'Quad.easeIn',
      onComplete: () => this.confirmContainer.setVisible(false),
    });
  }

  private showTesting() {
    this.testingOpen = true;
    this.pendingHunger = this.scene.hungerEnabled;
    this.drawToggle(this.pendingHunger);
    this.testingContainer.setVisible(true);
    this.testingContainer.setScale(0.8);
    this.testingContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.testingContainer, scaleX: 1, scaleY: 1, alpha: 1, duration: 200, ease: 'Back.easeOut',
    });
  }

  private saveTestingMode() {
    this.scene.hungerEnabled = this.pendingHunger;
    this.hideTesting();
  }

  private cancelTestingMode() {
    this.pendingHunger = this.scene.hungerEnabled;
    this.drawToggle(this.pendingHunger);
    this.hideTesting();
  }

  private hideTesting() {
    this.testingOpen = false;
    this.scene.tweens.add({
      targets: this.testingContainer, scaleX: 0.8, scaleY: 0.8, alpha: 0, duration: 150, ease: 'Quad.easeIn',
      onComplete: () => this.testingContainer.setVisible(false),
    });
  }

  private resetGame() {
    localStorage.removeItem('calmiquarium-save');
    window.location.reload();
  }
}
