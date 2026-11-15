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
- Desktop: WASD / arrows drive Ara, Shift sprint, Space jump, C crouch, E interact, Escape pause, drag scene to orbit.
- Mobile landscape: the left joystick is a pressure-sensitive movement/steering stick. Drag up/down to move forward/reverse along Ara's facing direction; drag left/right to turn in place or while moving. The chase camera recentres behind her after a turn, while a manual right-side drag keeps camera orbit under player control.
- Near the parked Naija City sedan, tap INTERACT to enter. Inside, the left stick steers, hold GAS to accelerate, hold BRAKE to slow down or reverse, drag the right side to orbit the car camera, and tap EXIT to get out.
- Tap the pause control to open menus. Quick slots currently provide selection feedback but do not contain persistent items.


## Stage 09B — expanded building parkour network
- Each of the 48 building collision proxies now has four authored access routes: ladder, mantle, ledge and wall-run (192 access points total, up from 144).
- Nearby access points reveal lightweight rails, rungs or grip bars, with only the nearest route markers rendered at once.
- Route actions temporarily release matching traversal/building collision proxies, move Ara through an authored action, then restore collisions at the landing point.
- This is a wide contextual parkour network, not unrestricted free-climbing on every arbitrary wall face. The wall-run routes are authored lateral transitions along the building edge.

## Stage 10 — enterable Ara 3D Gen sports car
- Downloaded the modern sports-car body through Ara 3D Gen's vehicle builder and exported its separate driver-side vehicle prop with the driving/boarding/alighting action set.
- Built a phone-oriented GLB from that export: about 3.72 MB and 47,799 triangles, retaining the named chassis, four wheel joints, steering wheel, two doors and two windows. The exported character animation payload was removed; Bullet drives the wheels and a small local door animation handles the visible entry/exit cue.
- The game aligns all four rendered wheel joints to the Bullet raycast-wheel transforms and checks the maximum positional difference in the vehicle smoke test.
- Uses an 820 kg Bullet chassis, four raycast wheel/suspension probes, building/street collision proxies and kinematic traffic colliders. This is a hybrid arcade-driving implementation: Bullet handles the rigid-body chassis, suspension probes and collisions, while speed/steering response includes game-tuned control logic. It is not a calibrated tire/engine simulation.
- Entering disables Ara's on-foot controller/body, enables the driving HUD and chase camera, and starts engine audio. Exiting restores the player controller/body and on-foot camera. Driver door and window animate open/closed on entry and exit; a full visible character boarding/alighting animation is still future work.
- Vehicle telemetry includes speed, estimated fuel and engine temperature. Fuel/temperature are stylized gameplay variables, not a thermochemical engine simulation or calibrated real-world vehicle model.
- Procedural Web Audio provides engine tone, skid and impact feedback; pooled VFX add exhaust, skid and collision particles.
- The original Blender-made Naija City sedan remains available as the load fallback. Physical Android tuning, collision damage, gear ratios, drivetrain layouts, deformable bodywork and a high-fidelity tire/suspension model remain future work.

## Stage 10B — original ATL Sandbox hatchback prototype
- Created a second, original compact hatchback in Blender 5.2.2 LTS inside the ATL Sandbox. The exported GLB is about 1.14 MB, with 117 nodes, 109 mesh nodes and 14 materials.
- The model has a teal metallic body, glasshouse, mirrors, lights, grille, dashboard, seats, steering wheel, four separately grouped wheels and named driver/passenger door hinge objects.
- Its Blender generator is preserved at scripts/vehicles/generate-compact-hatchback.py, and the GLB is staged at public/assets/vehicles/naija-city-compact-hatchback.glb.
- This hatchback is an asset prototype only; it is not yet wired as a second drivable car. It will need its own pivot alignment, wheel physics setup, entry/exit handling and mobile render optimisation before it enters gameplay.

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
- src/vehicle-system.js / src/vehicle-physics.js: Ara vehicle loading, enter/exit handoff, vehicle controls, Bullet chassis/raycast wheels, telemetry, engine audio and vehicle VFX.
- scripts/vehicles/generate-compact-hatchback.py: repeatable Blender source for the separate ATL Sandbox compact hatchback prototype.
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

Linux build environments also need the Khronos KTX-Software 4.4.2 command-line tool (`ktx`) on `PATH` for the Stage 08F UASTC/ETC1S texture compression step. The GitHub Actions verify and deploy workflows install the official release and verify its SHA-256 checksum automatically.

## Hero 01 NPC rig integration

The original Hero 01 asset remains a separate animated city NPC, not the playable character. Its GLB contains 60 separately named animations on one 20-joint humanoid rig, 11 PBR materials with embedded texture channels, UVs on every mesh primitive, four facial-expression morph targets and two blink morph targets. The NPC uses the existing pedestrian route system and does not occupy the player slot.

The third-person controller owns Ara's player position, collision, stamina, touch input and camera. Ara is loaded from the bundled Female Executive GLB described below. Hero 01 remains independently loaded for the city NPC population.

The 2.81 MB Hero 01 GLB is stored as two base64 text files in the repository and decoded to a Blob URL at runtime. This preserves the generated binary asset through the repository text-file API, but adds a small startup decode and memory overhead.

## Ara 3D Gen main player asset and verification

