# Tactical Clash

Small squad tactical arena game for GitHub Pages. The MVP is built around line-of-sight control, cover, fog-of-war, team positioning, and crossfire.

## Directory Structure

```text
tactical-clash/
  .github/workflows/deploy.yml   GitHub Pages build and deploy
  index.html                     Vite entry
  src/
    App.tsx                      React shell that mounts Phaser
    main.tsx                     React entry
    styles.css                   App frame styling
    game/
      ArenaScene.ts              MVP game scene and loop
      types.ts                   Small runtime types
  vite.config.ts                 Vite config with Pages base path
```

## MVP Scope

- 4v4 top-down arena.
- Player controls one lead unit.
- Three friendly AI units support and flank.
- Four opposing AI units patrol, seek contact, and attack.
- Round ends when either squad is eliminated.
- Weapons: rifle and blade.
- Defensive action: energy shield.
- Mobility action: dash.
- Tactical layer: cover blocks movement, line of sight, and rifle fire.
- Fog-of-war hides opposing units unless seen by the friendly squad.
- Minimap shows friendlies, visible opponents, and short-lived last-known intel.

## Implementation Priority

1. Playable arena with movement, collision, and round reset.
2. Reliable line-of-sight checks against cover rectangles.
3. Rifle, blade, dash, shield, and health.
4. Fog-of-war and minimap intel.
5. Simple AI: patrol, acquire visible targets, engage, flank.
6. Crossfire bonus to make positioning matter immediately.
7. Map tuning, unit balance, and UI clarity.
8. Additional loadout choices after the core combat loop feels good.

## Game Loop

1. Read player input.
2. Update cooldowns, shield energy, and dash velocity.
3. Move player with cover collision.
4. Think for AI units on short intervals.
5. Move AI units toward current goals.
6. Resolve attacks and damage.
7. Recompute squad visibility.
8. Redraw intel, minimap, HUD, and round state.

## Core Mechanics

- **Positioning:** cover breaks sight lines and forces lateral movement.
- **Information:** opposing units are only shown when at least one friendly unit has line of sight.
- **Crossfire:** rifle hits deal bonus damage when another friendly unit has a different sight angle on the same target.
- **Shield:** reduces frontal damage while draining energy and slowing movement.
- **Dash:** short reposition tool with cooldown; disabled while shielding.
- **Blade:** close burst damage for finishing or punishing overextension.
- **Squad Commands:** `Q` sends allies to a cursor rally point; `F` marks a visible enemy for focus and flanking.
- **Aim Preview:** the lead unit shows a rifle line so blocked lanes, clear lanes, and crossfire opportunities are readable before firing.
- **Threat Lanes:** visible enemies draw hostile sight lines against exposed friendly units.
- **Round Stats:** the result screen reports damage, rifle accuracy, crossfire hits, blade hits, commands, and exposure time.
- **Cover Seeking:** wounded or pressured AI units relocate toward nearby cover points instead of trading shots in place.

## Phaser Structure

- One Phaser scene for the MVP: `ArenaScene`.
- React only mounts and destroys the Phaser game.
- No asset pipeline yet; units, cover, shots, fog, and minimap are drawn with Phaser graphics primitives.
- World size is fixed at `1024x704`, scaled by Vite/Phaser to fit the browser.

## Entity Design

The MVP uses a small data object per unit instead of a heavy ECS.

```ts
CombatUnit = {
  team, kind, position, radius,
  hp, shieldEnergy,
  cooldowns,
  facing,
  goal,
  targetId,
  visibleToPlayer,
  lastSeenByPlayer,
  view
}
```

This keeps iteration fast. If the game grows, combat, sensing, and movement can be split after the rules stabilize.

## Line-Of-Sight Plan

- Cover is stored as axis-aligned rectangles.
- A sight check is a Phaser line segment from observer to target.
- If the line intersects any cover rectangle, sight is blocked.
- The same check is reused for rifle validity and AI target acquisition.
- Fog-of-war is team-based: any friendly unit can reveal an opposing unit for the player.
- Hostile threat lanes only draw from visible enemies, so hidden enemies do not leak perfect information.

## Simple AI Design

- Opponents patrol until they see a target.
- On contact, they move to a preferred rifle distance and fire when line of sight is clear.
- Friendly AI follows the player until contact.
- `Q` rally temporarily overrides following and moves friendly AI into a small formation around the cursor.
- `F` focus makes friendly AI prioritize the marked visible target and seek crossfire positions.
- On contact, friendly AI picks flank goals around the target to create crossfire angles.
- Under pressure, AI checks nearby cover points and moves to a safer angle or full cover.
- AI uses shields under pressure and dashes away from close threats.

## GitHub Pages Deploy

Deploy is handled by `.github/workflows/deploy.yml`.

Required repository settings:

1. Push to `main`.
2. In GitHub, set Pages source to GitHub Actions.
3. The workflow runs `npm ci` and `npm run build`.
4. Vite uses `/tactical-clash/` as the production base path during GitHub Actions.

## Local Commands

```bash
npm install
npm run dev
npm run build
```

Controls:

- Move: `W A S D`
- Aim: mouse
- Rifle: left mouse
- Shield: right mouse or `Shift`
- Dash: `Space`
- Blade: `E`
- Rally squad: `Q` at cursor
- Focus fire: `F` on visible enemy
- Restart round: `R`
