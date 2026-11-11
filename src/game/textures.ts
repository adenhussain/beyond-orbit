import Phaser from 'phaser';
import { RESOURCES } from '../data/resources';
import type { ResourceId } from '../types/resources';

/**
 * All artwork is drawn in code and turned into textures at start-up, so the
 * game needs no image files. Replace any of these with real sprites later by
 * loading an image under the same texture key.
 */

const U = 3; // size of one "pixel" of the astronaut, in screen pixels

interface Pose {
  bob: number; // upper body offset (idle breathing)
  left: [dx: number, lift: number];
  right: [dx: number, lift: number];
  arm: 'down' | 'forward' | 'up';
}

function drawAstronaut(g: Phaser.GameObjects.Graphics, pose: Pose): void {
  const px = (x: number, y: number, w: number, h: number, color: number) => {
    g.fillStyle(color, 1);
    g.fillRect(x * U, y * U, w * U, h * U);
  };
  const b = pose.bob;
  // life-support backpack
  px(1, 8 + b, 3, 8, 0x76879a);
  px(1, 8 + b, 3, 1, 0xb5c3d1);
  px(0, 10 + b, 1, 3, 0x4a5a6b);
  // legs and boots
  const leg = (x: number, [dx, lift]: [number, number], shade: number) => {
    px(x + dx, 16, 3, 4 - lift, shade);
    px(x + dx, 20 - lift, 4, 2, 0x2f3b48);
  };
  leg(4, pose.left, 0xcfd9e2);
  leg(8, pose.right, 0xe6edf3);
  // torso
  px(3, 8 + b, 8, 8, 0xeef3f7);
  px(3, 14 + b, 8, 1, 0xff8c42);
  px(7, 10 + b, 3, 2, 0x5dfc9a);
  px(3, 8 + b, 1, 8, 0xc9d4de);
  // helmet with visor (the astronaut faces right)
  px(3, 1 + b, 9, 7, 0xf7fafc);
  px(4, 0 + b, 7, 1, 0xf7fafc);
  px(6, 3 + b, 6, 4, 0x10283c);
  px(10, 3 + b, 1, 1, 0x74d4ff);
  px(7, 6 + b, 2, 1, 0x1d4a6b);
  // arm
  if (pose.arm === 'down') {
    px(5, 9 + b, 3, 5, 0xd5dee6);
    px(5, 13 + b, 3, 2, 0x2f3b48);
  } else if (pose.arm === 'forward') {
    px(7, 9 + b, 5, 3, 0xd5dee6);
    px(12, 9 + b, 2, 3, 0x2f3b48);
  } else {
    px(8, 5 + b, 3, 5, 0xd5dee6);
    px(8, 4 + b, 3, 2, 0x2f3b48);
  }
}

const POSES: Record<string, Pose> = {
  astro_idle0: { bob: 0, left: [0, 0], right: [0, 0], arm: 'down' },
  astro_idle1: { bob: 1, left: [0, 0], right: [0, 0], arm: 'down' },
  astro_walk0: { bob: 0, left: [-1, 0], right: [1, 1], arm: 'down' },
  astro_walk1: { bob: 1, left: [0, 0], right: [0, 0], arm: 'down' },
  astro_walk2: { bob: 0, left: [1, 1], right: [-1, 0], arm: 'down' },
  astro_walk3: { bob: 1, left: [0, 0], right: [0, 0], arm: 'down' },
  astro_jump: { bob: 0, left: [0, 1], right: [1, 2], arm: 'up' },
  astro_fall: { bob: 0, left: [-1, 0], right: [1, 0], arm: 'forward' },
  astro_use: { bob: 0, left: [0, 0], right: [0, 0], arm: 'forward' },
};

function resourceGlyph(g: Phaser.GameObjects.Graphics, id: ResourceId, color: number): void {
  g.fillStyle(0x0a1522, 1);
  g.fillRect(0, 0, 32, 32);
  g.lineStyle(2, color, 1);
  g.strokeRect(1, 1, 30, 30);
  g.fillStyle(color, 1);
  switch (id) {
    case 'structural': g.fillRect(7, 8, 18, 4); g.fillRect(14, 8, 4, 16); g.fillRect(7, 20, 18, 4); break;
    case 'electronics': g.fillRect(10, 10, 12, 12); for (const p of [8, 14, 20]) { g.fillRect(p + 1, 6, 2, 4); g.fillRect(p + 1, 22, 2, 4); } break;
    case 'power': g.fillTriangle(18, 5, 9, 18, 16, 18); g.fillTriangle(14, 27, 23, 14, 16, 14); break;
    case 'fuel': g.fillRect(11, 9, 10, 16); g.fillRect(13, 6, 6, 3); break;
    case 'thermal': for (const y of [8, 13, 18, 23]) g.fillRect(7, y, 18, 2); break;
    case 'comms': g.fillTriangle(8, 10, 24, 10, 16, 20); g.fillRect(15, 18, 2, 8); g.fillRect(11, 25, 10, 2); break;
    case 'science': g.fillRect(14, 6, 4, 8); g.fillTriangle(8, 26, 24, 26, 16, 12); break;
    case 'repair': g.fillRect(13, 7, 6, 18); g.fillRect(7, 13, 18, 6); break;
  }
}

function groundTile(g: Phaser.GameObjects.Graphics, base: number, dark: number, light: number): void {
  g.fillStyle(base, 1);
  g.fillRect(0, 0, 64, 64);
  g.fillStyle(light, 1);
  g.fillRect(0, 0, 64, 4);
  g.fillStyle(dark, 1);
  for (const [x, y, w] of [[6, 14, 10], [30, 24, 14], [50, 12, 6], [14, 40, 18], [44, 46, 10], [4, 56, 8]]) {
    g.fillRect(x, y, w, 4);
  }
  g.fillStyle(light, 0.5);
  for (const [x, y] of [[22, 10], [56, 34], [10, 30], [38, 54]]) g.fillRect(x, y, 3, 2);
}

