# Naija City — Landscape Mobile HUD & Gameplay UX

Naija City is a Nigerian-inspired third-person open-world RPG prototype built with PlayCanvas.

## Landscape HUD
- Landscape-first mobile layout with a portrait rotation notice and web-app manifest orientation hint.
- Left thumb zone: camera-relative movement joystick.
- Right thumb zone: compact 2×2 action cluster for jump, hold-to-sprint, crouch and contextual interact.
- Upper edge: compact player status, Yaba district indicator and minimap.
- Centre: kept as clear as possible for the game world and camera movement.
- Active gameplay: no permanent bottom navigation row.
- Pause/menu screen: Resume, Inventory, Missions, City Map, Player and Settings.
- Bottom centre: three compact quick-access slots with visible selected-slot feedback.
- Safe-area-aware layout for display cutouts and gesture areas.

## Controls
- Desktop: WASD / arrows move, Shift sprint, Space jump, C crouch, E interact, Escape pause, drag scene to orbit.
- Mobile landscape: left joystick moves; right buttons jump, hold sprint, toggle crouch and interact.
- Tap the pause control to open menus. Quick slots currently provide selection feedback but do not contain persistent items.

## UX polish
- Grouped left/right thumb zones and responsive sizing for landscape phone aspect ratios.
- Primary action targets are at least 48 CSS px.
- Consistent dark translucent surfaces, restrained warm accent colour, clear focus outlines and pressed feedback.
- Developer diagnostics are hidden from the normal gameplay HUD.
- Reduced-motion preference is respected.

## Gameplay foundations and limitations
- Sprint drains stamina; stamina regenerates when not sprinting.
- Crouch changes player stance and movement speed.
- Interact checks proximity to the roadside kiosk and bus stop and gives contextual feedback. Vendor and transport systems are not implemented.
- Health remains a HUD placeholder; there is no damage system.
- Inventory, missions and quick slots are UI foundations; no persistent inventory or save system is implemented.

## Architecture
- `src/third-person-controller.js`: locomotion, sprint/stamina, jump, crouch, touch/keyboard input and camera.
- `src/game.js`: PlayCanvas scene, traffic and contextual interact feedback.
- `src/rpg-ui.js` / `src/rpg-ui.css`: HUD, menus, safe areas and touch controls.
- `scripts/browser-smoke.mjs`: landscape Chromium interaction smoke test plus portrait rotation notice check.

## Verify
`npm install` → `npm run verify` → `npm run build` → `npm run analyze:bundle` → `npm run test:browser`

## Honest status
The character remains a lightweight procedural placeholder and the city is still a blockout. Automated Chromium tests do not establish performance or ergonomics on every physical Android device. A real-device pass is still required for touch comfort, safe-area behavior and performance.
