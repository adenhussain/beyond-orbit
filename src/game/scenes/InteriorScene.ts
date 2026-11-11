import Phaser from 'phaser';
import { getChallenge } from '../../engine/challengeManager';
import { sound } from '../../services/sound';
import type { RoomId } from '../../types/resources';
import type { Timeline } from '../../types/timeline';
import { bridge } from '../bridge';
import { pollInput } from '../input';
import { worldPalette } from '../palette';
import { Astronaut } from '../entities/Astronaut';
import { ROOMS, SHIP, SHIP_WIDTH, getRoom, roomAt } from '../maps/spacecraftMap';

const VIEW_W = 1280;
const VIEW_H = 720;
const MONO = '"Share Tech Mono", monospace';

/**
 * PHASE: IN-FLIGHT. The astronaut walks through the spacecraft's six rooms.
 * When the engine raises a challenge, the affected room goes to red alert and
 * the astronaut must physically reach its console and press E to respond.
 * All mission rules live in the engine; this scene shows them and sends input.
 */
export class InteriorScene extends Phaser.Scene {
  private player!: Astronaut;
  private prompt!: Phaser.GameObjects.Text;
  private guide!: Phaser.GameObjects.Text;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private doors: { x: number; top: Phaser.GameObjects.Image; open: boolean }[] = [];
  private alarms = new Map<RoomId, Phaser.GameObjects.Rectangle>();
  private beacons = new Map<RoomId, Phaser.GameObjects.Rectangle>();
  private dimmer!: Phaser.GameObjects.Rectangle;
  private planet!: Phaser.GameObjects.Arc;
  private streaks: Phaser.GameObjects.Rectangle[] = [];
  private alarmRoom: RoomId | null = null;
  private hudTimer = 0;
  private sparkTimer = 0;

  constructor() {
    super('interior');
  }

  private get timeline(): Timeline | null {
    const { timelines, activeTimelineId } = bridge.state;
    return timelines.find((t) => t.id === activeTimelineId) ?? null;
  }

  create(): void {
    this.doors = [];
    this.alarms.clear();
    this.beacons.clear();
    this.streaks = [];
    this.alarmRoom = null;

    this.physics.world.gravity.y = SHIP.gravity;
    this.physics.world.setBounds(SHIP.startX, 0, SHIP_WIDTH - SHIP.startX * 2, VIEW_H);
    this.cameras.main.setBounds(0, 0, SHIP_WIDTH, VIEW_H);

    this.drawSpace();
    this.drawHull();
    for (const room of ROOMS) this.drawRoom(room);
    this.buildDoors();

    // Deck the astronaut walks on.
    const floor = this.add.zone(SHIP_WIDTH / 2, SHIP.floorY + 40, SHIP_WIDTH, 80);
    this.physics.add.existing(floor, true);
    this.add.tileSprite(SHIP.startX, SHIP.floorY, SHIP_WIDTH - SHIP.startX * 2, 24, 'deck').setOrigin(0, 0).setDepth(6);

    const command = getRoom('command');
    this.player = new Astronaut(this, command.x + 170, SHIP.floorY - 2, SHIP.jumpVelocity);
    this.physics.add.collider(this.player, floor);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 90);

    // Power-loss dimming over the whole ship.
    this.dimmer = this.add.rectangle(0, 0, SHIP_WIDTH, VIEW_H, 0x000000, 0).setOrigin(0).setDepth(40);

