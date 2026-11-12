# Naija City — Stage 07: Landscape Mobile HUD

Naija City is a Nigerian-inspired third-person open-world RPG prototype built with PlayCanvas.

## Stage 07 HUD
- Landscape-first mobile layout with a portrait rotation notice and a web-app manifest orientation hint.
- Left thumb zone: camera-relative virtual movement joystick.
- Right thumb zone: jump, hold-to-sprint, crouch toggle and contextual interact.
- Top-left: player level/status plus live health and stamina bars.
- Top-right: Yaba minimap and location indicator.
- Bottom centre: inventory, missions, map, player menu and three quick-access slots.
- Pause menu: resume, city map and settings.
- Safe-area-aware spacing for display cutouts and gesture areas.
- Touch controls remain separate from the scene-drag camera gesture.

## Controls
- Desktop: WASD / arrows move, Shift sprint, Space jump, C crouch, E interact, Escape pause, drag scene to orbit.
- Mobile landscape: left joystick moves; right buttons jump, hold sprint, toggle crouch and interact.
- Quick slots are UI placeholders until item data and persistence are implemented.

## Implementation notes
- Sprint drains stamina; stamina regenerates when not sprinting.
- Crouch lowers the player capsule's visual root and reduces movement speed.
- Interact checks proximity to the roadside kiosk and bus stop and gives contextual feedback. Vendor and transport interactions are not implemented yet.
- Health is a HUD placeholder and is not yet connected to a damage/health system.
- Inventory, missions and quick slots are interface foundations, not persistent gameplay systems.

## Architecture
- `src/third-person-controller.js`: locomotion, sprint/stamina, jump, crouch, touch/keyboard input and camera.
- `src/game.js`: PlayCanvas scene, traffic and contextual interact feedback.
- `src/rpg-ui.js` / `src/rpg-ui.css`: landscape HUD, menus, safe areas and touch controls.
- `scripts/browser-smoke.mjs`: landscape Chromium interaction smoke test plus portrait rotation notice check.

## Verify
`npm install` → `npm run verify` → `npm run build` → `npm run analyze:bundle` → `npm run test:browser`

## Honest status
The character remains a lightweight procedural placeholder, the city is still a blockout, and this browser test does not establish performance on a physical Android device. Health, inventory persistence, vendor transactions and transport interactions remain future work.
