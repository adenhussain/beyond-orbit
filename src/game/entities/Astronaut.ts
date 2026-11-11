import Phaser from 'phaser';
import { sound } from '../../services/sound';
import { NO_INPUT } from '../input';
import type { InputFrame } from '../input';

const WALK_SPEED = 210;
const SPRINT_SPEED = 340;

/**
 * The player character. Handles keyboard movement, jumping and choosing the
 * right animation. Scenes call `step()` once per frame.
 */
export class Astronaut extends Phaser.Physics.Arcade.Sprite {
  private keys: Record<'left' | 'right' | 'a' | 'd' | 'up' | 'w' | 'space' | 'shift', Phaser.Input.Keyboard.Key>;
  private jumpVelocity: number;
  private wasOnGround = true;
  private useUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, jumpVelocity: number) {
    super(scene, x, y, 'astro_idle0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.jumpVelocity = jumpVelocity;
    this.setOrigin(0.5, 1).setDepth(20).setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 58).setOffset(9, 8);
    body.setMaxVelocityY(900);

    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT), right: kb.addKey(K.RIGHT), a: kb.addKey(K.A), d: kb.addKey(K.D),
      up: kb.addKey(K.UP), w: kb.addKey(K.W), space: kb.addKey(K.SPACE), shift: kb.addKey(K.SHIFT),
    };
    this.play('idle');
  }

  /** Plays the short "reach out" animation used when interacting. */
  interact(): void {
    this.useUntil = this.scene.time.now + 280;
  }

  /** `extra` carries gamepad and touch input for this frame. */
  step(controlsEnabled: boolean, extra: InputFrame = NO_INPUT): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down || body.touching.down;
    const k = this.keys;

    let direction = 0;
    if (controlsEnabled) {
      if (k.left.isDown || k.a.isDown) direction -= 1;
      if (k.right.isDown || k.d.isDown) direction += 1;
      if (direction === 0) direction = extra.dir;
    }
    const sprinting = controlsEnabled && (k.shift.isDown || extra.sprint);
    const target = direction * (sprinting ? SPRINT_SPEED : WALK_SPEED);
    // Smooth acceleration, with less control in the air.
    const blend = onGround ? 0.3 : 0.08;
    body.setVelocityX(Phaser.Math.Linear(body.velocity.x, target, blend));
    if (direction !== 0) this.setFlipX(direction < 0);

    const jumpPressed = controlsEnabled &&
      (Phaser.Input.Keyboard.JustDown(k.space) || Phaser.Input.Keyboard.JustDown(k.up) || Phaser.Input.Keyboard.JustDown(k.w) || extra.jumpPressed);
    if (jumpPressed && onGround) {
      body.setVelocityY(this.jumpVelocity);
      sound.click();
    }

    // Landing: a quick squash so the astronaut feels like it has weight.
    if (onGround && !this.wasOnGround) {
      this.scene.tweens.add({ targets: this, scaleY: 0.86, scaleX: 1.1, duration: 70, yoyo: true });
      this.emit('land');
    }
    this.wasOnGround = onGround;

    let animation = 'idle';
    if (this.scene.time.now < this.useUntil) animation = 'use';
    else if (!onGround) animation = body.velocity.y < 0 ? 'jump' : 'fall';
    else if (Math.abs(body.velocity.x) > 250) animation = 'run';
    else if (Math.abs(body.velocity.x) > 20) animation = 'walk';
    if (this.anims.currentAnim?.key !== animation) this.play(animation);
  }
}