/** Creates every texture and animation. Safe to call once per Phaser game. */
export function createTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const make = (key: string, w: number, h: number, draw: () => void) => {
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };

  for (const [key, pose] of Object.entries(POSES)) {
    make(key, 14 * U, 22 * U, () => drawAstronaut(g, pose));
  }
  for (const r of RESOURCES) make(`res_${r.id}`, 32, 32, () => resourceGlyph(g, r.id, r.color));

  make('ground_lunar', 64, 64, () => groundTile(g, 0x4a515c, 0x363c45, 0x7b8693));
  make('ground_mars', 64, 64, () => groundTile(g, 0x8a3f25, 0x662c18, 0xc46a43));
  make('platform', 64, 20, () => {
    g.fillStyle(0x24364a, 1); g.fillRect(0, 0, 64, 20);
    g.fillStyle(0x5d7892, 1); g.fillRect(0, 0, 64, 3);
    g.fillStyle(0x121c28, 1); g.fillRect(0, 16, 64, 4);
    g.fillStyle(0xffb547, 1); g.fillRect(4, 7, 3, 3); g.fillRect(57, 7, 3, 3);
  });
  make('deck', 64, 24, () => {
    g.fillStyle(0x1b2a3a, 1); g.fillRect(0, 0, 64, 24);
    g.fillStyle(0x4c6680, 1); g.fillRect(0, 0, 64, 3);
    g.fillStyle(0x0d1620, 1); g.fillRect(0, 10, 64, 2); g.fillRect(31, 3, 2, 21);
  });
  make('vent', 44, 14, () => {
    g.fillStyle(0x24364a, 1); g.fillRect(0, 4, 44, 10);
    g.fillStyle(0xffb547, 1); for (let x = 2; x < 44; x += 12) g.fillRect(x, 0, 6, 4);
  });
  make('jet', 28, 120, () => {
    g.fillStyle(0xd9f1ff, 0.25); g.fillRect(0, 0, 28, 120);
    g.fillStyle(0xd9f1ff, 0.45); g.fillRect(6, 0, 16, 120);
    g.fillStyle(0xffffff, 0.7); g.fillRect(11, 0, 6, 120);
  });
  make('devil', 48, 110, () => {
    for (let i = 0; i < 11; i++) {
      const w = 10 + i * 3.4;
      g.fillStyle(i % 2 ? 0xd98a5a : 0xb5653a, 0.75);
      g.fillRect(24 - w / 2 + (i % 3) * 2 - 2, 110 - (i + 1) * 10, w, 9);
    }
  });
  make('o2station', 40, 76, () => {
    g.fillStyle(0x1b2a3a, 1); g.fillRect(4, 10, 32, 66);
    g.lineStyle(2, 0x74d4ff, 1); g.strokeRect(4, 10, 32, 66);
    g.fillStyle(0x74d4ff, 1); g.fillRect(12, 0, 16, 10); g.fillRect(10, 22, 20, 14);
    g.fillStyle(0x0a1522, 1); g.fillRect(13, 25, 14, 8);
    g.fillStyle(0x5dfc9a, 1); g.fillRect(12, 46, 16, 4); g.fillRect(12, 54, 10, 4);
  });
  make('console', 56, 64, () => {
    g.fillStyle(0x1b2a3a, 1); g.fillRect(4, 22, 48, 42);
    g.fillStyle(0x0d1620, 1); g.fillRect(0, 0, 56, 26);
    g.lineStyle(2, 0x4c6680, 1); g.strokeRect(1, 1, 54, 24);
    g.fillStyle(0x5dfc9a, 1); g.fillRect(6, 6, 26, 3); g.fillRect(6, 12, 18, 3); g.fillRect(6, 18, 22, 2);
    g.fillStyle(0xffb547, 1); g.fillRect(40, 6, 8, 8);
    g.fillStyle(0x4c6680, 1); for (let x = 10; x < 48; x += 10) g.fillRect(x, 34, 6, 4);
  });
  make('door', 14, 150, () => {
    g.fillStyle(0x2c4259, 1); g.fillRect(0, 0, 14, 150);
    g.fillStyle(0x5d7892, 1); g.fillRect(0, 0, 3, 150);
    g.fillStyle(0xffb547, 1); for (let y = 10; y < 150; y += 28) g.fillRect(5, y, 6, 10);
  });
  make('dot', 6, 6, () => { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 6, 6); });
  g.destroy();

  const frames = (keys: string[]) => keys.map((key) => ({ key }));
  const anims = scene.anims;
  if (!anims.exists('idle')) {
    anims.create({ key: 'idle', frames: frames(['astro_idle0', 'astro_idle1']), frameRate: 2, repeat: -1 });
    anims.create({ key: 'walk', frames: frames(['astro_walk0', 'astro_walk1', 'astro_walk2', 'astro_walk3']), frameRate: 9, repeat: -1 });
    anims.create({ key: 'run', frames: frames(['astro_walk0', 'astro_walk1', 'astro_walk2', 'astro_walk3']), frameRate: 15, repeat: -1 });
    anims.create({ key: 'jump', frames: frames(['astro_jump']), frameRate: 1 });
    anims.create({ key: 'fall', frames: frames(['astro_fall']), frameRate: 1 });
    anims.create({ key: 'use', frames: frames(['astro_use']), frameRate: 1 });
  }
}