    this.prompt = this.add.text(0, 0, '', {
      fontFamily: MONO, fontSize: '16px', color: '#5dfc9a', backgroundColor: '#03060cdd', padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setDepth(50).setVisible(false);
    this.guide = this.add.text(VIEW_W / 2, 668, '', {
      fontFamily: MONO, fontSize: '18px', color: '#ff4f4f', backgroundColor: '#03060cee', padding: { x: 14, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60).setVisible(false);
    this.tweens.add({ targets: this.guide, alpha: 0.55, duration: 450, yoyo: true, repeat: -1 });

    const kb = this.input.keyboard!;
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.cameras.main.fadeIn(600, 3, 6, 12);
  }

  // ---------------------------------------------------------------- drawing

  private drawSpace(): void {
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x02040a).setOrigin(0).setScrollFactor(0).setDepth(-30);
    const rng = new Phaser.Math.RandomDataGenerator(['ship']);
    const stars = this.add.graphics().setScrollFactor(0.05).setDepth(-29);
    for (let i = 0; i < 180; i++) {
      stars.fillStyle(0xffffff, rng.realInRange(0.2, 0.9));
      stars.fillRect(rng.between(0, VIEW_W + 200), rng.between(0, VIEW_H), rng.pick([1, 1, 2]), rng.pick([1, 1, 2]));
    }
    // Streaks drifting past give a sense of travel.
    for (let i = 0; i < 14; i++) {
      const s = this.add.rectangle(rng.between(0, VIEW_W), rng.between(20, VIEW_H - 20), rng.between(14, 40), 1, 0x74d4ff, 0.35)
        .setScrollFactor(0).setDepth(-28);
      this.streaks.push(s);
    }
  }

  private drawHull(): void {
    const g = this.add.graphics().setDepth(-10);
    const x0 = SHIP.startX - 30;
    const x1 = SHIP_WIDTH - SHIP.startX + 30;
    const top = SHIP.ceilingY - 46;
    const bottom = SHIP.floorY + 70;
    // outer skin
    g.fillStyle(0x1b2a3a, 1);
    g.fillRoundedRect(x0, top, x1 - x0, bottom - top, 40);
    g.lineStyle(4, 0x4c6680, 1);
    g.strokeRoundedRect(x0, top, x1 - x0, bottom - top, 40);
    // nose cone and engine bells
    g.fillStyle(0x24364a, 1);
    g.fillTriangle(x0 + 8, top + 30, x0 + 8, bottom - 30, x0 - 90, (top + bottom) / 2);
    for (const y of [top + 70, (top + bottom) / 2, bottom - 70]) {
      g.fillStyle(0x24364a, 1); g.fillTriangle(x1 - 6, y - 26, x1 - 6, y + 26, x1 + 70, y);
      g.fillStyle(0x74d4ff, 0.5); g.fillTriangle(x1 + 40, y - 10, x1 + 40, y + 10, x1 + 130, y);
    }
    // solar wings above and below the hull
    g.fillStyle(0x12324a, 1);
    g.fillRect(x0 + 900, top - 90, 520, 70); g.fillRect(x0 + 900, bottom + 20, 520, 70);
    g.lineStyle(2, 0x74d4ff, 0.6);
    for (let i = 0; i <= 8; i++) {
      g.lineBetween(x0 + 900 + i * 65, top - 90, x0 + 900 + i * 65, top - 20);
      g.lineBetween(x0 + 900 + i * 65, bottom + 20, x0 + 900 + i * 65, bottom + 90);
    }
    // ceiling band with running lights
    g.fillStyle(0x0d1620, 1);
    g.fillRect(SHIP.startX, SHIP.ceilingY - 16, SHIP_WIDTH - SHIP.startX * 2, 16);
    g.fillRect(SHIP.startX, SHIP.floorY + 24, SHIP_WIDTH - SHIP.startX * 2, 40);
  }

  private drawRoom(room: (typeof ROOMS)[number]): void {
    const g = this.add.graphics().setDepth(-5);
    const { x, w } = room;
    const top = SHIP.ceilingY;
    const h = SHIP.floorY - top;
    const cx = x + w / 2;
    g.fillStyle(room.wall, 1);
    g.fillRect(x, top, w, h);
    // wall panel seams and ceiling lights
    g.lineStyle(1, 0xffffff, 0.06);
    for (let i = 1; i < 6; i++) g.lineBetween(x + (i * w) / 6, top, x + (i * w) / 6, SHIP.floorY);
    g.lineBetween(x, top + 90, x + w, top + 90);
    g.fillStyle(room.accent, 0.8);
    for (const lx of [x + 120, x + w - 180]) g.fillRect(lx, top + 2, 60, 5);
    g.fillStyle(room.accent, 0.07);
    for (const lx of [x + 120, x + w - 180]) g.fillTriangle(lx, top + 7, lx + 60, top + 7, lx + 30, SHIP.floorY);

    this.add.text(cx, top + 26, room.name.toUpperCase(), { fontFamily: MONO, fontSize: '17px', color: '#cfdcea' })
      .setOrigin(0.5).setDepth(-4).setAlpha(0.85);

    const a = room.accent;
    const f = SHIP.floorY;
    // Room-specific machinery.
    switch (room.id) {
      case 'command': {
        // Forward window with the destination, and a big status screen.
        g.fillStyle(0x02040a, 1); g.fillRoundedRect(x + 330, top + 60, 230, 130, 14);
        g.lineStyle(4, 0x4c6680, 1); g.strokeRoundedRect(x + 330, top + 60, 230, 130, 14);
        const mars = bridge.state.missionId === 'mars';
        this.planet = this.add.circle(x + 445, top + 125, 20, mars ? 0xc9623b : 0xaab6c2).setDepth(-4);
        g.fillStyle(0x0d1620, 1); g.fillRect(x + 60, top + 70, 200, 100);
        g.lineStyle(2, a, 0.8); g.strokeRect(x + 60, top + 70, 200, 100);
        g.lineStyle(2, a, 0.7); g.beginPath(); g.moveTo(x + 75, top + 150);
        g.lineTo(x + 120, top + 105); g.lineTo(x + 170, top + 125); g.lineTo(x + 245, top + 85); g.strokePath();
        g.fillStyle(0x24364a, 1); g.fillRect(x + 380, f - 46, 70, 46); g.fillRect(x + 392, f - 86, 46, 40); // seat
        break;
      }
      case 'life': {
        for (const tx of [x + 70, x + 140, x + 470, x + 540]) {
          g.fillStyle(0x24364a, 1); g.fillRoundedRect(tx, f - 190, 50, 190, 22);
          g.lineStyle(2, a, 0.8); g.strokeRoundedRect(tx, f - 190, 50, 190, 22);
          g.fillStyle(a, 0.5); g.fillRect(tx + 18, f - 150, 14, 110);
        }
        g.lineStyle(4, 0x4c6680, 1); g.lineBetween(x + 95, f - 190, x + 95, top + 100); g.lineBetween(x + 95, top + 100, x + 565, top + 100);
        g.lineBetween(x + 565, top + 100, x + 565, f - 190);
        this.add.text(x + 120, f - 215, 'O2', { fontFamily: MONO, fontSize: '16px', color: '#7dffd0' }).setDepth(-4);
        break;
      }
      case 'power': {
        for (let i = 0; i < 4; i++) {
          const bx = x + 50 + i * 62;
          g.fillStyle(0x1b2a3a, 1); g.fillRect(bx, f - 170, 50, 170);
          g.lineStyle(2, 0x4c6680, 1); g.strokeRect(bx, f - 170, 50, 170);
          for (let j = 0; j < 5; j++) { g.fillStyle(a, j < 4 ? 0.85 : 0.25); g.fillRect(bx + 8, f - 32 - j * 30, 34, 18); }
        }
        g.fillStyle(0x0d1620, 1); g.fillRect(x + 420, top + 110, 150, 120);
        g.lineStyle(2, a, 0.8); g.strokeRect(x + 420, top + 110, 150, 120);
        for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? a : 0x5dfc9a, 0.8); g.fillRect(x + 436 + i * 22, top + 210 - (30 + ((i * 37) % 60)), 12, 30 + ((i * 37) % 60)); }
        break;
      }
      case 'engine': {
        g.fillStyle(0x24364a, 1); g.fillRoundedRect(x + 360, f - 230, 200, 230, 30);
        g.lineStyle(3, a, 0.8); g.strokeRoundedRect(x + 360, f - 230, 200, 230, 30);
        g.fillStyle(a, 0.35); g.fillRect(x + 380, f - 120, 160, 100);
        this.add.text(x + 460, f - 160, 'FUEL', { fontFamily: MONO, fontSize: '16px', color: '#ff7a45' }).setOrigin(0.5).setDepth(-4);
        g.lineStyle(6, 0x4c6680, 1);
        for (const py of [top + 110, top + 140]) g.lineBetween(x + 20, py, x + 360, py);
        g.fillStyle(0x1b2a3a, 1); g.fillRect(x + 60, f - 120, 110, 120);
        g.lineStyle(2, 0x4c6680, 1); g.strokeRect(x + 60, f - 120, 110, 120);
        const piston = this.add.rectangle(x + 115, f - 130, 30, 40, 0x5d7892).setDepth(-4);
        this.tweens.add({ targets: piston, y: f - 160, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        break;
      }
      case 'comms': {
        g.lineStyle(4, 0x4c6680, 1); g.lineBetween(x + 480, f, x + 480, f - 150);
        g.lineStyle(4, a, 0.9); g.beginPath(); g.arc(x + 480, f - 190, 60, 0.15, Math.PI - 0.15, false); g.strokePath();
        g.lineBetween(x + 480, f - 150, x + 480, f - 215);
        for (let i = 0; i < 3; i++) {
          g.fillStyle(0x1b2a3a, 1); g.fillRect(x + 50 + i * 70, f - 200, 56, 200);
          g.lineStyle(2, 0x4c6680, 1); g.strokeRect(x + 50 + i * 70, f - 200, 56, 200);
          for (let j = 0; j < 8; j++) { g.fillStyle((i + j) % 3 ? a : 0x5dfc9a, 0.8); g.fillRect(x + 58 + i * 70, f - 188 + j * 22, 40, 6); }
        }
        const wave = this.add.circle(x + 480, f - 215, 8, a, 0).setStrokeStyle(2, a, 0.8).setDepth(-4);
        this.tweens.add({ targets: wave, scale: 5, alpha: 0, duration: 1600, repeat: -1 });
        break;
      }
      case 'lab': {
        g.fillStyle(0x1b2a3a, 1); g.fillRect(x + 50, f - 80, 220, 80);
        g.lineStyle(2, 0x4c6680, 1); g.strokeRect(x + 50, f - 80, 220, 80);
        for (let i = 0; i < 4; i++) {
          g.fillStyle(a, 0.6); g.fillRoundedRect(x + 66 + i * 50, f - 130, 26, 50, 8);
          g.lineStyle(2, 0xcfdcea, 0.6); g.strokeRoundedRect(x + 66 + i * 50, f - 130, 26, 50, 8);
        }
        g.fillStyle(0x0d1620, 1); g.fillRect(x + 420, top + 100, 150, 110);
        g.lineStyle(2, a, 0.8); g.strokeRect(x + 420, top + 100, 150, 110);
        g.lineStyle(2, a, 0.8); g.strokeCircle(x + 495, top + 155, 34); g.lineBetween(x + 461, top + 155, x + 529, top + 155);
        g.fillStyle(0x24364a, 1); g.fillRect(x + 440, f - 150, 40, 150); // drill column
        g.fillStyle(0xcfdcea, 1); g.fillTriangle(x + 448, f, x + 472, f, x + 460, f + 22);
        break;
      }
    }

    // The room's console (the interactable) and its red-alert overlay.
    const consoleX = x + 300;
    this.add.image(consoleX, f, 'console').setOrigin(0.5, 1).setDepth(8);
    this.add.text(consoleX, f - 78, room.console.toUpperCase(), { fontFamily: MONO, fontSize: '12px', color: '#6f879d' })
      .setOrigin(0.5).setDepth(8);
    const alarm = this.add.rectangle(x, top, w, h, 0xff2a2a, 0).setOrigin(0).setDepth(30);
    const beacon = this.add.rectangle(consoleX, top + 60, 26, 14, 0xff4f4f, 1).setDepth(31).setVisible(false);
    this.alarms.set(room.id, alarm);
    this.beacons.set(room.id, beacon);
  }

  private buildDoors(): void {
    // A bulkhead with a sliding door between each pair of rooms.
    for (let i = 1; i < ROOMS.length; i++) {
      const x = ROOMS[i].x;
      const frame = this.add.graphics().setDepth(9);
      frame.fillStyle(0x0d1620, 1);
      frame.fillRect(x - 12, SHIP.ceilingY, 24, SHIP.floorY - SHIP.ceilingY - 150);
      frame.lineStyle(2, 0x4c6680, 1);
      frame.strokeRect(x - 12, SHIP.ceilingY, 24, SHIP.floorY - SHIP.ceilingY - 150);
      const top = this.add.image(x, SHIP.floorY - 150, 'door').setOrigin(0.5, 0).setDepth(8);
      this.doors.push({ x, top, open: false });
    }
  }

  // ------------------------------------------------------------------- loop

  private setAlarm(roomId: RoomId | null): void {
    if (roomId === this.alarmRoom) return;
    if (this.alarmRoom) {
      const old = this.alarms.get(this.alarmRoom)!;
      this.tweens.killTweensOf(old);
      old.setAlpha(1).setFillStyle(0xff2a2a, 0);
      this.beacons.get(this.alarmRoom)!.setVisible(false);
    }
    this.alarmRoom = roomId;
    if (roomId) {
      const overlay = this.alarms.get(roomId)!;
      overlay.setFillStyle(worldPalette().alert, 0.22);
      this.beacons.get(roomId)!.setFillStyle(worldPalette().alert, 1);
      this.guide.setColor(worldPalette().alertCss);
      this.tweens.add({ targets: overlay, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
      this.beacons.get(roomId)!.setVisible(true);
      this.cameras.main.shake(350, 0.006);
    }
  }

  update(_time: number, delta: number): void {
    const timeline = this.timeline;
    const pad = pollInput();
    const locked = bridge.inputLocked || bridge.state.paused;
    if (pad.pausePressed) bridge.dispatch({ type: 'SET_PAUSED', paused: !bridge.state.paused });
    if (locked) {
      if (!this.physics.world.isPaused) this.physics.world.pause();
    } else if (this.physics.world.isPaused) {
      this.physics.world.resume();
    }
    const player = this.player;
    player.step(!locked, pad);

    // Doors slide open as the astronaut approaches.
    for (const door of this.doors) {
      const near = Math.abs(player.x - door.x) < 130;
      if (near !== door.open) {
        door.open = near;
        this.tweens.add({ targets: door.top, scaleY: near ? 0.06 : 1, duration: 220 });
      }
    }

    // Travel streaks and the destination growing in the command window.
    for (const s of this.streaks) {
      s.x -= delta * 0.25;
      if (s.x < -50) s.x = VIEW_W + 50;
    }
    const progress = timeline ? timeline.state.progress : 0;
    this.planet.setScale(1 + (progress / 100) * 2.2);

    if (!timeline) return;
    const state = timeline.state;

    // Ship condition shown in the world itself.
    const deficit = state.powerGen < state.powerDraw;
    this.dimmer.setFillStyle(0x000000, deficit ? (state.batteryWh <= 0 ? 0.5 : 0.28) : 0);
    this.sparkTimer += delta;
    if (state.hull < 60 && this.sparkTimer > 900) {
      this.sparkTimer = 0;
      const sx = Phaser.Math.Between(SHIP.startX + 40, SHIP_WIDTH - SHIP.startX - 40);
      for (let i = 0; i < 5; i++) {
        const dot = this.add.image(sx, SHIP.ceilingY + 6, 'dot').setTint(0xffd447).setDepth(35).setScale(0.6);
        this.tweens.add({ targets: dot, x: sx + Phaser.Math.Between(-30, 30), y: SHIP.ceilingY + Phaser.Math.Between(30, 90), alpha: 0, duration: 450, onComplete: () => dot.destroy() });
      }
    }

    // Challenge: red alert in the affected room and a guide to get there.
    const awaiting = timeline.stage === 'challenge' && !bridge.state.challengeOpen;
    const challenge = timeline.stage === 'challenge' || timeline.stage === 'result'
      ? getChallenge(state.missionId, timeline.challengeIndex) : null;
    this.setAlarm(timeline.stage === 'challenge' && challenge ? challenge.room : null);

    const here = roomAt(player.x);
    if (awaiting && challenge) {
      const target = getRoom(challenge.room);
      const arrow = here.id === target.id ? '▼' : target.x < here.x ? '◄◄' : '►►';
      this.guide.setVisible(true).setText(
        here.id === target.id
          ? `${arrow} ${challenge.alert} — USE THE ${target.console.toUpperCase()}`
          : `${arrow} ${challenge.alert} — GO TO THE ${target.name.toUpperCase()} ${arrow}`,
      );
    } else {
      this.guide.setVisible(false);
    }

    // Console interaction.
    const consoleX = here.x + 300;
    if (!locked && Math.abs(player.x - consoleX) < 70) {
      const isTarget = awaiting && challenge?.room === here.id;
      this.prompt
        .setText(isTarget ? `[E] RESPOND: ${challenge!.title.toUpperCase()}` : `[E] ${here.console.toUpperCase()}`)
        .setColor(isTarget ? worldPalette().alertCss : worldPalette().goodCss)
        .setPosition(consoleX, SHIP.floorY - 96).setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.keyE) || pad.interactPressed) {
        player.interact();
        sound.confirm();
        bridge.dispatch(isTarget ? { type: 'OPEN_CHALLENGE' } : { type: 'OPEN_PANEL', room: here.id });
      }
    } else {
      this.prompt.setVisible(false);
    }

    if (!locked && Phaser.Input.Keyboard.JustDown(this.keyEsc)) bridge.dispatch({ type: 'SET_PAUSED', paused: true });

    this.hudTimer += delta;
    if (this.hudTimer > 250) {
      this.hudTimer = 0;
      bridge.setHud({ suit: 100, oxygen: state.oxygen, zone: here.name });
    }
  }
}