The ready-made **The Female Executive** preset from Ara 3D Gen is exported as `public/assets/hero/Ara_Female_Executive_Animated.glb` and bundled with the game. It is a 7.0 MiB GLB with a 70-bone game rig, 25 skinned mesh parts, 785,250 weighted vertices and 12 embedded clips: Idle, Walk, Run, Jump, Jump start, Jump (in air), Jump land, Vault over obstacle, Climb up ledge, Forward roll and both side dodges. The player loader fetches this bundled GLB directly; no user FBX upload or IndexedDB import is required. Ara is the only playable character and Hero 01 remains a separate animated city NPC.

The character generator is [Ara 3D Gen](https://ara3dgen.com), open source under MIT. Its MakeHuman-derived character assets are CC0; the included animation licence and CMU motion-capture notice are preserved in the accompanying provenance notice.

**Verified in the Box environment:** `npm run verify`, `npm run build` and `npm run test:browser` all pass. The browser tests load Ara as the real player, validate the 70-bone/25-mesh rig, exercise ten animation aliases, move the player with the touch joystick, switch from Walk to Run while sprinting, test jump/landing physics and VFX, complete all eight contextual traversal types, confirm Hero 01 remains a moving NPC, exercise companion commands, and check Yaba/Ikeja rendering and the 48-building/KTX2 asset pipeline. This is automated Chromium coverage, not final visual approval or a real-device benchmark. A real Android-device touch, performance, memory and audio test is still outstanding.

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

**Known remaining work:** Stage 08F now delivers a 2K PBR Computer Village hero building with KTX2/Basis-compressed textures; the other 47 generated building GLBs still use embedded PNG maps. The 48 building footprints and selected solid Yaba/Ikeja street structures now feed rotated static-box colliders into Ara's Bullet world. These are intentionally simplified proxies, not triangle-perfect collisions for every decorative mesh, cable, awning or small prop; dynamic vehicle collision is a later vehicle phase. Distant GLB containers are evicted with PlayCanvas asset unloading beyond the stream radius (the first shared-material source is pinned); actual device memory behaviour still needs profiling. Automated Chromium checks are not a substitute for loading, memory and frame-rate measurements on the actual Android device.


### Ara player animation, feedback and audio

The bundled Ara Female Executive rig maps its real source clips to player locomotion and traversal aliases: Idle, Walk, Run, Jump start, Jump in air, Jump land, Vault over obstacle, Climb up ledge, Forward roll, and left/right dodge. Jump take-off now uses its own short start clip before the airborne loop; vault/climb aliases resolve to the actual parkour clips instead of falling back to a jump pose. The browser smoke test checks all ten animation aliases, jump/landing physics, jump/landing VFX events, and a completed low-vault traversal.

Player feedback currently includes pooled lightweight dust/jump/landing/parkour VFX plus original procedural Web Audio one-shots for footsteps, jump, landing and parkour. Audio initializes only after a user gesture to comply with mobile browser autoplay rules. These synthesized effects are a functional first sound pass, not final recorded Foley or the full city ambience mix.


### Ara controller, animation and VFX polish

- The player uses one Bullet capsule in the same physics world as 48 rotated building-footprint proxies, eight traversal obstacles, six material-query zones and selected solid roadside structures. Static collision groups support filtered ground/camera raycasts while retaining player-to-world contacts.
- Movement now scales with joystick pressure and uses acceleration/deceleration smoothing. Sprint toggles on mobile pointer-down, selects Ara's actual Run clip, raises the speed ceiling to 4.45 m/s and drains stamina more gradually.
- The chase camera starts at a 3.85 m follow distance and raycasts against static world geometry to pull in before walls/buildings can obstruct the view.
- Crouching resizes Ara's capsule from 1.80 m to 1.22 m while keeping the feet grounded. Standing back up is rejected if the current position overlaps a world proxy.
- Ara uses a PlayCanvas 1D locomotion blend tree for Idle/Walk/Run driven by measured horizontal speed; transitions cross-fade into jump, landing, parkour and crouch states.
- The Ara preset did not include crouching clips, so two rig-bound skeletal tracks (Ara_Crouch and Ara_CrouchWalk) are generated at runtime against the existing skeleton.
- Foot probes sample Bullet ground hits and normals beneath both ankles. A bounded ankle-position/sole-angle correction reduces small floating and foot sliding on the available flat, step and prop surfaces. This is a lightweight foot-placement pass, not a complete two-bone terrain IK solver; the district still needs more authored slopes and stairs for broader validation.
- Surface zones identify asphalt, concrete, grass, metal and wet ground. Footstep Web Audio and dust VFX use different per-surface profiles; two visible wet-road patches are included as test zones.
- The curated Yaba route now has foundation caps/grip strips, a wall-mounted AC condenser and service shelf, low guard rails, parapet caps, ladder brackets and wall-run grip bars. Ballistic vaults are capped at 1.55 m; taller transitions use authored mantle, ledge or ladder actions instead of oversized jumps.
- Player effects use a fixed 24-entity pool. The browser smoke test checks sprint on/off, camera startup distance, four ground surface probes, foot-placement hits, all eight traversal types, audio/VFX and the separate Hero 01 NPC.

Professional implementation references: [PlayCanvas vehicle physics](https://developer.playcanvas.com/tutorials/vehicle-physics/), [PlayCanvas ray casting](https://developer.playcanvas.com/user-manual/physics/ray-casting/), [PlayCanvas animation blend trees](https://developer.playcanvas.com/user-manual/animation/blend-trees/), [PlayCanvas collision shapes](https://developer.playcanvas.com/user-manual/physics/collision-shapes/), [PlayCanvas optimization guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/), and [Ara 3D Gen vehicle animation/export guide](https://ara3dgen.com/docs/animations/).
