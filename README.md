# Naija City — Landscape Mobile HUD & Gameplay UX

Naija City is a Nigerian-inspired third-person open-world RPG prototype built with PlayCanvas.

## Stage 08A — City expansion
- Expanded the environment footprint to approximately 96 m wide by 374 m long, including the original Yaba blockout.
- Continued the central avenue and added two parallel distributor roads plus three connecting cross streets.
- Added eight commercial and eight residential low-poly neighbourhood buildings, with three pocket parks.
- Kept the new geometry procedural and modular for iteration; these are expansion blockouts, not finished PBR buildings.
- The existing Stage 07 landscape controls and HUD remain in place.

## Stage 08B — Nigerian building detail
- Upgraded all eight commercial blockout buildings with coloured shop fascia panels, projecting awnings, roller shutters, security doors, upper glazing and roof parapets.
- Added residential facade details to all eight homes: window bands, balcony slabs, open metal balustrades, security grilles, front doors and external AC units.
- Added rooftop water tanks as a recognisable Nigerian urban residential detail.
- Shared low-poly material families and modular box geometry keep the pass editable and avoid downloading large texture sets.
- This is a geometry/material detail pass, not the final PBR pass. Readable shop names, interiors, texture baking, collision refinement and street vendor dressing remain future work.

## Stage 08C — Nigerian street infrastructure and roadside environment
- Added raised kerbs, storm-water channels, drain covers and grates along the expanded road network.
- Added raised speed-table approaches and tactile paving at distributor-road junctions.
- Added 16 utility poles, insulators and static overhead service-wire runs along the central avenue.
- Added 16 low-cost streetlight assemblies along the distributor streets; these are static fixtures, not dynamic light sources.
- Added junction/district road signs, benches, bins and planters for all three pocket parks.
- Added two compact bus shelters and two static roadside market-stall fixtures.
- Kept the pass static: no new moving vehicles, pedestrians or animated vendors.
- Reused material families and a bounded static PlayCanvas batch group; physical Android profiling remains necessary.

## Stage 08D — Semi-photoreal Nigerian building realism
- Upgraded all 48 building bodies: 32 original Yaba roadside shops, 8 expansion commercial buildings and 8 residential buildings.
- Replaced flat facade colours with five shared painted-plaster variants using 256×256 procedural albedo, normal and gloss maps, including restrained grime and surface variation.
- Applied shared PBR material families for rendered concrete, roof concrete, painted/galvanized steel, tinted glazing and rooftop tank plastic.
- Added four readable local business sign variants, original shop display glazing/security treatment, canopies, plinths, cornices and rainwater downpipes.
- Added residential lintels, sills, facade mullions and more finished entry doors/canopies; existing Stage 08B balconies, grilles, shutters, awnings, AC units and tanks now share the PBR finish families.
- Uses generated shared textures and bounded static batching rather than downloading 48 separate high-resolution material sets.
- This is a semi-photoreal procedural facade/PBR pass, not photogrammetry or 48 individually authored high-detail GLB building models. Unique building interiors, custom 2K/4K materials, final collision and physical Android performance checks remain future work.

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
- `src/game.js`: PlayCanvas scene, traffic, contextual interact feedback and Stage 08A expansion integration.
- `src/stage-08a-city-expansion.js`: expanded terrain, connected roads, neighbourhood building blocks and pocket parks.
- `src/stage-08b-building-detail.js`: Nigerian-inspired commercial and residential facade detail, balconies, security grilles, AC units and rooftop tanks.
- `src/stage-08c-street-infrastructure.js`: static kerbs, drainage, utility poles/wires, streetlights, signs, park furniture, bus shelters and roadside stalls.
- `src/stage-08d-building-realism.js`: shared procedural PBR maps, building material families, business signs and modular facade detailing for all 48 building bodies.
- `src/rpg-ui.js` / `src/rpg-ui.css`: HUD, menus, safe areas and touch controls.
- `scripts/browser-smoke.mjs`: landscape Chromium interaction smoke test plus portrait rotation notice check.

## Verify
`npm install` → `npm run verify` → `npm run build` → `npm run analyze:bundle` → `npm run test:browser`

## Honest status
The character remains a lightweight procedural placeholder. Stage 08D upgrades all building surfaces and facades to a semi-photoreal procedural PBR treatment, but the buildings are not scanned or individually authored high-detail GLB assets. Automated Chromium tests do not establish performance or ergonomics on every physical Android device. A real-device pass is still required for texture loading, touch comfort, safe-area behavior and performance.
