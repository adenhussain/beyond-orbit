import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { ExplorationScene } from '../scenes/ExplorationScene';
import { InteriorScene } from '../scenes/InteriorScene';

export type StartScene = 'exploration' | 'interior';

/** Creates the Phaser game inside `parent` and starts the given scene. */
export function createGame(parent: HTMLElement, startScene: StartScene): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: '#03060c',
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 800 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: false, roundPixels: true },
    audio: { noAudio: true }, // sound effects use the small Web Audio service instead
    callbacks: { preBoot: (game) => game.registry.set('startScene', startScene) },
    scene: [BootScene, ExplorationScene, InteriorScene],
  });
}
