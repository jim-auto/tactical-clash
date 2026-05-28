import Phaser from 'phaser';

export type Team = 'blue' | 'red';
export type UnitKind = 'player' | 'ally' | 'opponent';
export type UnitIntent = 'manual' | 'follow' | 'rally' | 'attack' | 'cover' | 'patrol';

export interface ArenaRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UnitView {
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Arc;
  core: Phaser.GameObjects.Arc;
  heading: Phaser.GameObjects.Rectangle;
  hpBack: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  shield: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
}

export interface CombatUnit {
  id: string;
  team: Team;
  kind: UnitKind;
  index: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  shieldEnergy: number;
  maxShieldEnergy: number;
  shieldActive: boolean;
  speed: number;
  facing: number;
  rifleCooldown: number;
  bladeCooldown: number;
  dashCooldown: number;
  dashVx: number;
  dashVy: number;
  alive: boolean;
  visibleToPlayer: boolean;
  lastSeenByPlayer?: Phaser.Math.Vector2;
  lastSeenAt: number;
  goal: Phaser.Math.Vector2;
  intent: UnitIntent;
  patrol: Phaser.Math.Vector2[];
  patrolIndex: number;
  nextThinkAt: number;
  targetId?: string;
  lastHitAt: number;
  view: UnitView;
}
