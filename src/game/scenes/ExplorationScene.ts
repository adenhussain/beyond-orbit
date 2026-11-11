import Phaser from 'phaser';
import { getResource } from '../../data/resources';
import { sound } from '../../services/sound';
import { DEMO_SPAWN_X } from '../../state/demo';
import { bridge } from '../bridge';
import { pollInput } from '../input';
import { worldPalette } from '../palette';
import { Astronaut } from '../entities/Astronaut';
import type { LevelMap } from '../maps/levelTypes';
import { lunarMap } from '../maps/lunarMap';
import { marsMap } from '../maps/marsMap';

const VIEW_W = 1280;
const VIEW_H = 720;
const MONO = '"Share Tech Mono", monospace';

interface Interactable {
  x: number;
  y: number;
  range: number;
  label: () => string;
  use: () => void;
  active: () => boolean;
}

/**
 * PHASE: ASTRONAUT EXPLORATION.
 * The astronaut walks and jumps through a side-scrolling base, collects
 * supplies with E, avoids hazards, refills oxygen, and finally enters the
 * spacecraft workshop at the far end.
 */
export class ExplorationScene extends Phaser.Scene {
  private map!: LevelMap;
  private player!: Astronaut;
  private interactables: Interactable[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private suit = 100;
  private oxygen = 100;
  private safeX = 0;
  private invulnerableUntil = 0;
  private hudTimer = 0;
  private jets: { x: number; sprite: Phaser.GameObjects.Image; on: boolean }[] = [];
  private devils: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('exploration');
  }

  create(): void {
    this.map = bridge.state.missionId === 'mars' ? marsMap : lunarMap;
    const map = this.map;
    this.interactables = [];
    this.jets = [];
    this.devils = [];
    this.suit = 100;
    this.oxygen = 100;

    this.physics.world.gravity.y = map.gravity;
    this.physics.world.setBounds(0, -400, map.width, VIEW_H + 600);
    this.cameras.main.setBounds(0, 0, map.width, VIEW_H);

    this.drawBackdrop();
    const solids = this.buildTerrain();
    this.drawBase();
    this.placeResources();
    this.placeStations();
    this.placeHazards();
    this.placeWorkshop();

    const spawnX = bridge.state.atWorkshop
      ? map.workshopX - 140
      : bridge.state.demo && map.missionId === 'lunar' ? DEMO_SPAWN_X : map.spawnX;
    this.safeX = spawnX;
    this.player = new Astronaut(this, spawnX, map.groundY - 4, map.jumpVelocity);
    this.physics.add.collider(this.player, solids.ground);
    this.physics.add.collider(this.player, solids.platforms);
    this.player.on('land', () => this.puff(this.player.x, this.player.y, 0xb9c6d2, 5));
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 120);

