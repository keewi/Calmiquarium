import Phaser from 'phaser';
import { AquariumScene } from './scenes/AquariumScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#0a1628',
  scene: [AquariumScene],
};

new Phaser.Game(config);
