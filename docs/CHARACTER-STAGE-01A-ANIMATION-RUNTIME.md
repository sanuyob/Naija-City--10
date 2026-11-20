# Character Stage 01A — Animation Runtime Foundation

**Status:** Completed on the original main branch at commit 45646ca (November 13, 2026)
**Runtime:** PlayCanvas 2.24
**Scope:** Register the animation runtime and preserve the existing gameplay boundary.

## Original objective

Prepare the existing PlayCanvas application to host a validated rigged hero animation system without changing player movement or replacing the placeholder body before the required asset and binding checks existed.

## Original audit at Stage 01A

At the time of the Stage 01A commit:

- `src/game.js` created the PlayCanvas application and registered component systems.
- `src/third-person-controller.js` used primitive render entities and procedural limb pivots.
- `src/asset-loader.js` loaded GLB container assets.
- No playable rigged hero asset or animation library was yet integrated into the main branch.

## Changes in Stage 01A

1. Registered `pc.AnimComponentSystem` with the application component systems.
2. Added a source-level verification assertion so the animation runtime registration could not be accidentally removed.
3. Left the placeholder controller and existing movement/collision/camera controls unchanged within that stage.

## Subsequent character and simulation integration — November 20, 2026

The later GIDI character-simulation integration builds on that foundation. The current game tree now includes:

- The bundled Ara 3D Female Executive playable GLB, with a 70-bone rig, 25 skinned meshes, 32,346 weighted vertices and 22 available animation states.
- A PlayCanvas animation controller that selects locomotion, jump, traversal, vehicle transition and recovery states.
- Ara's live two-bone leg IK for uneven support, while preserving the calibrated flat-ground foot-lock path.
- A Bullet/Ammo player capsule and an 11-body / 10-constraint articulated ragdoll, with a configured total segment mass of 72 kg.
- A 160 ms animation-to-physics handoff, per-bone velocity sampling, three-dimensional knockback transfer and per-body continuous collision detection.
- Posture-aware procedural get-up sequences, five-point ground support probing and recovery on slopes and multi-step stairs.
- Deterministic browser tests covering eight horizontal impact directions, rising/falling airborne hits, vertical knockback, wall/corner barriers, joint limits, recovery and city-world integration.

The detailed implementation and acceptance record lives in `docs/CHARACTER-SIMULATION-ROADMAP.md`.

## Remaining work

This integration is still a gameplay prototype, not a production biomechanical or animator-final system. The full planned 60-clip character library, a final custom protagonist/wardrobe, artist-authored hit/get-up clips, selective self-collision experiments, broader contact/impact coverage and physical Android-device profiling remain open. Passing browser tests do not substitute for testing on the target phone.

## Professional references

- [PlayCanvas physics documentation](https://developer.playcanvas.com/user-manual/physics/)
- [PlayCanvas direct Ammo.js integration](https://developer.playcanvas.com/user-manual/physics/calling-ammo/)
- [Erin Catto — GDC 2012 Ragdoll System](https://box2d.org/files/ErinCatto_Ragdolls_GDC2012.pdf)
