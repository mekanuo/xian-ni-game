import Phaser from 'phaser';
import './style.css';
import { WorldScene } from './game/scene';
import { display, measureDisplay } from './game/display';

const size=measureDisplay();
const game=new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: size.width,
  height: size.height,
  backgroundColor: '#a9bb9c',
  scale: { mode: Phaser.Scale.NONE, zoom:1/display.density, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
  scene: WorldScene,
  input: { keyboard: true, mouse: { preventDefaultWheel: false } },
});
window.addEventListener('resize',()=>{
  const next=measureDisplay();
  game.scale.setZoom(1/display.density);
  game.scale.resize(next.width,next.height);
});
