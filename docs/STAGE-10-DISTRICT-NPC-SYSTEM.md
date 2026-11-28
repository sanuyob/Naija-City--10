# Stage 10 — District NPC population and civilian behaviours

## Character library and roster

The project has **64 unique Gobkit CC0 civilian GLBs** across eight source packs, assigned to Alimosho, Lekki, Victoria Island, Eko Atlantic and Ekiti. The current population target is 64 authored character definitions—not 620 live instances. District streaming loads only the current district roster and unloads the previous district.

Processed assets live under `public/assets/npcs/gobkit-cc0/roster/`. `manifest.json` records each source, output path, byte size, skeleton, animation clips, outfit style and garment mesh count. The pipeline uses the installed `@gltf-transform/core` Node SDK with deduplication, pruning and animation resampling, plus Khronos `gltf-validator`. It requires neither Game Development Studio CLI nor Blender for this asset processing workflow.

## Nigerian clothing geometry

The 64 GLBs now contain **361 additional skinned garment meshes** (5.64 per character on average), with generated embedded fabric textures. The additions include fitted shirts and sleeves, trousers or wrapper-like lower garments, role-appropriate aprons, and reflective workwear trim. Fabric families include Adire-inspired and Ankara-inspired patterns, school, corporate, farm, service, uniform and high-visibility workwear palettes. Each garment mesh uses the source character's 13-joint skin and is checked after GLB export.

The Alimosho street cleaner now has a dedicated `sanitation-green` outfit: green municipal-work shirt, dark-green work trousers and two high-visibility reflective bands. It is no longer a role label alone; the imported PlayCanvas model exposes seven enabled skinned garment render parts. The source character remains a stylized generic stock model, so the outfit is an added game-ready clothing layer rather than a newly sculpted head-to-toe Nigerian character.

## Skin and GLB validation

The source models had a Khronos `NODE_SKINNED_MESH_NON_ROOT` warning because the skinned mesh node was nested beneath a transform wrapper. The processing pipeline now moves only the skinned mesh node to an identity scene root and leaves the existing bone hierarchy and animation paths intact. The generated GLBs all pass Khronos validation with **zero errors and zero warnings**. Animation names, the 13-joint skeleton layout, source materials and embedded textures are preserved alongside the new clothing materials.

## Runtime behaviour

- Models load lazily when their district becomes active through player proximity or remote CCTV. Only the active district runs.
- Each actor uses a vertical kinematic capsule (0.32 m radius, 1.78 m height), route waypoints, work shifts and task state. The shared solver uses circle-vs-AABB tests, gravity, obstacle blocking and agent separation.
- Nearby actors (within 24 m of the player) use detailed per-frame capsule collision and peer separation. Distant actors use coarse 0.25 s route updates without per-frame collision work.
- Jobs include retail and market service, delivery, security, office work, education, hospitality, port/logistics, construction, farming and cleaning.
- NPCs are available through the existing interaction registry.
- The mobile SPAR button starts friendly, non-lethal arcade sparring: a short Hit animation, stun and knockback, then automatic recovery. No health/death or weapon simulation is involved.
- Idle, Walk, work, interaction and Hit clips are resolved from each model's available animations, with safe fallbacks where clips differ between packs.

## Physics design

This NPC layer deliberately uses the project's existing kinematic actor solver rather than adding a Bullet/Ammo rigidbody per civilian. A capsule is represented by radius/height and tested against world AABB collision proxies; this avoids expensive triangle-mesh colliders and extra physics bodies on mobile. It is not a full dynamic ragdoll or an Ammo rigidbody.

## Validation

- `npm run assets:npc:process` processes the 64 source GLBs and rechecks each exported GLB with Khronos Validator.
- `npm run assets:npc:validate` checks the 64 manifest-listed GLBs, rig, outfit meshes, animation clips and zero-warning/zero-error status.
- `npm run test:npc:assets` runs asset validation plus the 64-character/district/behaviour unit tests.
- `npm run test:stage-08m:runtime` covers remote CCTV, pedestrian movement/ticks, vehicle movement and district activation. The prior pedestrian assertion regression is fixed; the smoke now confirms both measured movement and advancing actor simulation ticks.
- `npm run test:production` builds a production preview, checks all 64 GLB URLs, loads the Ekiti farmer and Alimosho cleaner, verifies actual garment render parts, interaction and sparring UI, and checks for browser errors.
- `scripts/npc-outfit-visual-smoke.mjs` captures a static PlayCanvas review of the cleaner outfit for manual visual inspection.

## Physical-device profiling

The Stage 08F profiler exports current device renderer, viewport/device-pixel-ratio, frame-time percentiles, draw calls, CPU timing, engine-tracked GPU resources, JS heap when supported, and NPC/garment counts. On the target Android phone, open the game in Chrome, expand the performance panel and tap **EXPORT DEVICE PROFILE** after a representative gameplay run. The JSON export is the actual phone result. Chromium/SwiftShader smoke tests are regression checks only; they are not an Itel A90 performance benchmark. No physical phone benchmark is claimed until that report is captured from the phone.
