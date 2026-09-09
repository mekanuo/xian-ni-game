import Phaser from 'phaser';
import './style.css';
import { WorldScene } from './game/scene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#a9bb9c',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
  scene: WorldScene,
  input: { keyboard: true, mouse: { preventDefaultWheel: false } },
});
