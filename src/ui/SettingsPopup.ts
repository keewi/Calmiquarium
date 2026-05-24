import Phaser from 'phaser';
import { AquariumScene } from '../scenes/AquariumScene';

export class SettingsPopup {
  private scene: AquariumScene;
  private overlay: Phaser.GameObjects.Rectangle;
  private container: Phaser.GameObjects.Container;
  private confirmContainer: Phaser.GameObjects.Container;
  private visible = false;
  private confirming = false;

  constructor(scene: AquariumScene) {
    this.scene = scene;

    // overlay
    this.overlay = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5);
    this.overlay.setOrigin(0, 0);
    this.overlay.setInteractive();
    this.overlay.on('pointerdown', () => {
      if (this.confirming) return;
      this.hide();
    });

    // settings panel
    const panel = scene.add.graphics();
    panel.fillStyle(0x1a2a4a, 0.95);
    panel.fillRoundedRect(-140, -100, 280, 200, 16);
    panel.lineStyle(2, 0x4488cc, 1);
    panel.strokeRoundedRect(-140, -100, 280, 200, 16);

    const title = scene.add.text(0, -75, 'Settings', {
      fontSize: '26px', color: '#88ccff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const divider = scene.add.graphics();
    divider.lineStyle(1, 0x4488cc, 0.5);
    divider.lineBetween(-120, -50, 120, -50);

    // restart button
    const restartBg = scene.add.graphics();
    restartBg.fillStyle(0xaa3333, 0.9);
    restartBg.fillRoundedRect(-100, -20, 200, 50, 10);
    const restartText = scene.add.text(0, 5, 'Restart Game', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const restartZone = scene.add.rectangle(0, 5, 200, 50);
    restartZone.setInteractive({ useHandCursor: true });
    restartZone.on('pointerover', () => {
      restartBg.clear();
      restartBg.fillStyle(0xcc4444, 0.9);
      restartBg.fillRoundedRect(-100, -20, 200, 50, 10);
    });
    restartZone.on('pointerout', () => {
      restartBg.clear();
      restartBg.fillStyle(0xaa3333, 0.9);
      restartBg.fillRoundedRect(-100, -20, 200, 50, 10);
    });
    restartZone.on('pointerdown', () => this.showConfirm());

    // close button
    const closeBg = scene.add.graphics();
    closeBg.fillStyle(0x334466, 0.9);
    closeBg.fillRoundedRect(-100, 50, 200, 40, 10);
    const closeText = scene.add.text(0, 70, 'Close', {
      fontSize: '16px', color: '#aaccee', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const closeZone = scene.add.rectangle(0, 70, 200, 40);
    closeZone.setInteractive({ useHandCursor: true });
    closeZone.on('pointerover', () => {
      closeBg.clear();
      closeBg.fillStyle(0x445577, 0.9);
      closeBg.fillRoundedRect(-100, 50, 200, 40, 10);
    });
    closeZone.on('pointerout', () => {
      closeBg.clear();
      closeBg.fillStyle(0x334466, 0.9);
      closeBg.fillRoundedRect(-100, 50, 200, 40, 10);
    });
    closeZone.on('pointerdown', () => this.hide());

    this.container = scene.add.container(
      scene.scale.width / 2, scene.scale.height / 2,
      [panel, title, divider, restartBg, restartText, restartZone, closeBg, closeText, closeZone]
    );

    // confirmation dialog
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

    // yes button
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

    // no button
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

    this.confirmContainer = scene.add.container(
      scene.scale.width / 2, scene.scale.height / 2,
      [confirmPanel, confirmText, confirmDesc, yesBg, yesText, yesZone, noBg, noText, noZone]
    );

    this.overlay.setDepth(200);
    this.container.setDepth(201);
    this.confirmContainer.setDepth(202);

    this.overlay.setVisible(false);
    this.container.setVisible(false);
    this.confirmContainer.setVisible(false);

    scene.scale.on('resize', () => {
      this.overlay.setSize(scene.scale.width, scene.scale.height);
      this.container.setPosition(scene.scale.width / 2, scene.scale.height / 2);
      this.confirmContainer.setPosition(scene.scale.width / 2, scene.scale.height / 2);
    });
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
    this.scene.setShopOpen(false);
    this.confirmContainer.setVisible(false);
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

  private resetGame() {
    localStorage.removeItem('calmiquarium-save');
    window.location.reload();
  }
}
