import Phaser from 'phaser';
import type { ArenaRect, CombatUnit, Team, UnitIntent, UnitKind } from './types';

const WORLD_W = 1024;
const WORLD_H = 704;
const HUD_H = 48;
const MAP = new Phaser.Geom.Rectangle(32, 64, 960, 608);

const UNIT_RADIUS = 13;
const VISION_RANGE = 300;
const RIFLE_RANGE = 430;
const RIFLE_DAMAGE = 20;
const BLADE_RANGE = 42;
const BLADE_DAMAGE = 46;
const DASH_SPEED = 620;
const DASH_TIME = 0.16;
const MAX_ROUND_TIME = 180;
const COMMAND_DURATION = 9000;
const FOCUS_DURATION = 6500;
const COVER_POINT_OFFSET = 34;

const HELP_TEXT = [
  '【目的】',
  '青4 vs 赤4。敵を全滅させれば勝利。リーダー1人を操作し、味方3人はAI。',
  '',
  '【基本操作】',
  'WASD … 移動    マウス … 照準    左クリック … ライフル',
  'Shift / 右クリック … シールド    Space … ダッシュ    E … 近接    R … 再スタート',
  '',
  '【チーム命令】',
  'Q … 味方をカーソル位置へ集合',
  'F … 見えている敵に集中攻撃（挟撃）',
  '',
  '【ロードアウト】',
  '1 Vanguard … バランス    2 Scout … 視界・機動',
  '3 Bulwark … 耐久    4 Striker … 近接',
  '',
  '【画面の見方】',
  '灰色の箱 … 遮蔽物（弾・視界を遮る）',
  '敵は見えないと非表示（フォグ・オブ・ウォー）',
  '右上 … ミニマップ    緑い照準線 … 挟撃ボーナス    赤い線 … 敵の照準',
  '',
  'まず WASD で動き、敵を見つけたら左クリック。Q で前進、F で集中攻撃。',
].join('\n');

type PlayerLoadoutId = 'vanguard' | 'scout' | 'bulwark' | 'striker';

interface PlayerLoadout {
  id: PlayerLoadoutId;
  key: string;
  name: string;
  note: string;
  speed: number;
  visionRange: number;
  rifleRange: number;
  rifleDamage: number;
  rifleCooldownDuration: number;
  bladeRange: number;
  bladeDamage: number;
  bladeCooldownDuration: number;
  dashCooldownDuration: number;
  maxShieldEnergy: number;
  shieldDrainRate: number;
  shieldRegenRate: number;
  shieldMitigation: number;
}

const COLORS = {
  blue: 0x46d7ff,
  blueCore: 0xd7fbff,
  red: 0xff5f6d,
  redCore: 0xffd7da,
  ground: 0x0a151a,
  grid: 0x16424d,
  cover: 0x1e3137,
  coverTop: 0x324b53,
  text: '#d9f7ff',
  muted: '#7daeb8',
  good: '#9ff6c7',
  warn: '#ffd36a',
  danger: '#ff7886',
};

const COVER: ArenaRect[] = [
  { x: 122, y: 124, w: 88, h: 164 },
  { x: 290, y: 92, w: 74, h: 128 },
  { x: 468, y: 88, w: 88, h: 118 },
  { x: 704, y: 118, w: 86, h: 166 },
  { x: 840, y: 290, w: 72, h: 154 },
  { x: 610, y: 330, w: 98, h: 70 },
  { x: 420, y: 270, w: 98, h: 150 },
  { x: 252, y: 408, w: 112, h: 86 },
  { x: 566, y: 504, w: 166, h: 58 },
  { x: 118, y: 542, w: 112, h: 48 },
];

const BLUE_SPAWNS = [
  { x: 92, y: 186 },
  { x: 92, y: 250 },
  { x: 92, y: 314 },
  { x: 92, y: 378 },
];

const RED_SPAWNS = [
  { x: 932, y: 186 },
  { x: 932, y: 250 },
  { x: 932, y: 314 },
  { x: 932, y: 378 },
];

const ALLY_OFFSETS = [
  new Phaser.Math.Vector2(-60, -72),
  new Phaser.Math.Vector2(-84, 0),
  new Phaser.Math.Vector2(-60, 72),
];

const PLAYER_LOADOUTS: PlayerLoadout[] = [
  {
    id: 'vanguard',
    key: '1',
    name: 'VANGUARD',
    note: 'balanced rifle and shield',
    speed: 178,
    visionRange: 300,
    rifleRange: 430,
    rifleDamage: 20,
    rifleCooldownDuration: 0.22,
    bladeRange: 42,
    bladeDamage: 46,
    bladeCooldownDuration: 0.72,
    dashCooldownDuration: 1.45,
    maxShieldEnergy: 100,
    shieldDrainRate: 28,
    shieldRegenRate: 19,
    shieldMitigation: 0.42,
  },
  {
    id: 'scout',
    key: '2',
    name: 'SCOUT',
    note: 'wide vision and fast dash',
    speed: 205,
    visionRange: 380,
    rifleRange: 390,
    rifleDamage: 17,
    rifleCooldownDuration: 0.24,
    bladeRange: 38,
    bladeDamage: 34,
    bladeCooldownDuration: 0.68,
    dashCooldownDuration: 1.1,
    maxShieldEnergy: 74,
    shieldDrainRate: 34,
    shieldRegenRate: 17,
    shieldMitigation: 0.5,
  },
  {
    id: 'bulwark',
    key: '3',
    name: 'BULWARK',
    note: 'durable shield anchor',
    speed: 150,
    visionRange: 280,
    rifleRange: 410,
    rifleDamage: 18,
    rifleCooldownDuration: 0.3,
    bladeRange: 40,
    bladeDamage: 42,
    bladeCooldownDuration: 0.84,
    dashCooldownDuration: 1.8,
    maxShieldEnergy: 145,
    shieldDrainRate: 21,
    shieldRegenRate: 24,
    shieldMitigation: 0.32,
  },
  {
    id: 'striker',
    key: '4',
    name: 'STRIKER',
    note: 'close assault blade',
    speed: 192,
    visionRange: 290,
    rifleRange: 360,
    rifleDamage: 15,
    rifleCooldownDuration: 0.28,
    bladeRange: 52,
    bladeDamage: 66,
    bladeCooldownDuration: 0.64,
    dashCooldownDuration: 1.25,
    maxShieldEnergy: 82,
    shieldDrainRate: 32,
    shieldRegenRate: 18,
    shieldMitigation: 0.46,
  },
];

type KeySet = Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'SHIFT' | 'E' | 'Q' | 'F' | 'R' | 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'H' | 'ENTER' | 'ESC', Phaser.Input.Keyboard.Key>;

type SquadCommand =
  | {
      kind: 'rally';
      point: Phaser.Math.Vector2;
      issuedAt: number;
      expiresAt: number;
    }
  | {
      kind: 'focus';
      targetId: string;
      issuedAt: number;
      expiresAt: number;
    };

interface RoundStats {
  shotsFired: number;
  rifleHits: number;
  bladeHits: number;
  crossfireHits: number;
  damageDealt: number;
  damageTaken: number;
  commandsIssued: number;
  coverMoves: number;
  exposureSeconds: number;
}

interface ThreatLane {
  enemy: CombatUnit;
  target: CombatUnit;
  distance: number;
}

export class ArenaScene extends Phaser.Scene {
  private units: CombatUnit[] = [];
  private coverRects: Phaser.Geom.Rectangle[] = [];
  private keys!: KeySet;
  private ground!: Phaser.GameObjects.Graphics;
  private coverLayer!: Phaser.GameObjects.Graphics;
  private visionLayer!: Phaser.GameObjects.Graphics;
  private intelLayer!: Phaser.GameObjects.Graphics;
  private tacticalLayer!: Phaser.GameObjects.Graphics;
  private shotLayer!: Phaser.GameObjects.Graphics;
  private uiLayer!: Phaser.GameObjects.Graphics;
  private minimapLayer!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private playerText!: Phaser.GameObjects.Text;
  private commandText!: Phaser.GameObjects.Text;
  private roundTime = MAX_ROUND_TIME;
  private roundOver = false;
  private resultText?: Phaser.GameObjects.Text;
  private elapsedMs = 0;
  private dashTimerById = new Map<string, number>();
  private squadCommand?: SquadCommand;
  private roundStats: RoundStats = this.createRoundStats();
  private selectedLoadoutId: PlayerLoadoutId = 'vanguard';
  private helpOverlay?: Phaser.GameObjects.Container;
  private helpVisible = false;
  private helpDismissedSession = false;
  private helpPointerJustDown = false;

