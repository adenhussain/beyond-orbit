import Phaser from 'phaser';
import { createTextures } from '../textures';

/** Builds all textures and animations, then starts the requested scene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    createTextures(this);
    this.scene.start(this.registry.get('startScene') as string);
  }
}
