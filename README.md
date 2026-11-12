# Naija City — Stage 06: Third-Person Character System

Naija City is a Nigerian-inspired third-person open-world action RPG prototype built with PlayCanvas.

## Stage 06 implemented
- Replaces the legacy player car with a visible human character assembled from lightweight PlayCanvas primitive meshes.
- Adds camera-relative walking and running, sprint input, jumping with gravity and ground contact, and movement bounds.
- Adds procedural idle/walk/run limb animation and a jump pose.
- Adds a smooth orbit-follow camera with drag-to-orbit on desktop and touch screens.
- Adds mobile movement joystick, jump button and hold-to-sprint control.
- Keeps the Stage 05 RPG HUD and menu system.
- Keeps the Yaba blockout, traffic routes and signal phases as environment simulation.
- Adds browser checks for actual joystick movement and jumping, not only static UI visibility.

## Controls
- Desktop: WASD / arrow keys to move, Shift to sprint, Space to jump, drag the scene to orbit the camera.
- Mobile: left virtual joystick to move, right-side ↑ button to jump, » button to sprint while held, drag the open scene area to orbit.

## Architecture
- `src/third-person-controller.js`: human character assembly, locomotion, procedural gait, jump physics, touch/keyboard input and orbit-follow camera.
- `src/game.js`: PlayCanvas city scene, traffic signal/AI and Stage 06 controller integration.
- `src/rpg-ui.js` and `src/rpg-ui.css`: Stage 05 RPG HUD and Stage 06 mobile action controls.

## Verify
`npm install` → `npm run verify` → `npm run build` → `npm run analyze:bundle` → `npm run test:browser` → `npm run dev`

## Honest status
The current human is a lightweight procedural placeholder assembled from primitive meshes. Its gait and jump poses are procedural, not a production skeletal animation rig. No external humanoid GLB, motion-capture clips, foot IK, ledge/step traversal, slope handling, or robust capsule collision against buildings has been added yet. The city remains a procedural blockout. Stage 07 will add combat/aiming and enemy AI. Headless Chromium tests do not establish performance on a physical Android phone.
