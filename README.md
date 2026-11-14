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
- Replaced flat facade colours with five shared painted-plaster variants using 512×512 procedural albedo, normal and gloss maps, including restrained grime and surface variation.
- Added separate 256×256 albedo, normal and gloss maps for weathered concrete, roof concrete and steel, plus a tinted-glass reflection/albedo map and rooftop tank plastic finish.
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
- `src/stage-08d-building-realism.js`: material-specific procedural PBR maps, building material families, business signs, roof detailing and modular facade dressing for all 48 building bodies.
- `src/rpg-ui.js` / `src/rpg-ui.css`: HUD, menus, safe areas and touch controls.
- `scripts/browser-smoke.mjs`: landscape Chromium interaction smoke test plus portrait rotation notice check.

## Verify
`npm install` → `npm run verify` → `npm run build` → `npm run analyze:bundle` → `npm run test:browser`

## Hero 01 rigged-character integration

The feature branch includes the original Hero 01 GLB and a PlayCanvas ContainerAsset loader. The current GLB contains 60 separately named animations on one 20-joint humanoid rig: 14 locomotion clips, 18 contextual traversal clips, 8 everyday-interaction clips, 10 squad-interaction clips and 10 fictional equipment/technology presentation clips. It includes 11 PBR materials with embedded base-colour, normal, metallic-roughness and occlusion maps, UVs on every mesh primitive, four facial-expression morph targets and two blink morph targets.

The T-shirt, overshirt panels, sleeves and trousers are weighted to multiple armature bones. A Blender deformation check measured vertex movement on both sleeves and both trouser legs after shoulder/hip rotations. The GLB was re-imported in Blender with all 60 non-empty actions, one 20-joint skin and all six facial morph targets.

The third-person controller remains authoritative for player position, collision, stamina, touch input and camera. It maps core locomotion automatically and exposes named clip and facial-expression controls for the remaining animation groups. The procedural character remains as a fallback if the GLB fails to load.

The 2.81 MB GLB is stored as two base64 text files in the repository and decoded to a Blob URL at runtime. This preserves the generated binary asset through the repository text-file API, but adds a small startup decode and memory overhead.

## Honest status
This feature branch has passed Blender export and Blender re-import checks for all 18 named animation clips, and the three changed JavaScript modules pass Node syntax checks. The repository verification now checks the GLB header, all 18 clip names, 60 channels per clip and the 20-joint skin. **A production build, browser PlayCanvas runtime test, Khronos validator run, skin-deformation review and physical Android test are still required.** The target Itel A90 must be profiled for startup time, memory, frame rate and touch comfort before merging this branch into `main`.

Stage 08D upgrades all building surfaces and facades to a semi-photoreal procedural PBR treatment, but the buildings are not scanned or individually authored high-detail GLB assets.


## Stage 08E — Individually designed Nigerian building assets

Stage 08E introduces a generated, validated GLB asset pipeline for the 48 existing Yaba and neighbourhood building plots:
- 32 original Yaba commercial plots, with selected mixed-use variants.
- 8 Stage 08A commercial plots, including mixed-use variants.
- 8 residential plots.
- Six reusable PBR material families: weathered plaster, cast concrete, tinted glazing, painted metal, roofing and timber.
- Embedded texture images and UV coordinates in every GLB.
- Three mesh detail levels (LOD0/LOD1/LOD2) and a separate hidden collision-proxy mesh.
- Distance-based progressive loading with at most two concurrent GLB requests.
- Shared material references and a dedicated PlayCanvas static batch group where compatible.
- Legacy blockout bodies and Stage 08B/08D facade dressing are disabled when the GLB replacement system initializes.

Generate the assets with `npm run assets:08e`. The build and verification commands generate them automatically. Structural checks inspect every GLB header, embedded image, UV accessor, material family, LOD node and collision proxy.

**Known remaining work:** the current generator embeds PNG maps; Basis/KTX2 GPU texture compression and true GPU-memory savings are not yet complete. The collision proxies are authored as separate hidden meshes but are not yet wired into a world collision system. Distant GLB containers are evicted with PlayCanvas asset unloading beyond the stream radius (the first shared-material source is pinned); actual device memory behaviour still needs profiling. Automated Chromium checks are not a substitute for loading, memory and frame-rate measurements on the actual Itel A90.
