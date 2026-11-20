# Naija City — Hero Character & Crew System Roadmap

**Specification:** Hero Character & Crew System v0.1
**Target runtime:** PlayCanvas 2.24, browser and Android
**Current integration status:** Animation runtime, Ara player rig and the first connected character-simulation stack are present in the GIDI integration candidate for `main` (November 20, 2026). The original staged roadmap remains the plan for completing the custom hero and crew.

## Delivery rule

Each stage has its own scope, acceptance gate and follow-up stage. A stage is complete only when its required assets exist, its code is integrated, automated checks pass, and the relevant browser/device checks pass. Work that cannot be completed safely within a stage is recorded as follow-up rather than represented as finished.

## Stage breakdown

| Stage | Scope | Current state / next gate |
|---|---|---|
| Character 01A — Animation runtime foundation | Register PlayCanvas AnimComponentSystem and document the animation integration boundary. | Completed on main in commit 45646ca; retained in the integrated game tree. |
| Character 01B — Hero model, materials and rig | Mesh, UVs, PBR materials, reusable humanoid skeleton, facial controls and attachment sockets. | Ara 3D Female Executive GLB is integrated as the current playable prototype asset. Final project-owned protagonist design and wardrobe remain open. |
| Character 02 — Core locomotion | Rigged idle, walk, run, jump, crouch, turns and speed-synchronized transitions. | Prototype integrated and browser-tested. Calibrated flat-ground sole lock and two-bone terrain IK are active. Start/stop, reverse/strafe transitions and device profiling still need polish. |
| Character 03 — Contextual parkour | Grounded traversal, geometry checks and controlled movement handoff. | Existing ladder, mantle, ledge, wall-run and other traversal prototype is integrated and smoke-tested. Full authored 18-clip set and expanded obstacle acceptance remain future work. |
| Character 04 — Everyday interactions and face | Phone, greeting, pickup, inspect, door, sit/stand; expressions, eye/head look and dialogue cues. | Facial expression, blink and viseme channels and basic world interactions are integrated. The full everyday animation set remains open. |
| Character 05 — Equipment and balanced action presentation | Fictional equipment poses, non-lethal gadgets, mission camera/audio cues and selection UI. | Not complete; retain as a separate future stage. |
| Character 06 — Crew roster and command system | Recurring tech specialist, driver and field-support roles; no more than two active companions. | Pedestrian behaviour/perception and a companion foundation exist; full crew roster, commands and schedule logic remain open. |
| Character 07 — Polish, profiling and Android acceptance | Animation cleanup, LOD, memory/draw-call/frame-time profiling and Android device testing. | Browser verification is in place. Real-device profiling and final acceptance on the target Android phone remain open. |

## Character direction and prototype asset

The approved long-term direction remains a grounded Nigerian protagonist with replaceable wardrobe parts, a stable rig contract and non-superhero proportions. The currently integrated playable model is the bundled Ara 3D Female Executive preset. It is a functional prototype avatar, not a claim that the final project-owned protagonist design is finished.

Current rig facts from the integrated asset: 70 bones, 25 skinned meshes, 32,346 weighted vertices and 22 available animation states. The game also retains a separate Hero 01 city NPC asset. Ara's available clips are not the full planned 60-clip target library.

## Animation contract

The target library remains 60 named clips across locomotion (14), parkour/traversal (18), everyday interactions (8), squad interactions (10) and fictional equipment/action presentation (10). Facial expressions, blinking and eye movement remain separate channels, not additional body clips.

All clips must target a stable humanoid hierarchy and consistent rest pose, scale, axis convention and naming. Animation-only GLBs may be used only after a binding test proves their tracks target the exact runtime skeleton.

## Runtime architecture

- The third-person controller remains authoritative for player translation, collision, stamina and input.
- PlayCanvas AnimComponentSystem drives rigged presentation; animation events do not become the source of truth for physics.
- Bullet/Ammo simulates the player capsule and the temporary articulated ragdoll. The rendered skeleton is blended into the physical pose over a bounded handoff interval.
- Ragdoll recovery samples posture and ground support, then blends to a procedural face-up or face-down get-up sequence. Those get-up tracks are runtime-generated, not animator-authored motion capture.
- Ara's two-bone leg IK is applied after animation evaluation on uneven support; flat-ground walking remains on the calibrated low-slide foot-lock path.
- Physics and world objects use metre-scale units. The player ragdoll uses 11 rigid bodies and 10 constraints with a configured 72 kg segment budget.

## Current repository findings

- `src/game.js` registers PlayCanvas animation, loads Ara and wires the connected simulation systems.
- `src/asset-loader.js` loads the playable rig and city assets.
- `src/third-person-controller.js` owns player input, animation state, hit reaction, ragdoll handoff and recovery.
- `src/player-physics.js` owns the player's Ammo/Bullet capsule, world colliders and ragdoll lifecycle.
- `src/character-ragdoll.js` defines the 11-body articulated rig, joint limits, mass distribution, velocity transfer and per-body CCD.
- `src/character-recovery.js` contains pose blending, face-up/face-down classification, recovery yaw and per-bone motion estimation.
- `src/two-bone-ik.js` and `src/asset-loader.js` support live Ara leg IK and foot-normal alignment.
- `scripts/character-ragdoll-stress-smoke.mjs` exercises eight horizontal impact directions, airborne rising/falling impacts, vertical up/down knockback, wall and corner barriers, hinge limits and five-step/slope recovery.
- `scripts/gidi-world-smoke.mjs` checks streamed city cells, LOD/collider lifecycle, connector walking and the sedan's physical gateway crossing.

## Deferred work / explicit dependencies

The first playable rig is present, but the final original protagonist and complete wardrobe/attachment contract may still be produced as a later project-owned asset stage. The 60-clip target, artist-authored hit/get-up clips, selective self-collision evaluation, stair locomotion IK, more varied high-speed/contact-point impacts, and Android-device profiling remain explicit dependencies. Do not interpret deterministic browser tests as proof of visual quality or performance on every Android device.