    this.prompt = this.add.text(0, 0, '', {
      fontFamily: MONO, fontSize: '16px', color: '#5dfc9a', backgroundColor: '#03060cdd', padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setDepth(50).setVisible(false);
    this.toast = this.add.text(VIEW_W / 2, 150, '', {
      fontFamily: MONO, fontSize: '18px', color: '#ffb547', backgroundColor: '#03060cdd', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60).setAlpha(0);

    const kb = this.input.keyboard!;
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.cameras.main.fadeIn(500, 3, 6, 12);
    this.say(`${map.zoneName.toUpperCase()} — collect supplies, then reach the workshop →`, 4200);
  }

  // ---------------------------------------------------------------- world

  private drawBackdrop(): void {
    const { map } = this;
    const [top, bottom, far, near] = map.sky;
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-30);
    sky.fillGradientStyle(top, top, bottom, bottom, 1);
    sky.fillRect(0, 0, VIEW_W, VIEW_H);

    const rng = new Phaser.Math.RandomDataGenerator(['beyond-orbit']);
    const stars = this.add.graphics().setScrollFactor(0.04).setDepth(-29);
    const mars = map.missionId === 'mars';
    for (let i = 0; i < (mars ? 40 : 160); i++) {
      stars.fillStyle(0xffffff, rng.realInRange(0.2, mars ? 0.4 : 0.9));
      stars.fillRect(rng.between(0, VIEW_W + 300), rng.between(0, mars ? 220 : 480), rng.pick([1, 1, 2]), rng.pick([1, 1, 2]));
    }
    // Earth over the Moon; a small pale Sun over Mars.
    const body = this.add.graphics().setScrollFactor(0.06).setDepth(-28);
    if (mars) {
      body.fillStyle(0xfff0d0, 0.9); body.fillCircle(980, 150, 26);
      body.fillStyle(0xfff0d0, 0.15); body.fillCircle(980, 150, 60);
    } else {
      body.fillStyle(0x2f6fa8, 1); body.fillCircle(1000, 160, 46);
      body.fillStyle(0x5dfc9a, 0.55); body.fillEllipse(988, 150, 30, 18); body.fillEllipse(1016, 178, 22, 12);
      body.fillStyle(0x01030a, 0.6); body.fillCircle(1020, 150, 46);
    }
    // Two parallax ridge lines, built from summed sine waves.
    const ridge = (color: number, factor: number, base: number, amp: number, depth: number, seed: number) => {
      const g = this.add.graphics().setScrollFactor(factor).setDepth(depth);
      g.fillStyle(color, 1);
      g.beginPath();
      g.moveTo(0, VIEW_H);
      const span = map.width * factor + VIEW_W;
      for (let x = 0; x <= span; x += 24) {
        const y = base - Math.abs(Math.sin(x * 0.004 + seed)) * amp - Math.sin(x * 0.013 + seed * 2) * amp * 0.3;
        g.lineTo(x, y);
      }
      g.lineTo(span, VIEW_H);
      g.closePath();
      g.fillPath();
    };
    ridge(far, 0.25, 470, 130, -20, 1.3);
    ridge(near, 0.5, 560, 90, -19, 4.1);
  }

  private buildTerrain() {
    const { map } = this;
    const ground = this.physics.add.staticGroup();
    const platforms = this.physics.add.staticGroup();
    const solid = (group: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, w: number, h: number) => {
      const zone = this.add.zone(x + w / 2, y + h / 2, w, h);
      group.add(zone);
      (zone.body as Phaser.Physics.Arcade.StaticBody).setSize(w, h).updateFromGameObject();
      return zone;
    };

    // Ground spans between the gaps.
    let cursor = 0;
    const gaps = [...map.gaps].sort((a, b) => a.x - b.x);
    for (const gap of [...gaps, { x: map.width, w: 0 }]) {
      const w = gap.x - cursor;
      if (w > 0) {
        this.add.tileSprite(cursor, map.groundY, w, 200, map.groundTexture).setOrigin(0, 0).setDepth(5);
        solid(ground, cursor, map.groundY, w, 200);
      }
      cursor = gap.x + gap.w;
    }
    // Warning posts at each crevasse.
    for (const gap of gaps) {
      for (const x of [gap.x - 14, gap.x + gap.w + 8]) {
        this.add.rectangle(x, map.groundY - 24, 6, 48, 0xffb547).setOrigin(0, 0.5).setDepth(6);
        this.add.rectangle(x - 3, map.groundY - 50, 12, 8, 0xff4f4f).setOrigin(0, 0.5).setDepth(6);
      }
    }

    for (const p of map.platforms) {
      this.add.tileSprite(p.x, p.y, p.w, 20, 'platform').setOrigin(0, 0).setDepth(6);
      // support struts
      const struts = this.add.graphics().setDepth(4);
      struts.lineStyle(3, 0x1b2a3a, 1);
      struts.lineBetween(p.x + 14, p.y + 20, p.x + 14, map.groundY);
      struts.lineBetween(p.x + p.w - 14, p.y + 20, p.x + p.w - 14, map.groundY);
      const zone = solid(platforms, p.x, p.y, p.w, 20);
      // One-way: the astronaut can jump up through a platform and land on it.
      const body = zone.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }
    return { ground, platforms };
  }

  /** Decorative base structures so the level reads as a real facility. */
  private drawBase(): void {
    const { map } = this;
    const g = this.add.graphics().setDepth(2);
    const y = map.groundY;
    // Habitat with airlock at the start.
    g.fillStyle(0x1b2a3a, 1); g.fillRoundedRect(-40, y - 190, 150, 190, 18);
    g.lineStyle(3, 0x4c6680, 1); g.strokeRoundedRect(-40, y - 190, 150, 190, 18);
    g.fillStyle(0x74d4ff, 0.6); g.fillRect(10, y - 150, 40, 26);
    g.fillStyle(0x0d1620, 1); g.fillRect(52, y - 96, 48, 96);
    g.lineStyle(2, 0x5dfc9a, 1); g.strokeRect(52, y - 96, 48, 96);
    this.add.text(34, y - 210, 'AIRLOCK 01', { fontFamily: MONO, fontSize: '13px', color: '#6f879d' }).setOrigin(0.5).setDepth(3);

    // Repeating props: containers, antenna masts, storage tanks.
    const rng = new Phaser.Math.RandomDataGenerator([map.missionId]);
    for (let x = 420; x < map.workshopX - 300; x += rng.between(330, 520)) {
      if (map.gaps.some((gap) => x > gap.x - 130 && x < gap.x + gap.w + 40)) continue;
      const kind = rng.between(0, 2);
      if (kind === 0) {
        g.fillStyle(0x24364a, 1); g.fillRect(x, y - 54, 96, 54);
        g.lineStyle(2, 0x4c6680, 1); g.strokeRect(x, y - 54, 96, 54);
        for (let i = 1; i < 6; i++) g.lineBetween(x + i * 16, y - 52, x + i * 16, y - 2);
        g.fillStyle(0xffb547, 1); g.fillRect(x + 6, y - 46, 20, 8);
      } else if (kind === 1) {
        g.lineStyle(3, 0x4c6680, 1); g.lineBetween(x, y, x, y - 210);
        g.lineBetween(x - 22, y - 150, x + 22, y - 150); g.lineBetween(x - 14, y - 180, x + 14, y - 180);
        g.lineStyle(2, 0x2c4259, 1); g.lineBetween(x - 30, y, x, y - 120); g.lineBetween(x + 30, y, x, y - 120);
        const lamp = this.add.rectangle(x, y - 214, 8, 8, 0xff4f4f).setDepth(3);
        this.tweens.add({ targets: lamp, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
      } else {
        g.fillStyle(0x1b2a3a, 1); g.fillRoundedRect(x, y - 110, 60, 110, 26);
        g.lineStyle(2, 0x4c6680, 1); g.strokeRoundedRect(x, y - 110, 60, 110, 26);
        g.fillStyle(0x74d4ff, 0.8); g.fillRect(x + 22, y - 70, 16, 34);
      }
    }
  }

  private placeResources(): void {
    for (const item of this.map.resources) {
      if (bridge.state.collected.includes(item.id)) continue;
      const def = getResource(item.type);
      const sprite = this.add.image(item.x, item.y, `res_${item.type}`).setDepth(10);
      const glow = this.add.rectangle(item.x, item.y, 44, 44, def.color, 0.14).setDepth(9);
      this.tweens.add({ targets: [sprite, glow], y: item.y - 7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      let taken = false;
      this.interactables.push({
        x: item.x, y: item.y - 26, range: 58,
        active: () => !taken,
        label: () => `[E] COLLECT ${def.item.toUpperCase()}`,
        use: () => {
          taken = true;
          bridge.dispatch({ type: 'COLLECT', itemId: item.id, resource: item.type });
          sound.select();
          glow.destroy();
          this.tweens.killTweensOf(sprite);
          this.tweens.add({ targets: sprite, y: sprite.y - 60, alpha: 0, scale: 1.5, duration: 380, onComplete: () => sprite.destroy() });
          this.puff(item.x, item.y, def.color, 8);
          this.floatText(item.x, item.y - 30, `+1 ${def.item}`, def.css);
        },
      });
    }
  }

  private placeStations(): void {
    for (const x of this.map.o2Stations) {
      this.add.image(x, this.map.groundY, 'o2station').setOrigin(0.5, 1).setDepth(8);
      this.add.text(x, this.map.groundY - 92, 'O2', { fontFamily: MONO, fontSize: '14px', color: '#74d4ff' }).setOrigin(0.5).setDepth(8);
      this.interactables.push({
        x, y: this.map.groundY - 100, range: 62,
        active: () => this.oxygen < 99,
        label: () => '[E] REFILL OXYGEN',
        use: () => {
          this.oxygen = 100;
          sound.confirm();
          this.floatText(x, this.map.groundY - 110, 'OXYGEN 100%', '#74d4ff');
        },
      });
    }
  }

  private placeHazards(): void {
    const { map } = this;
    for (const vent of map.vents) {
      this.add.image(vent.x, map.groundY, 'vent').setOrigin(0.5, 1).setDepth(7);
      const sprite = this.add.image(vent.x, map.groundY - 12, 'jet').setOrigin(0.5, 1).setDepth(7).setScale(1, 0);
      const jet = { x: vent.x, sprite, on: false };
      this.jets.push(jet);
      // Cycle: a short hiss as warning, then the eruption.
      this.time.addEvent({
        delay: vent.period, loop: true, startAt: vent.x % 1000,
        callback: () => {
          this.tweens.add({ targets: sprite, scaleY: 0.12, duration: 350, onComplete: () => {
            jet.on = true;
            this.tweens.add({ targets: sprite, scaleY: 1, duration: 120 });
            this.time.delayedCall(900, () => {
              jet.on = false;
              this.tweens.add({ targets: sprite, scaleY: 0, duration: 200 });
            });
          } });
        },
      });
    }
    for (const d of map.devils) {
      const devil = this.add.image(d.from, map.groundY, 'devil').setOrigin(0.5, 1).setDepth(12).setAlpha(0.85);
      this.tweens.add({ targets: devil, x: d.to, duration: d.duration, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: devil, scaleX: 0.8, duration: 240, yoyo: true, repeat: -1 });
      this.devils.push(devil);
    }
  }

  private placeWorkshop(): void {
    const { map } = this;
    const x = map.workshopX;
    const y = map.groundY;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x121c28, 1); g.fillRect(x - 60, y - 330, 330, 330);
    g.lineStyle(3, 0x4c6680, 1); g.strokeRect(x - 60, y - 330, 330, 330);
    g.fillStyle(0x1b2a3a, 1); for (let i = 0; i < 6; i++) g.fillRect(x - 50 + i * 54, y - 320, 44, 200);
    g.fillStyle(0xffb547, 1); g.fillRect(x - 60, y - 112, 330, 8);
    g.fillStyle(0x03060c, 1); g.fillRect(x - 20, y - 104, 80, 104);
    g.lineStyle(3, 0x5dfc9a, 1); g.strokeRect(x - 20, y - 104, 80, 104);
    // rocket nose visible above the roof
    g.fillStyle(0xeef3f7, 1); g.fillTriangle(x + 170, y - 430, x + 140, y - 330, x + 200, y - 330);
    g.fillStyle(0xff8c42, 1); g.fillRect(x + 140, y - 345, 60, 8);
    this.add.text(x + 105, y - 150, 'SPACECRAFT ASSEMBLY', { fontFamily: MONO, fontSize: '16px', color: '#ffb547' }).setOrigin(0.5).setDepth(3);
    const arrow = this.add.text(x + 20, y - 128, '▼', { fontSize: '18px', color: '#5dfc9a' }).setOrigin(0.5).setDepth(3);
    this.tweens.add({ targets: arrow, y: y - 118, duration: 500, yoyo: true, repeat: -1 });
    this.interactables.push({
      x: x + 20, y: y - 120, range: 80,
      active: () => true,
      label: () => '[E] ENTER SPACECRAFT WORKSHOP',
      use: () => {
        sound.confirm();
        this.cameras.main.fadeOut(350, 3, 6, 12);
        this.time.delayedCall(360, () => bridge.dispatch({ type: 'ENTER_WORKSHOP' }));
      },
    });
  }

  // -------------------------------------------------------------- effects

  private puff(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const dot = this.add.image(x, y, 'dot').setTint(color).setDepth(30);
      this.tweens.add({
        targets: dot, x: x + Phaser.Math.Between(-40, 40), y: y - Phaser.Math.Between(4, 44), alpha: 0,
        duration: Phaser.Math.Between(260, 520), onComplete: () => dot.destroy(),
      });
    }
  }

  private floatText(x: number, y: number, text: string, color: string): void {
    const label = this.add.text(x, y, text, { fontFamily: MONO, fontSize: '15px', color }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: label, y: y - 46, alpha: 0, duration: 1100, onComplete: () => label.destroy() });
  }

  private say(text: string, ms = 2400): void {
    this.toast.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 500 });
  }