  constructor() {
    super('ArenaScene');
  }

  create() {
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', () => {
      this.helpPointerJustDown = true;
    });
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,SHIFT,E,Q,F,R,ONE,TWO,THREE,FOUR,H,ENTER,ESC') as KeySet;

    this.ground = this.add.graphics().setDepth(0);
    this.visionLayer = this.add.graphics().setDepth(1);
    this.coverLayer = this.add.graphics().setDepth(2);
    this.intelLayer = this.add.graphics().setDepth(3);
    this.tacticalLayer = this.add.graphics().setDepth(4);
    this.shotLayer = this.add.graphics().setDepth(5);
    this.uiLayer = this.add.graphics().setDepth(8);
    this.minimapLayer = this.add.graphics().setDepth(9);

    this.hudText = this.add.text(24, 16, '', {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '15px',
      color: COLORS.text,
    }).setDepth(10);
    this.statusText = this.add.text(WORLD_W / 2, 16, '', {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '15px',
      color: COLORS.good,
    }).setOrigin(0.5, 0).setDepth(10);
    this.playerText = this.add.text(24, WORLD_H - 34, '', {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '14px',
      color: COLORS.text,
    }).setDepth(10);
    this.commandText = this.add.text(24, 50, '', {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '12px',
      color: COLORS.muted,
    }).setDepth(10);

    this.createHelpOverlay();
    this.resetRound();
  }

  update(_: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 0.033);

    if (this.handleHelpInput()) {
      this.drawVision();
      this.drawIntel();
      this.drawTacticalOverlay();
      this.drawHud();
      this.drawMinimap();
      return;
    }

    this.elapsedMs += deltaMs;

    if (this.handleLoadoutHotkeys()) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.resetRound();
      return;
    }

    if (!this.roundOver) {
      this.roundTime = Math.max(0, this.roundTime - dt);
      this.updateCooldowns(dt);
      this.handlePlayer(dt);
      this.updateAi(dt);
      this.updateUnitViews();
      this.updateVisibility();
      this.updateExposureStats(dt);
      this.checkRoundEnd();
    }

    this.drawVision();
    this.drawIntel();
    this.drawTacticalOverlay();
    this.drawHud();
    this.drawMinimap();
  }

  private resetRound() {
    this.units.forEach((unit) => unit.view.root.destroy());
    this.units = [];
    this.coverRects = COVER.map((rect) => new Phaser.Geom.Rectangle(rect.x, rect.y, rect.w, rect.h));
    this.roundTime = MAX_ROUND_TIME;
    this.roundOver = false;
    this.elapsedMs = 0;
    this.dashTimerById.clear();
    this.squadCommand = undefined;
    this.roundStats = this.createRoundStats();
    this.resultText?.destroy();
    this.resultText = undefined;

    if (!this.helpDismissedSession) {
      this.setHelpVisible(true);
    }

    this.drawGround();
    this.drawCover();

    BLUE_SPAWNS.forEach((spawn, index) => {
      this.units.push(this.createUnit({
        id: index === 0 ? 'blue-lead' : `blue-${index}`,
        team: 'blue',
        kind: index === 0 ? 'player' : 'ally',
        index,
        x: spawn.x,
        y: spawn.y,
      }));
    });

    RED_SPAWNS.forEach((spawn, index) => {
      this.units.push(this.createUnit({
        id: `red-${index}`,
        team: 'red',
        kind: 'opponent',
        index,
        x: spawn.x,
        y: spawn.y,
      }));
    });

    this.updateVisibility();
    this.updateUnitViews();
  }

  private drawGround() {
    this.ground.clear();
    this.ground.fillStyle(COLORS.ground, 1);
    this.ground.fillRect(0, 0, WORLD_W, WORLD_H);
    this.ground.fillStyle(0x0d2027, 1);
    this.ground.fillRect(MAP.x, MAP.y, MAP.width, MAP.height);
    this.ground.lineStyle(1, COLORS.grid, 0.35);

    for (let x = MAP.x; x <= MAP.right; x += 32) {
      this.ground.lineBetween(x, MAP.y, x, MAP.bottom);
    }
    for (let y = MAP.y; y <= MAP.bottom; y += 32) {
      this.ground.lineBetween(MAP.x, y, MAP.right, y);
    }

    this.ground.lineStyle(2, 0x59d8ef, 0.22);
    this.ground.strokeRect(MAP.x, MAP.y, MAP.width, MAP.height);
    this.ground.fillStyle(0x071016, 0.88);
    this.ground.fillRect(0, 0, WORLD_W, HUD_H);
  }

  private drawCover() {
    this.coverLayer.clear();
    for (const rect of this.coverRects) {
      this.coverLayer.fillStyle(COLORS.cover, 1);
      this.coverLayer.fillRect(rect.x, rect.y, rect.width, rect.height);
      this.coverLayer.fillStyle(COLORS.coverTop, 0.62);
      this.coverLayer.fillRect(rect.x + 4, rect.y + 4, rect.width - 8, 10);
      this.coverLayer.lineStyle(1, 0x8bddea, 0.2);
      this.coverLayer.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);
    }
  }

  private createUnit(config: {
    id: string;
    team: Team;
    kind: UnitKind;
    index: number;
    x: number;
    y: number;
  }): CombatUnit {
    const color = config.team === 'blue' ? COLORS.blue : COLORS.red;
    const core = config.team === 'blue' ? COLORS.blueCore : COLORS.redCore;
    const loadout = this.getSelectedLoadout();
    const isPlayer = config.kind === 'player';
    const root = this.add.container(config.x, config.y).setDepth(4);
    const shield = this.add.circle(0, 0, UNIT_RADIUS + 7, color, 0).setStrokeStyle(2, color, 0);
    const body = this.add.circle(0, 0, UNIT_RADIUS, color, 0.94).setStrokeStyle(2, 0xffffff, 0.08);
    const coreDot = this.add.circle(0, 0, 4, core, 1);
    const heading = this.add.rectangle(UNIT_RADIUS + 5, 0, 16, 3, core, 0.9).setOrigin(0, 0.5);
    const hpBack = this.add.rectangle(-17, -24, 34, 4, 0x10242a, 1).setOrigin(0, 0.5);
    const hpBar = this.add.rectangle(-17, -24, 34, 4, config.team === 'blue' ? 0x9ff6c7 : 0xff9ca5, 1).setOrigin(0, 0.5);
    const label = this.add.text(0, 17, config.kind === 'player' ? 'LEAD' : `${config.index + 1}`, {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '9px',
      color: config.team === 'blue' ? '#d8fbff' : '#ffe5e8',
    }).setOrigin(0.5, 0);
    root.add([shield, body, heading, coreDot, hpBack, hpBar, label]);

    const patrol = config.team === 'red'
      ? [
          new Phaser.Math.Vector2(820, 150 + config.index * 86),
          new Phaser.Math.Vector2(670, 170 + config.index * 72),
          new Phaser.Math.Vector2(770, 520 - config.index * 62),
        ]
      : [];

    return {
      id: config.id,
      team: config.team,
      kind: config.kind,
      loadoutName: isPlayer ? loadout.name : config.team === 'blue' ? 'SUPPORT' : 'STANDARD',
      index: config.index,
      x: config.x,
      y: config.y,
      radius: UNIT_RADIUS,
      hp: 100,
      maxHp: 100,
      shieldEnergy: isPlayer ? loadout.maxShieldEnergy : 100,
      maxShieldEnergy: isPlayer ? loadout.maxShieldEnergy : 100,
      shieldActive: false,
      shieldDrainRate: isPlayer ? loadout.shieldDrainRate : 28,
      shieldRegenRate: isPlayer ? loadout.shieldRegenRate : 19,
      shieldMitigation: isPlayer ? loadout.shieldMitigation : 0.42,
      visionRange: isPlayer ? loadout.visionRange : VISION_RANGE,
      speed: isPlayer ? loadout.speed : 158,
      facing: config.team === 'blue' ? 0 : Math.PI,
      rifleRange: isPlayer ? loadout.rifleRange : RIFLE_RANGE,
      rifleDamage: isPlayer ? loadout.rifleDamage : RIFLE_DAMAGE,
      rifleCooldownDuration: isPlayer ? loadout.rifleCooldownDuration : 0.34,
      rifleCooldown: 0,
      bladeRange: isPlayer ? loadout.bladeRange : BLADE_RANGE,
      bladeDamage: isPlayer ? loadout.bladeDamage : BLADE_DAMAGE,
      bladeCooldownDuration: isPlayer ? loadout.bladeCooldownDuration : 0.72,
      bladeCooldown: 0,
      dashCooldownDuration: isPlayer ? loadout.dashCooldownDuration : 1.45,
      dashCooldown: 0,
      dashVx: 0,
      dashVy: 0,
      alive: true,
      visibleToPlayer: config.team === 'blue',
      lastSeenAt: 0,
      goal: new Phaser.Math.Vector2(config.x, config.y),
      intent: config.kind === 'player' ? 'manual' : config.kind === 'ally' ? 'follow' : 'patrol',
      patrol,
      patrolIndex: 0,
      nextThinkAt: 0,
      lastHitAt: -9999,
      view: {
        root,
        body,
        core: coreDot,
        heading,
        hpBack,
        hpBar,
        shield,
        label,
      },
    };
  }

  private updateCooldowns(dt: number) {
    for (const unit of this.units) {
      if (!unit.alive) {
        continue;
      }
      unit.rifleCooldown = Math.max(0, unit.rifleCooldown - dt);
      unit.bladeCooldown = Math.max(0, unit.bladeCooldown - dt);
      unit.dashCooldown = Math.max(0, unit.dashCooldown - dt);
      const dashTime = this.dashTimerById.get(unit.id) ?? 0;

      if (dashTime > 0) {
        this.dashTimerById.set(unit.id, Math.max(0, dashTime - dt));
      } else {
        unit.dashVx = Phaser.Math.Linear(unit.dashVx, 0, 0.22);
        unit.dashVy = Phaser.Math.Linear(unit.dashVy, 0, 0.22);
      }

      if (unit.shieldActive) {
        unit.shieldEnergy = Math.max(0, unit.shieldEnergy - unit.shieldDrainRate * dt);
        if (unit.shieldEnergy <= 0) {
          unit.shieldActive = false;
        }
      } else {
        unit.shieldEnergy = Math.min(unit.maxShieldEnergy, unit.shieldEnergy + unit.shieldRegenRate * dt);
      }
    }
  }

  private handleLoadoutHotkeys() {
    const chosen =
      Phaser.Input.Keyboard.JustDown(this.keys.ONE) ? 'vanguard' :
      Phaser.Input.Keyboard.JustDown(this.keys.TWO) ? 'scout' :
      Phaser.Input.Keyboard.JustDown(this.keys.THREE) ? 'bulwark' :
      Phaser.Input.Keyboard.JustDown(this.keys.FOUR) ? 'striker' :
      undefined;

    if (!chosen) {
      return false;
    }

    this.selectedLoadoutId = chosen;
    this.resetRound();
    const player = this.getPlayer();
    if (player) {
      this.addFloatingText(player.x, player.y - 42, player.loadoutName, COLORS.good);
    }
    return true;
  }

  private handlePlayer(dt: number) {
    const player = this.getPlayer();
    if (!player || !player.alive) {
      return;
    }

    const pointer = this.input.activePointer;
    const aim = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    player.facing = aim;

    const vx = Number(this.keys.D.isDown) - Number(this.keys.A.isDown);
    const vy = Number(this.keys.S.isDown) - Number(this.keys.W.isDown);
    const move = new Phaser.Math.Vector2(vx, vy);

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      const dashDir = move.lengthSq() > 0 ? move.normalize() : new Phaser.Math.Vector2(Math.cos(aim), Math.sin(aim));
      this.tryDash(player, dashDir.x, dashDir.y);
    }

    player.shieldActive = this.keys.SHIFT.isDown || pointer.rightButtonDown();
    if (player.shieldEnergy <= 0) {
      player.shieldActive = false;
    }

    this.moveUnit(player, move.x, move.y, dt);

    if (pointer.leftButtonDown()) {
      this.fireRifle(player, aim, 0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.swingBlade(player);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) {
      this.issueRallyCommand(pointer.worldX, pointer.worldY);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
      this.issueFocusCommand(pointer.worldX, pointer.worldY);
    }
  }

  private updateAi(dt: number) {
    const now = this.elapsedMs;
    for (const unit of this.units) {
      if (!unit.alive || unit.kind === 'player') {
        continue;
      }

      if (now >= unit.nextThinkAt) {
        this.thinkForUnit(unit);
        unit.nextThinkAt = now + Phaser.Math.Between(180, 320);
      }

      const target = unit.targetId ? this.units.find((candidate) => candidate.id === unit.targetId && candidate.alive) : undefined;
      if (target) {
        unit.facing = Phaser.Math.Angle.Between(unit.x, unit.y, target.x, target.y);
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, target.x, target.y);
        const hasShot = this.hasLineOfSight(unit.x, unit.y, target.x, target.y, unit.rifleRange);
        const close = dist <= unit.bladeRange + 8;

        unit.shieldActive = hasShot && dist < 260 && unit.shieldEnergy > 18 && (unit.hp < 62 || unit.rifleCooldown > 0.25);

        if (hasShot && dist < unit.rifleRange && unit.rifleCooldown <= 0.08) {
          const pressure = unit.team === 'blue' ? 0.025 : 0.045;
          this.fireRifle(unit, unit.facing + Phaser.Math.FloatBetween(-pressure, pressure), unit.team === 'blue' ? 0.02 : 0.05);
        }

        if (close && unit.bladeCooldown <= 0.04) {
          this.swingBlade(unit);
        }

        if (dist < 90 && unit.dashCooldown <= 0) {
          const away = new Phaser.Math.Vector2(unit.x - target.x, unit.y - target.y).normalize();
          this.tryDash(unit, away.x, away.y);
        }
      } else {
        unit.shieldActive = false;
      }

      const toGoal = new Phaser.Math.Vector2(unit.goal.x - unit.x, unit.goal.y - unit.y);
      const distToGoal = toGoal.length();
      const move = distToGoal > 8 ? toGoal.normalize() : new Phaser.Math.Vector2(0, 0);
      this.moveUnit(unit, move.x, move.y, dt);
    }
  }

  private thinkForUnit(unit: CombatUnit) {
    if (this.squadCommand && this.squadCommand.expiresAt <= this.elapsedMs) {
      this.squadCommand = undefined;
    }

    if (unit.kind === 'ally' && this.squadCommand?.kind === 'focus') {
      const focusTargetId = this.squadCommand.targetId;
      const focusTarget = this.units.find((candidate) => (
        candidate.id === focusTargetId &&
        candidate.alive &&
        candidate.team !== unit.team &&
        candidate.visibleToPlayer
      ));
      if (focusTarget) {
        unit.targetId = focusTarget.id;
        const coverGoal = this.findCoverGoal(unit, focusTarget);
        if (coverGoal) {
          this.setUnitIntent(unit, 'cover');
          unit.goal = coverGoal;
          return;
        }
        this.setUnitIntent(unit, 'attack');
        unit.goal = this.allyAttackGoal(unit, focusTarget);
        return;
      }
    }

    const visibleEnemies = this.units
      .filter((candidate) => candidate.alive && candidate.team !== unit.team)
      .filter((candidate) => this.hasLineOfSight(unit.x, unit.y, candidate.x, candidate.y, unit.visionRange));

    const target = this.pickTarget(unit, visibleEnemies);
    unit.targetId = target?.id;

    if (target) {
      const coverGoal = this.findCoverGoal(unit, target);
      if (coverGoal) {
        this.setUnitIntent(unit, 'cover');
        unit.goal = coverGoal;
        return;
      }
      this.setUnitIntent(unit, 'attack');
      unit.goal = unit.kind === 'ally'
        ? this.allyAttackGoal(unit, target)
        : this.opponentAttackGoal(unit, target);
      return;
    }

    if (unit.kind === 'ally') {
      if (this.squadCommand?.kind === 'rally') {
        unit.targetId = undefined;
        this.setUnitIntent(unit, 'rally');
        unit.goal = this.rallyGoal(unit, this.squadCommand.point);
        return;
      }

      const player = this.getPlayer();
      if (player && player.alive) {
        const offset = ALLY_OFFSETS[Math.max(0, unit.index - 1)] ?? new Phaser.Math.Vector2(-80, 0);
        this.setUnitIntent(unit, 'follow');
        unit.goal = new Phaser.Math.Vector2(player.x + offset.x, player.y + offset.y);
        unit.goal = this.clampToMap(unit.goal);
      }
      return;
    }

    const activeIntel = this.getMostRecentKnownBluePosition();
    if (activeIntel && Phaser.Math.Distance.Between(unit.x, unit.y, activeIntel.x, activeIntel.y) > 160) {
      const angle = Phaser.Math.Angle.Between(activeIntel.x, activeIntel.y, unit.x, unit.y);
      this.setUnitIntent(unit, 'attack');
      unit.goal = this.clampToMap(new Phaser.Math.Vector2(
        activeIntel.x + Math.cos(angle) * 205,
        activeIntel.y + Math.sin(angle) * 205,
      ));
      return;
    }

    const patrolTarget = unit.patrol[unit.patrolIndex];
    if (!patrolTarget || Phaser.Math.Distance.Between(unit.x, unit.y, patrolTarget.x, patrolTarget.y) < 24) {
      unit.patrolIndex = (unit.patrolIndex + 1) % Math.max(1, unit.patrol.length);
    }
    this.setUnitIntent(unit, 'patrol');
    unit.goal = unit.patrol[unit.patrolIndex]?.clone() ?? new Phaser.Math.Vector2(unit.x, unit.y);
  }

  private allyAttackGoal(unit: CombatUnit, target: CombatUnit) {
    const player = this.getPlayer();
    const reference = player && player.alive ? player : unit;
    const baseAngle = Phaser.Math.Angle.Between(target.x, target.y, reference.x, reference.y);
    const flank = unit.index % 2 === 0 ? 1 : -1;
    const spread = 0.72 + unit.index * 0.12;
    const desiredAngle = baseAngle + flank * spread;
    const range = 205 + unit.index * 18;
    return this.findOpenGoal(new Phaser.Math.Vector2(
      target.x + Math.cos(desiredAngle) * range,
      target.y + Math.sin(desiredAngle) * range,
    ));
  }

  private opponentAttackGoal(unit: CombatUnit, target: CombatUnit) {
    const baseAngle = Phaser.Math.Angle.Between(target.x, target.y, unit.x, unit.y);
    const range = 210 + (unit.index % 2) * 34;
    const side = unit.index % 2 === 0 ? -0.36 : 0.36;
    return this.findOpenGoal(new Phaser.Math.Vector2(
      target.x + Math.cos(baseAngle + side) * range,
      target.y + Math.sin(baseAngle + side) * range,
    ));
  }

  private rallyGoal(unit: CombatUnit, point: Phaser.Math.Vector2) {
    const slots = [
      new Phaser.Math.Vector2(-44, -44),
      new Phaser.Math.Vector2(-62, 0),
      new Phaser.Math.Vector2(-44, 44),
    ];
    const slot = slots[Math.max(0, unit.index - 1)] ?? new Phaser.Math.Vector2(-52, 0);
    return this.findOpenGoal(new Phaser.Math.Vector2(point.x + slot.x, point.y + slot.y));
  }

  private findCoverGoal(unit: CombatUnit, target: CombatUnit) {
    if (!this.shouldSeekCover(unit, target)) {
      return undefined;
    }

    const wantsFullCover = unit.hp < 52 || unit.shieldEnergy < 28;
    const candidates = this.getCoverCandidates()
      .map((point) => {
        const distanceFromUnit = Phaser.Math.Distance.Between(unit.x, unit.y, point.x, point.y);
        const distanceFromTarget = Phaser.Math.Distance.Between(target.x, target.y, point.x, point.y);
        const targetCanShoot = this.hasLineOfSight(target.x, target.y, point.x, point.y, target.rifleRange);
        const canReturnFire = this.hasLineOfSight(point.x, point.y, target.x, target.y, unit.rifleRange);
        const hasSpacing = this.hasSquadSpacing(unit, point);
        const hidden = !targetCanShoot;
        const score =
          distanceFromUnit +
          Math.abs(distanceFromTarget - 230) * 0.42 +
          (hidden ? -150 : 0) +
          (canReturnFire ? -42 : 0) +
          (hasSpacing ? 0 : 120);

        return {
          point,
          canReturnFire,
          distanceFromTarget,
          hidden,
          score,
        };
      })
      .filter(({ distanceFromTarget }) => distanceFromTarget > 95 && distanceFromTarget < unit.rifleRange + 90);

    const hiddenCover = candidates
      .filter(({ hidden }) => hidden)
      .sort((a, b) => a.score - b.score)[0];
    if (wantsFullCover && hiddenCover) {
      return hiddenCover.point;
    }

    const coveredAngle = candidates
      .filter(({ canReturnFire, distanceFromTarget }) => canReturnFire && distanceFromTarget > 145 && distanceFromTarget < unit.rifleRange)
      .sort((a, b) => a.score - b.score)[0];
    return coveredAngle?.point ?? hiddenCover?.point;
  }

  private shouldSeekCover(unit: CombatUnit, target: CombatUnit) {
    const incoming = this.hasLineOfSight(target.x, target.y, unit.x, unit.y, target.rifleRange);
    if (!incoming) {
      return false;
    }

    const distance = Phaser.Math.Distance.Between(unit.x, unit.y, target.x, target.y);
    const lowHp = unit.hp < 64;
    const weakShield = unit.shieldEnergy < 35 && unit.hp < 84;
    const caughtClose = distance < 125 && unit.dashCooldown > 0.35;
    const recovering = unit.hp < 78 && unit.rifleCooldown > unit.rifleCooldownDuration * 0.65;
    return lowHp || weakShield || caughtClose || recovering;
  }

  private getCoverCandidates() {
    const points: Phaser.Math.Vector2[] = [];
    for (const rect of this.coverRects) {
      const left = rect.left - COVER_POINT_OFFSET;
      const right = rect.right + COVER_POINT_OFFSET;
      const top = rect.top - COVER_POINT_OFFSET;
      const bottom = rect.bottom + COVER_POINT_OFFSET;
      const centerX = rect.centerX;
      const centerY = rect.centerY;
      points.push(
        new Phaser.Math.Vector2(left, top),
        new Phaser.Math.Vector2(centerX, top),
        new Phaser.Math.Vector2(right, top),
        new Phaser.Math.Vector2(left, centerY),
        new Phaser.Math.Vector2(right, centerY),
        new Phaser.Math.Vector2(left, bottom),
        new Phaser.Math.Vector2(centerX, bottom),
        new Phaser.Math.Vector2(right, bottom),
      );
    }

    return points
      .map((point) => this.clampToMap(point))
      .filter((point) => !this.circleHitsCover(point.x, point.y, UNIT_RADIUS + 5));
  }

  private hasSquadSpacing(unit: CombatUnit, point: Phaser.Math.Vector2) {
    return !this.units.some((other) => (
      other.alive &&
      other.team === unit.team &&
      other.id !== unit.id &&
      Phaser.Math.Distance.Between(point.x, point.y, other.x, other.y) < UNIT_RADIUS * 2.6
    ));
  }

  private setUnitIntent(unit: CombatUnit, intent: UnitIntent) {
    if (unit.intent !== 'cover' && intent === 'cover' && unit.team === 'blue') {
      this.roundStats.coverMoves += 1;
    }
    unit.intent = intent;
  }

  private pickTarget(unit: CombatUnit, candidates: CombatUnit[]) {
    if (candidates.length === 0) {
      return undefined;
    }

    return candidates
      .map((candidate) => ({
        candidate,
        score:
          Phaser.Math.Distance.Between(unit.x, unit.y, candidate.x, candidate.y) +
          (candidate.kind === 'player' ? -25 : 0) +
          candidate.hp * 0.35,
      }))
      .sort((a, b) => a.score - b.score)[0].candidate;
  }

  private moveUnit(unit: CombatUnit, vx: number, vy: number, dt: number) {
    if (!unit.alive) {
      return;
    }

    const move = new Phaser.Math.Vector2(vx, vy);
    if (move.lengthSq() > 1) {
      move.normalize();
    }

    const shieldFactor = unit.shieldActive ? 0.68 : 1;
    const dx = (move.x * unit.speed * shieldFactor + unit.dashVx) * dt;
    const dy = (move.y * unit.speed * shieldFactor + unit.dashVy) * dt;

    this.tryMoveAxis(unit, dx, 0);
    this.tryMoveAxis(unit, 0, dy);
  }

  private tryMoveAxis(unit: CombatUnit, dx: number, dy: number) {
    const nextX = Phaser.Math.Clamp(unit.x + dx, MAP.left + unit.radius, MAP.right - unit.radius);
    const nextY = Phaser.Math.Clamp(unit.y + dy, MAP.top + unit.radius, MAP.bottom - unit.radius);

    if (!this.circleHitsCover(nextX, nextY, unit.radius)) {
      unit.x = nextX;
      unit.y = nextY;
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      unit.dashVx = 0;
    } else {
      unit.dashVy = 0;
    }
  }

  private tryDash(unit: CombatUnit, vx: number, vy: number) {
    if (unit.dashCooldown > 0 || unit.shieldActive) {
      return;
    }

    const dir = new Phaser.Math.Vector2(vx, vy);
    if (dir.lengthSq() === 0) {
      return;
    }
    dir.normalize();

    unit.dashVx = dir.x * DASH_SPEED;
    unit.dashVy = dir.y * DASH_SPEED;
    unit.dashCooldown = unit.dashCooldownDuration;
    this.dashTimerById.set(unit.id, DASH_TIME);
  }

  private fireRifle(shooter: CombatUnit, angle: number, miss: number) {
    if (!shooter.alive || shooter.rifleCooldown > 0) {
      return;
    }

    shooter.rifleCooldown = shooter.rifleCooldownDuration;
    if (shooter.team === 'blue') {
      this.roundStats.shotsFired += 1;
    }
    const firedAngle = angle + Phaser.Math.FloatBetween(-miss, miss);
    const start = new Phaser.Math.Vector2(shooter.x + Math.cos(firedAngle) * (shooter.radius + 5), shooter.y + Math.sin(firedAngle) * (shooter.radius + 5));
    const end = this.traceRay(start.x, start.y, firedAngle, shooter.rifleRange);
      const hit = this.findShotHit(shooter, start, end);
    const shotEnd = hit ? new Phaser.Math.Vector2(hit.x, hit.y) : end;

    this.drawShot(start.x, start.y, shotEnd.x, shotEnd.y, shooter.team === 'blue' ? COLORS.blue : COLORS.red);

    if (hit) {
      const crossfire = this.hasCrossfire(shooter, hit);
      const damage = shooter.rifleDamage + (crossfire ? 9 : 0);
      if (shooter.team === 'blue') {
        this.roundStats.rifleHits += 1;
        if (crossfire) {
          this.roundStats.crossfireHits += 1;
        }
      }
      this.applyDamage(hit, damage, shooter, crossfire ? 'CROSSFIRE' : undefined);
    }
  }

  private findShotHit(shooter: CombatUnit, start: Phaser.Math.Vector2, end: Phaser.Math.Vector2, visibleOnly = false) {
    const shotLine = new Phaser.Geom.Line(start.x, start.y, end.x, end.y);
    return this.units
      .filter((unit) => unit.alive && unit.team !== shooter.team)
      .filter((unit) => !visibleOnly || unit.visibleToPlayer || unit.team === 'blue')
      .map((unit) => {
        const distanceToLine = this.distanceToSegment(unit.x, unit.y, shotLine.x1, shotLine.y1, shotLine.x2, shotLine.y2);
        const along = Phaser.Math.Distance.Between(start.x, start.y, unit.x, unit.y);
        return { unit, distanceToLine, along };
      })
      .filter(({ unit, distanceToLine }) => distanceToLine <= unit.radius + 5 && this.hasLineOfSight(start.x, start.y, unit.x, unit.y, shooter.rifleRange))
      .sort((a, b) => a.along - b.along)[0]?.unit;
  }

  private swingBlade(attacker: CombatUnit) {
    if (!attacker.alive || attacker.bladeCooldown > 0) {
      return;
    }
    attacker.bladeCooldown = attacker.bladeCooldownDuration;

    const arcStart = attacker.facing - 0.72;
    const arcEnd = attacker.facing + 0.72;
    this.shotLayer.lineStyle(3, attacker.team === 'blue' ? COLORS.blueCore : COLORS.redCore, 0.68);
    this.shotLayer.beginPath();
    this.shotLayer.arc(attacker.x, attacker.y, attacker.bladeRange, arcStart, arcEnd);
    this.shotLayer.strokePath();
    this.time.delayedCall(110, () => this.shotLayer.clear());

    for (const target of this.units) {
      if (!target.alive || target.team === attacker.team) {
        continue;
      }
      const dist = Phaser.Math.Distance.Between(attacker.x, attacker.y, target.x, target.y);
      const angle = Phaser.Math.Angle.Between(attacker.x, attacker.y, target.x, target.y);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(angle - attacker.facing));
      if (dist <= attacker.bladeRange + target.radius && diff <= 0.8 && this.hasLineOfSight(attacker.x, attacker.y, target.x, target.y, attacker.bladeRange + 20)) {
        this.applyDamage(target, attacker.bladeDamage, attacker, 'BLADE');
      }
    }
  }

  private applyDamage(target: CombatUnit, amount: number, attacker: CombatUnit, tag?: string) {
    const incomingAngle = Phaser.Math.Angle.Between(target.x, target.y, attacker.x, attacker.y);
    const frontDiff = Math.abs(Phaser.Math.Angle.Wrap(incomingAngle - target.facing));
    const shielded = target.shieldActive && target.shieldEnergy > 0 && frontDiff < 1.35;
    const finalDamage = shielded ? amount * target.shieldMitigation : amount;

    target.hp = Math.max(0, target.hp - finalDamage);
    target.lastHitAt = this.elapsedMs;
    this.flashUnit(target, shielded ? 0xffd36a : 0xffffff);

    if (attacker.team === 'blue' && target.team === 'red') {
      this.roundStats.damageDealt += finalDamage;
      if (tag === 'BLADE') {
        this.roundStats.bladeHits += 1;
      }
    } else if (attacker.team === 'red' && target.team === 'blue') {
      this.roundStats.damageTaken += finalDamage;
    }

    if (tag) {
      this.addFloatingText(target.x, target.y - 34, tag, tag === 'CROSSFIRE' ? COLORS.good : COLORS.warn);
    }

    if (target.hp <= 0) {
      target.alive = false;
      target.shieldActive = false;
      target.view.root.setVisible(false);
      this.addFloatingText(target.x, target.y, 'DOWN', COLORS.danger);
    }
  }

  private hasCrossfire(shooter: CombatUnit, target: CombatUnit) {
    const shooterAngle = Phaser.Math.Angle.Between(target.x, target.y, shooter.x, shooter.y);
    return this.units.some((ally) => {
      if (!ally.alive || ally.team !== shooter.team || ally.id === shooter.id) {
        return false;
      }
      if (!this.hasLineOfSight(ally.x, ally.y, target.x, target.y, ally.visionRange)) {
        return false;
      }
      const allyAngle = Phaser.Math.Angle.Between(target.x, target.y, ally.x, ally.y);
      return Math.abs(Phaser.Math.Angle.Wrap(shooterAngle - allyAngle)) > 0.72;
    });
  }

  private updateVisibility() {
    const blueUnits = this.units.filter((unit) => unit.alive && unit.team === 'blue');
    for (const unit of this.units) {
      if (unit.team === 'blue') {
        unit.visibleToPlayer = true;
        continue;
      }

      const visible = blueUnits.some((ally) => this.hasLineOfSight(ally.x, ally.y, unit.x, unit.y, ally.visionRange));
      unit.visibleToPlayer = visible;
      if (visible) {
        unit.lastSeenByPlayer = new Phaser.Math.Vector2(unit.x, unit.y);
        unit.lastSeenAt = this.elapsedMs;
      }
    }
  }

  private updateUnitViews() {
    for (const unit of this.units) {
      const visible = unit.alive && (unit.team === 'blue' || unit.visibleToPlayer);
      unit.view.root.setPosition(unit.x, unit.y);
      unit.view.root.setVisible(visible);
      unit.view.heading.setRotation(unit.facing);
      unit.view.body.setAlpha(unit.lastHitAt + 120 > this.elapsedMs ? 1 : 0.94);
      unit.view.shield.setAlpha(unit.shieldActive ? 0.44 : 0);
      unit.view.shield.setStrokeStyle(2, unit.team === 'blue' ? COLORS.blue : COLORS.red, unit.shieldActive ? 0.86 : 0);
      unit.view.hpBar.width = 34 * (unit.hp / unit.maxHp);
      unit.view.hpBar.setFillStyle(unit.hp > 45 ? 0x9ff6c7 : 0xff7886, 1);
      unit.view.label.setAlpha(unit.kind === 'player' ? 1 : 0.86);
    }
  }

  private drawVision() {
    this.visionLayer.clear();
    this.visionLayer.fillStyle(0x020609, 0.16);
    this.visionLayer.fillRect(MAP.x, MAP.y, MAP.width, MAP.height);

    for (const unit of this.units) {
      if (!unit.alive || unit.team !== 'blue') {
        continue;
      }
      this.visionLayer.fillStyle(COLORS.blue, unit.kind === 'player' ? 0.055 : 0.035);
      this.visionLayer.fillCircle(unit.x, unit.y, unit.visionRange);
      this.visionLayer.lineStyle(1, COLORS.blue, unit.kind === 'player' ? 0.2 : 0.11);
      this.visionLayer.strokeCircle(unit.x, unit.y, unit.visionRange);
    }
  }

  private drawIntel() {
    this.intelLayer.clear();
    const staleAfter = 9000;
    for (const unit of this.units) {
      if (unit.team !== 'red' || unit.alive === false || unit.visibleToPlayer || !unit.lastSeenByPlayer) {
        continue;
      }
      const age = this.elapsedMs - unit.lastSeenAt;
      if (age > staleAfter) {
        continue;
      }
      const alpha = 0.48 * (1 - age / staleAfter);
      this.intelLayer.lineStyle(1, COLORS.red, alpha);
      this.intelLayer.strokeCircle(unit.lastSeenByPlayer.x, unit.lastSeenByPlayer.y, 14);
      this.intelLayer.lineBetween(unit.lastSeenByPlayer.x - 8, unit.lastSeenByPlayer.y, unit.lastSeenByPlayer.x + 8, unit.lastSeenByPlayer.y);
      this.intelLayer.lineBetween(unit.lastSeenByPlayer.x, unit.lastSeenByPlayer.y - 8, unit.lastSeenByPlayer.x, unit.lastSeenByPlayer.y + 8);
    }
  }

  private drawTacticalOverlay() {
    this.tacticalLayer.clear();
    const player = this.getPlayer();
    if (!player?.alive) {
      this.commandText.setText('');
      return;
    }

    const threatLanes = this.getVisibleThreatLanes();
    for (const lane of threatLanes) {
      const targetsPlayer = lane.target.kind === 'player';
      this.tacticalLayer.lineStyle(targetsPlayer ? 2 : 1, COLORS.red, targetsPlayer ? 0.5 : 0.22);
      this.tacticalLayer.lineBetween(lane.enemy.x, lane.enemy.y, lane.target.x, lane.target.y);
      if (targetsPlayer) {
        this.tacticalLayer.lineStyle(1, COLORS.red, 0.64);
        this.tacticalLayer.strokeCircle(lane.target.x, lane.target.y, 28);
      } else {
        this.tacticalLayer.lineStyle(1, COLORS.red, 0.26);
        this.tacticalLayer.strokeCircle(lane.target.x, lane.target.y, 19);
      }
    }

    const pointer = this.input.activePointer;
    const aim = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    const start = new Phaser.Math.Vector2(
      player.x + Math.cos(aim) * (player.radius + 8),
      player.y + Math.sin(aim) * (player.radius + 8),
    );
    const end = this.traceRay(start.x, start.y, aim, player.rifleRange);
    const hit = this.findShotHit(player, start, end, true);
    const canHit = Boolean(hit);
    const crossfire = hit ? this.hasCrossfire(player, hit) : false;
    const color = crossfire ? 0x9ff6c7 : canHit ? COLORS.red : COLORS.blue;
    const alpha = canHit ? 0.62 : 0.36;

    this.tacticalLayer.lineStyle(1, color, alpha);
    this.tacticalLayer.lineBetween(start.x, start.y, end.x, end.y);
    this.tacticalLayer.fillStyle(color, canHit ? 0.72 : 0.38);
    this.tacticalLayer.fillCircle(hit?.x ?? end.x, hit?.y ?? end.y, canHit ? 5 : 3);

    if (hit) {
      this.tacticalLayer.lineStyle(1, color, crossfire ? 0.74 : 0.42);
      this.tacticalLayer.strokeCircle(hit.x, hit.y, crossfire ? 24 : 18);
    }

    if (this.squadCommand && this.squadCommand.expiresAt <= this.elapsedMs) {
      this.squadCommand = undefined;
    }

    if (this.squadCommand?.kind === 'rally') {
      const remaining = Math.max(0, Math.ceil((this.squadCommand.expiresAt - this.elapsedMs) / 1000));
      this.tacticalLayer.lineStyle(2, 0x9ff6c7, 0.72);
      this.tacticalLayer.strokeCircle(this.squadCommand.point.x, this.squadCommand.point.y, 24);
      this.tacticalLayer.lineStyle(1, 0x9ff6c7, 0.34);
      for (const ally of this.units.filter((unit) => unit.alive && unit.kind === 'ally')) {
        this.tacticalLayer.lineBetween(ally.x, ally.y, this.squadCommand.point.x, this.squadCommand.point.y);
      }
      this.commandText.setText(`Q RALLY ACTIVE ${remaining}s    F MARK VISIBLE TARGET\n${this.getLoadoutHint()}`);
    } else if (this.squadCommand?.kind === 'focus') {
      const focusTargetId = this.squadCommand.targetId;
      const target = this.units.find((unit) => unit.id === focusTargetId && unit.alive);
      const remaining = Math.max(0, Math.ceil((this.squadCommand.expiresAt - this.elapsedMs) / 1000));
      if (target?.visibleToPlayer) {
        this.tacticalLayer.lineStyle(2, 0x9ff6c7, 0.78);
        this.tacticalLayer.strokeCircle(target.x, target.y, 30);
        this.tacticalLayer.lineStyle(1, 0x9ff6c7, 0.36);
        for (const ally of this.units.filter((unit) => unit.alive && unit.kind === 'ally')) {
          this.tacticalLayer.lineBetween(ally.x, ally.y, target.x, target.y);
        }
      }
      this.commandText.setText(`F FOCUS ACTIVE ${remaining}s    Q RALLY CURSOR\n${this.getLoadoutHint()}`);
    } else {
      this.commandText.setText(`Q RALLY CURSOR    F FOCUS VISIBLE TARGET    H HELP\n${this.getLoadoutHint()}`);
    }

    for (const unit of this.units) {
      const visible = unit.alive && unit.intent === 'cover' && (unit.team === 'blue' || unit.visibleToPlayer);
      if (!visible) {
        continue;
      }

      this.tacticalLayer.lineStyle(1, 0xffd36a, unit.team === 'blue' ? 0.58 : 0.34);
      this.tacticalLayer.strokeCircle(unit.goal.x, unit.goal.y, 15);
      this.tacticalLayer.lineBetween(unit.x, unit.y, unit.goal.x, unit.goal.y);
    }
  }

  private issueRallyCommand(x: number, y: number) {
    if (!MAP.contains(x, y)) {
      return;
    }

    const point = this.findOpenGoal(new Phaser.Math.Vector2(x, y));
    this.squadCommand = {
      kind: 'rally',
      point,
      issuedAt: this.elapsedMs,
      expiresAt: this.elapsedMs + COMMAND_DURATION,
    };
    this.roundStats.commandsIssued += 1;
    this.wakeAllies();
    this.addFloatingText(point.x, point.y - 24, 'RALLY', COLORS.good);
  }

  private issueFocusCommand(x: number, y: number) {
    const target = this.getVisibleEnemyNear(x, y, 96);
    if (!target) {
      this.addFloatingText(x, y - 18, 'NO MARK', COLORS.muted);
      return;
    }

    this.squadCommand = {
      kind: 'focus',
      targetId: target.id,
      issuedAt: this.elapsedMs,
      expiresAt: this.elapsedMs + FOCUS_DURATION,
    };
    this.roundStats.commandsIssued += 1;
    this.wakeAllies();
    this.addFloatingText(target.x, target.y - 34, 'FOCUS', COLORS.good);
  }

  private getVisibleEnemyNear(x: number, y: number, radius: number) {
    return this.units
      .filter((unit) => unit.alive && unit.team === 'red' && unit.visibleToPlayer)
      .map((unit) => ({
        unit,
        dist: Phaser.Math.Distance.Between(x, y, unit.x, unit.y),
      }))
      .filter(({ dist }) => dist <= radius)
      .sort((a, b) => a.dist - b.dist)[0]?.unit;
  }

  private wakeAllies() {
    for (const ally of this.units) {
      if (ally.alive && ally.kind === 'ally') {
        ally.nextThinkAt = 0;
      }
    }
  }

  private updateExposureStats(dt: number) {
    const player = this.getPlayer();
    if (!player?.alive) {
      return;
    }

    const playerExposed = this.getVisibleThreatLanes().some((lane) => lane.target.id === player.id);
    if (playerExposed) {
      this.roundStats.exposureSeconds += dt;
    }
  }

  private getVisibleThreatLanes(): ThreatLane[] {
    const enemies = this.units.filter((unit) => unit.alive && unit.team === 'red' && unit.visibleToPlayer);
    const blueUnits = this.units.filter((unit) => unit.alive && unit.team === 'blue');
    const lanes: ThreatLane[] = [];

    for (const enemy of enemies) {
      for (const target of blueUnits) {
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);
        if (this.hasLineOfSight(enemy.x, enemy.y, target.x, target.y, enemy.rifleRange)) {
          lanes.push({ enemy, target, distance });
        }
      }
    }

    return lanes.sort((a, b) => {
      const playerBias = Number(b.target.kind === 'player') - Number(a.target.kind === 'player');
      return playerBias || a.distance - b.distance;
    });
  }

  private createRoundStats(): RoundStats {
    return {
      shotsFired: 0,
      rifleHits: 0,
      bladeHits: 0,
      crossfireHits: 0,
      damageDealt: 0,
      damageTaken: 0,
      commandsIssued: 0,
      coverMoves: 0,
      exposureSeconds: 0,
    };
  }

  private getSelectedLoadout() {
    return PLAYER_LOADOUTS.find((loadout) => loadout.id === this.selectedLoadoutId) ?? PLAYER_LOADOUTS[0];
  }

  private getLoadoutHint() {
    const selected = this.getSelectedLoadout();
    return `${PLAYER_LOADOUTS.map((loadout) => `${loadout.key} ${loadout.name}`).join('   ')}    SELECTED ${selected.name}: ${selected.note}`;
  }

  private createHelpOverlay() {
    const panelW = 760;
    const panelH = 520;
    const panelX = WORLD_W / 2;
    const panelY = WORLD_H / 2;
    const panelLeft = panelX - panelW / 2;
    const panelTop = panelY - panelH / 2;

    const container = this.add.container(0, 0).setDepth(20).setVisible(false);

    const backdrop = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x02080c, 0.78);
    const panel = this.add.graphics();
    panel.fillStyle(0x061216, 0.96);
    panel.fillRoundedRect(panelLeft, panelTop, panelW, panelH, 10);
    panel.lineStyle(2, COLORS.blue, 0.42);
    panel.strokeRoundedRect(panelLeft + 0.5, panelTop + 0.5, panelW - 1, panelH - 1, 10);

    const title = this.add.text(panelX, panelTop + 28, '操作方法', {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '22px',
      color: COLORS.good,
    }).setOrigin(0.5);

    const body = this.add.text(panelLeft + 32, panelTop + 62, HELP_TEXT, {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '13px',
      color: COLORS.text,
      lineSpacing: 6,
      wordWrap: { width: panelW - 64 },
    });

    const footer = this.add.text(panelX, panelTop + panelH - 24, 'H または Enter / クリックで閉じる', {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '12px',
      color: COLORS.muted,
    }).setOrigin(0.5);

    container.add([backdrop, panel, title, body, footer]);
    this.helpOverlay = container;
  }

  private setHelpVisible(visible: boolean) {
    this.helpVisible = visible;
    this.helpOverlay?.setVisible(visible);
    if (!visible) {
      this.helpDismissedSession = true;
    }
  }

  private handleHelpInput() {
    const toggleHelp = Phaser.Input.Keyboard.JustDown(this.keys.H);
    const closeHelp = Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.ESC);
    const clickClose = this.helpVisible && this.helpPointerJustDown;
    this.helpPointerJustDown = false;

    if (toggleHelp) {
      this.setHelpVisible(!this.helpVisible);
      return this.helpVisible;
    }

    if (this.helpVisible && (closeHelp || clickClose)) {
      this.setHelpVisible(false);
    }

    return this.helpVisible;
  }

  private drawHud() {
    const blueAlive = this.units.filter((unit) => unit.team === 'blue' && unit.alive).length;
    const redAlive = this.units.filter((unit) => unit.team === 'red' && unit.alive).length;
    const player = this.getPlayer();
    const seconds = Math.ceil(this.roundTime);
    this.hudText.setText(`ROUND 01    BLUE ${blueAlive}  /  RED ${redAlive}    ${seconds}s`);

    if (this.roundOver) {
      this.statusText.setText('ROUND COMPLETE');
    } else if (redAlive === 0) {
      this.statusText.setText('AREA CLEAR');
    } else if (blueAlive === 0 || !player?.alive) {
      this.statusText.setText('SQUAD LOST');
    } else {
      const seen = this.units.filter((unit) => unit.team === 'red' && unit.visibleToPlayer && unit.alive).length;
      const threatLanes = this.getVisibleThreatLanes();
      const playerExposed = player ? threatLanes.some((lane) => lane.target.id === player.id) : false;
      if (playerExposed) {
        this.statusText.setText(`EXPOSED ${threatLanes.length} LANES`);
      } else {
        this.statusText.setText(seen > 0 ? `CONTACTS ${seen}  COVERED` : 'NO CONTACT');
      }
    }

    if (player) {
      const hp = Math.max(0, Math.round(player.hp));
      const shield = Math.round(player.shieldEnergy);
      const dash = player.dashCooldown <= 0 ? 'READY' : `${player.dashCooldown.toFixed(1)}s`;
      const rifle = player.rifleCooldown <= 0 ? 'READY' : 'CYCLING';
      const blade = player.bladeCooldown <= 0 ? 'READY' : `${player.bladeCooldown.toFixed(1)}s`;
      const exposed = Math.round(this.roundStats.exposureSeconds);
      this.playerText.setText(`${player.loadoutName}    HP ${hp}    SHIELD ${shield}/${Math.round(player.maxShieldEnergy)}    DASH ${dash}    RIFLE ${rifle}    BLADE ${blade}    EXPOSED ${exposed}s`);
    }

    this.uiLayer.clear();
    if (player) {
      this.drawBar(24, WORLD_H - 54, 170, 6, player.hp / player.maxHp, 0x9ff6c7);
      this.drawBar(206, WORLD_H - 54, 120, 6, player.shieldEnergy / player.maxShieldEnergy, 0x46d7ff);
      this.drawBar(338, WORLD_H - 54, 72, 6, player.dashCooldown <= 0 ? 1 : 1 - player.dashCooldown / player.dashCooldownDuration, 0xffd36a);
    }
  }

  private drawBar(x: number, y: number, width: number, height: number, pct: number, color: number) {
    this.uiLayer.fillStyle(0x10242a, 0.9);
    this.uiLayer.fillRect(x, y, width, height);
    this.uiLayer.fillStyle(color, 0.95);
    this.uiLayer.fillRect(x, y, width * Phaser.Math.Clamp(pct, 0, 1), height);
  }

  private drawMinimap() {
    const mx = WORLD_W - 190;
    const my = 16;
    const mw = 162;
    const mh = 102;
    const sx = mw / MAP.width;
    const sy = mh / MAP.height;
    const mapX = (x: number) => mx + (x - MAP.x) * sx;
    const mapY = (y: number) => my + (y - MAP.y) * sy;

    this.minimapLayer.clear();
    this.minimapLayer.fillStyle(0x071016, 0.86);
    this.minimapLayer.fillRect(mx, my, mw, mh);
    this.minimapLayer.lineStyle(1, COLORS.blue, 0.28);
    this.minimapLayer.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);

    this.minimapLayer.fillStyle(0x263c44, 0.9);
    for (const rect of this.coverRects) {
      this.minimapLayer.fillRect(mapX(rect.x), mapY(rect.y), rect.width * sx, rect.height * sy);
    }

    for (const unit of this.units) {
      if (!unit.alive) {
        continue;
      }
      if (unit.team === 'blue') {
        this.minimapLayer.fillStyle(COLORS.blue, unit.kind === 'player' ? 1 : 0.82);
        this.minimapLayer.fillCircle(mapX(unit.x), mapY(unit.y), unit.kind === 'player' ? 3 : 2.4);
        continue;
      }
      if (unit.visibleToPlayer) {
        this.minimapLayer.fillStyle(COLORS.red, 0.92);
        this.minimapLayer.fillCircle(mapX(unit.x), mapY(unit.y), 2.7);
      } else if (unit.lastSeenByPlayer && this.elapsedMs - unit.lastSeenAt < 9000) {
        this.minimapLayer.lineStyle(1, COLORS.red, 0.42);
        this.minimapLayer.strokeCircle(mapX(unit.lastSeenByPlayer.x), mapY(unit.lastSeenByPlayer.y), 3);
      }
    }
  }

  private checkRoundEnd() {
    const blueAlive = this.units.some((unit) => unit.team === 'blue' && unit.alive);
    const redAlive = this.units.some((unit) => unit.team === 'red' && unit.alive);
    if (redAlive && blueAlive && this.roundTime > 0) {
      return;
    }

    this.roundOver = true;
    const message = redAlive ? 'DEFEAT' : 'VICTORY';
    const result = [
      message,
      `LOADOUT ${this.getSelectedLoadout().name}`,
      `DAMAGE ${Math.round(this.roundStats.damageDealt)} / TAKEN ${Math.round(this.roundStats.damageTaken)}`,
      `RIFLE ${this.roundStats.rifleHits}/${this.roundStats.shotsFired} / CROSSFIRE ${this.roundStats.crossfireHits}`,
      `BLADE ${this.roundStats.bladeHits} / COMMANDS ${this.roundStats.commandsIssued} / COVER ${this.roundStats.coverMoves}`,
      `EXPOSED ${Math.round(this.roundStats.exposureSeconds)}s`,
      'PRESS R',
    ].join('\n');
    this.resultText = this.add.text(WORLD_W / 2, WORLD_H / 2, result, {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '25px',
      color: message === 'VICTORY' ? COLORS.good : COLORS.danger,
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(11);
  }

  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number, range: number) {
    if (Phaser.Math.Distance.Between(x1, y1, x2, y2) > range) {
      return false;
    }

    const line = new Phaser.Geom.Line(x1, y1, x2, y2);
    return !this.coverRects.some((rect) => Phaser.Geom.Intersects.LineToRectangle(line, rect));
  }

  private traceRay(x: number, y: number, angle: number, range: number) {
    const step = 8;
    let last = new Phaser.Math.Vector2(x, y);
    for (let d = step; d <= range; d += step) {
      const px = x + Math.cos(angle) * d;
      const py = y + Math.sin(angle) * d;
      if (!MAP.contains(px, py) || this.pointHitsCover(px, py)) {
        return last;
      }
      last = new Phaser.Math.Vector2(px, py);
    }
    return new Phaser.Math.Vector2(x + Math.cos(angle) * range, y + Math.sin(angle) * range);
  }

  private circleHitsCover(x: number, y: number, radius: number) {
    return this.coverRects.some((rect) => {
      const closestX = Phaser.Math.Clamp(x, rect.left, rect.right);
      const closestY = Phaser.Math.Clamp(y, rect.top, rect.bottom);
      return Phaser.Math.Distance.Squared(x, y, closestX, closestY) < radius * radius;
    });
  }

  private pointHitsCover(x: number, y: number) {
    return this.coverRects.some((rect) => rect.contains(x, y));
  }

  private distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) {
      return Phaser.Math.Distance.Between(px, py, ax, ay);
    }

    const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / lengthSq, 0, 1);
    return Phaser.Math.Distance.Between(px, py, ax + t * dx, ay + t * dy);
  }

  private findOpenGoal(goal: Phaser.Math.Vector2) {
    const clamped = this.clampToMap(goal);
    if (!this.circleHitsCover(clamped.x, clamped.y, UNIT_RADIUS + 3)) {
      return clamped;
    }

    for (let radius = 32; radius <= 150; radius += 24) {
      for (let i = 0; i < 10; i += 1) {
        const angle = (Math.PI * 2 * i) / 10;
        const candidate = this.clampToMap(new Phaser.Math.Vector2(
          clamped.x + Math.cos(angle) * radius,
          clamped.y + Math.sin(angle) * radius,
        ));
        if (!this.circleHitsCover(candidate.x, candidate.y, UNIT_RADIUS + 3)) {
          return candidate;
        }
      }
    }

    return clamped;
  }

  private clampToMap(point: Phaser.Math.Vector2) {
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(point.x, MAP.left + UNIT_RADIUS, MAP.right - UNIT_RADIUS),
      Phaser.Math.Clamp(point.y, MAP.top + UNIT_RADIUS, MAP.bottom - UNIT_RADIUS),
    );
  }

  private drawShot(x1: number, y1: number, x2: number, y2: number, color: number) {
    this.shotLayer.lineStyle(2, color, 0.82);
    this.shotLayer.lineBetween(x1, y1, x2, y2);
    this.time.delayedCall(72, () => this.shotLayer.clear());
  }

  private flashUnit(unit: CombatUnit, color: number) {
    unit.view.core.setFillStyle(color, 1);
    this.time.delayedCall(85, () => {
      unit.view.core.setFillStyle(unit.team === 'blue' ? COLORS.blueCore : COLORS.redCore, 1);
    });
  }

  private addFloatingText(x: number, y: number, text: string, color: string) {
    const label = this.add.text(x, y, text, {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '12px',
      color,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: label,
      y: y - 22,
      alpha: 0,
      duration: 650,
      onComplete: () => label.destroy(),
    });
  }

  private getPlayer() {
    return this.units.find((unit) => unit.kind === 'player');
  }

  private getMostRecentKnownBluePosition() {
    const blue = this.units
      .filter((unit) => unit.alive && unit.team === 'blue')
      .sort((a, b) => b.lastHitAt - a.lastHitAt)[0];
    if (!blue || blue.lastHitAt < 0 || this.elapsedMs - blue.lastHitAt > 4500) {
      return undefined;
    }
    return blue ? new Phaser.Math.Vector2(blue.x, blue.y) : undefined;
  }
}
