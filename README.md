# Naija City — Stage 05: Open-World Action RPG Foundation

Naija City is now being developed as a Nigerian-inspired, third-person open-world action RPG. The intended experience combines a living city, character progression, missions, exploration and a later third-person shooter layer.

## Stage 05 foundation
- Changes the product identity from a driving-first prototype to a third-person open-world action RPG.
- Adds an original cinematic HUD with district/minimap, objective, player level and vitals, loadout/ammo area and contextual navigation.
- Adds working Inventory, Missions, District Map, Character and Settings panels plus Pause/Resume.
- Adds a responsive mobile touch-control layout preview.
- Preserves legacy vehicle physics and traffic simulation in the codebase, but removes driving-first controls from the main presentation.
- Clearly labels future features: third-person character controller in Stage 06; combat, aiming and functional shooting in Stage 07; connected inventory/progression and mission state in later stages.

## Architecture direction
- `src/rpg-ui.js` and `src/rpg-ui.css`: presentation and menu interactions, separate from the PlayCanvas scene.
- `src/game.js`: existing PlayCanvas scene and preserved Stage 04 physics foundation.
- Stage 06: player character, locomotion, animation state machine, third-person camera orbit/aim modes, interactions and mobile movement input.
- Stage 07: combat state machine, aim/fire/reload, weapon definitions, projectile/hit feedback and enemy AI.
- Later RPG systems: item definitions, equipment slots, progression/XP, mission state and save schema.

## Design principles
The HUD prioritizes high-frequency gameplay information. Detailed inventory, map, mission and character data live in on-demand panels. The visual language uses dark translucent surfaces, restrained warm-metal accents and clear typography hierarchy. Mobile controls are thumb-zone aware. The design is original and genre-informed rather than copying proprietary game artwork or layouts.

## Run and verify
`npm install` → `npm run verify` → `npm run build` → `npm run analyze:bundle` → `npm run test:browser` → `npm run dev`

## Honest production status
Stage 05 is a foundation and UI/UX prototype, not a completed AAA game. The world is still a procedural blockout, the visible player is still the legacy vehicle, and the map, vitals, inventory and mission content are presentation data. The 3D player character, actual movement, shooting, enemy AI, NPC routines, persistent RPG data and production environment assets are not yet implemented. Headless browser checks do not establish real Android performance.