  private damage(amount: number, reason: string, knockback = 0): void {
    if (this.time.now < this.invulnerableUntil) return;
    this.invulnerableUntil = this.time.now + 1200;
    this.suit = Math.max(0, this.suit - amount);
    sound.remove();
    this.cameras.main.shake(160, 0.006);
    this.say(`SUIT DAMAGE −${amount}: ${reason}`);
    this.tweens.add({ targets: this.player, alpha: 0.3, duration: 100, yoyo: true, repeat: 4 });
    if (knockback !== 0) (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(knockback, -260);
  }

  private respawn(x: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.reset(x, this.map.groundY - 4);
    this.cameras.main.flash(250, 255, 80, 80);
  }

  // ----------------------------------------------------------------- loop

  update(_time: number, delta: number): void {
    const pad = pollInput();
    const locked = bridge.inputLocked || bridge.state.paused;
    if (locked) {
      if (!this.physics.world.isPaused) { this.physics.world.pause(); this.tweens.pauseAll(); }
      if (pad.pausePressed && bridge.state.paused) bridge.dispatch({ type: 'SET_PAUSED', paused: false });
      return;
    }
    if (this.physics.world.isPaused) { this.physics.world.resume(); this.tweens.resumeAll(); }

    const { map, player } = this;
    player.step(true, pad);
    const body = player.body as Phaser.Physics.Arcade.Body;

    // Remember the last solid ground so a fall puts the astronaut back nearby.
    if (body.blocked.down && player.y > map.groundY - 10 && !map.gaps.some((g) => player.x > g.x - 50 && player.x < g.x + g.w + 50)) {
      this.safeX = player.x;
    }
    if (player.y > VIEW_H + 80) {
      this.invulnerableUntil = 0;
      this.damage(20, 'fell into a crevasse');
      this.respawn(this.safeX);
    }

    // Hazards.
    for (const jet of this.jets) {
      if (jet.on && Math.abs(player.x - jet.x) < 24 && player.y > map.groundY - 125) {
        this.damage(15, 'cryo-geyser', player.x < jet.x ? -260 : 260);
      }
    }
    for (const devil of this.devils) {
      if (Math.abs(player.x - devil.x) < 30 && player.y > map.groundY - 105) {
        this.damage(12, 'dust devil', player.x < devil.x ? -300 : 300);
      }
    }

    // Suit oxygen: about three minutes per tank.
    this.oxygen = Math.max(0, this.oxygen - (delta / 1000) * 0.55);
    if (this.oxygen <= 0) this.suit = Math.max(0, this.suit - (delta / 1000) * 4);
    if (this.suit <= 0) {
      this.suit = 60;
      this.oxygen = 100;
      this.respawn(map.spawnX);
      this.say('SUIT FAILURE — emergency recovery to the airlock', 3200);
    }

    // Interaction: the nearest usable object shows a prompt.
    let nearest: Interactable | null = null;
    let best = Infinity;
    for (const it of this.interactables) {
      if (!it.active()) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y - 30, it.x, it.y + 26);
      if (d < it.range && d < best) { best = d; nearest = it; }
    }
    if (nearest) {
      this.prompt.setColor(worldPalette().goodCss);
      this.prompt.setText(nearest.label()).setPosition(nearest.x, nearest.y - 12).setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.keyE) || pad.interactPressed) {
        player.interact();
        nearest.use();
      }
    } else {
      this.prompt.setVisible(false);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyEsc) || pad.pausePressed) bridge.dispatch({ type: 'SET_PAUSED', paused: true });

    this.hudTimer += delta;
    if (this.hudTimer > 200) {
      this.hudTimer = 0;
      bridge.setHud({ suit: this.suit, oxygen: this.oxygen, zone: map.zoneName });
    }
  }
}
