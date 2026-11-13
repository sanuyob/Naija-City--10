# Naija City — Hero Character & Crew System Roadmap

**Specification:** Hero Character & Crew System v0.1  
**Approved decisions:** two active companions; grounded contextual parkour; balanced action presentation.  
**Target runtime:** PlayCanvas 2.24, browser and Android.  
**Status:** staged implementation; no hero GLB or animation source files are currently present in the repository.

## Delivery rule

Each stage has its own scope, acceptance gate and follow-up stage. A stage is complete only when its required assets exist, its code is integrated, automated checks pass, and the relevant browser/Android checks pass. Work that cannot be completed safely within a stage is recorded in the next stage rather than silently omitted or represented as finished.

## Stage breakdown

| Stage | Scope | Exit gate |
|---|---|---|
| Character 01A — Animation runtime foundation | Register PlayCanvas AnimComponentSystem; document the asset contract and integration boundary. | Build/verification pass; current placeholder gameplay remains unchanged. |
| Character 01B — Hero model, materials and rig | **IN PROGRESS.** Create the original Nigerian streetwear hero, production mesh, UVs, PBR materials, reusable humanoid skeleton, facial controls and attachment sockets. | GLB validates; scale/orientation/materials/skeleton/skin weights reviewed; model loads in a PlayCanvas test scene and passes visual inspection. |
| Character 02 — Core locomotion | Replace procedural limb swing with rigged idle, walk, jog, sprint, strafe, start/stop and turns; preserve existing input, stamina, camera and collision behaviour. | Smooth transitions, no broken bindings, no unacceptable foot sliding; browser and Android test. |
| Character 03 — Contextual parkour | Traversal detection and the 18 approved grounded traversal clips, with geometry checks and controlled movement handoff. | Valid obstacle tests, no arbitrary climbing, target alignment and collision tests. |
| Character 04 — Everyday interactions and face | Phone, greeting, pickup, inspect, door, sit/stand; facial expressions, eye/head look and dialogue cues. | Interaction clips trigger correctly and restore locomotion; facial controls remain lightweight. |
| Character 05 — Equipment and balanced action presentation | Fictional equipment poses, non-lethal gadget animation, mission camera/audio cues and selection UI. | Animation and UI work without interrupting normal exploration; fictional presentation only. |
| Character 06 — Crew roster and command system | Recurring tech specialist, driver and field-support roles; two active companions maximum; seven approved commands; radio/phone acknowledgement and reliable arrival/unavailable states. | Companions do not spawn beside the player, obstruct routes or exceed active cap; deterministic mobile AI. |
| Character 07 — Polish, profiling and Android acceptance | Animation cleanup, foot/hand IK where justified, LOD, memory/draw-call/frame-time profiling and device testing. | Acceptance checklist passes on target Android device; unresolved issues are filed as separate follow-up stages. |

## Approved character direction

- Fictional Nigerian male protagonist, young adult, approximately 24–26.
- Grounded semi-photorealistic proportions and modern Lagos streetwear.
- Replaceable wardrobe parts must preserve the same rig and attachment contract.
- No superhero proportions or full-time military-operator styling.
- Two active companions at once; the wider recurring crew may have additional roster members.
- Grounded contextual traversal, not unlimited climbing.
- Balanced cinematic action presentation, with normal city exploration remaining central.

## Animation contract

The target library is 60 named clips across locomotion (14), parkour/traversal (18), everyday interactions (8), squad interactions (10) and fictional equipment/action presentation (10). The approved names and definitions live in the design specification supplied by the project owner. Facial expressions, blinking and eye movement are separate facial channels, not extra body clips.

All clips must target one stable humanoid skeleton hierarchy and consistent rest pose, scale, axis convention and naming. Animation-only GLBs may be used only after a test proves that their tracks bind to the exact hero hierarchy in PlayCanvas. Do not assume a separate animation GLB will bind merely because it imports.

## Runtime architecture

- The existing third-person controller remains authoritative for player translation, collision, stamina and input.
- Animation is presentation driven by controller state; traversal may request a bounded movement action, but visual root motion must not silently desynchronise collision.
- Base locomotion state graph; masked upper-body layer for phone/gestures/equipment; full-body overrides for traversal and other whole-body actions; facial controls kept separate.
- Animation events may trigger footstep/landing/interaction cues, but must not become the source of truth for physics.
- AnimComponentSystem is registered in Character 01A. Actual character components, state graphs and clip bindings wait until a validated rigged asset exists.

## Asset and verification contract

Preferred first deliverable is a single hero GLB with mesh, skeleton, skinning, materials and a small pilot animation set. Later animation-only files may be considered after binding tests. Validate each GLB with the repository's glTF validator and inspect the imported hierarchy and animation names in PlayCanvas. Keep texture sizes and mesh complexity appropriate for Android; do not default to 4K maps.

## Current repository findings

- The live player is created from primitive meshes in src/third-person-controller.js; its gait is procedural.
- src/game.js creates the PlayCanvas app and wires the controller.
- src/asset-loader.js loads manifest models as container assets and instantiates render entities.
- public/assets/manifest.json currently contains only diagnostic cube/checker assets; there is no rigged hero GLB or animation library yet.
- The current controller includes input, stamina, jump, crouch, camera orbit and a movement resolver. These behaviours must be preserved while replacing only the visual body.
- Character 01A adds the animation component system only. It does not claim that a hero model, rig, animation clip, parkour or crew feature has been implemented.

## Current execution state (2026-11-13)

- Character 01A merged as PR #12 (squash commit 45646ca3fc1d12134c89bc78dca70b1619212610). Its GitHub Actions verification passed. The job emitted a non-blocking warning that actions/checkout@v4, actions/cache@v4 and actions/setup-node@v4 are being forced from Node.js 20 to Node.js 24; track this as CI maintenance, not a build failure.
- Character 01B has its own development branch character-stage-01b-original-hero-rig and private Blender project [Naija City — Hero Character 01B](https://blendstra.com/studio?workspace=wsp_a570bc495f2b652cccd702269f77dafd1b1ea057&project=befd196a-6cbf-4539-8671-f92446cab835). The first asset-generation operation is queued; no GLB has been accepted yet.
- An older private project named GIDI Main Protagonist V1 was inspected and rejected for this role: its delivered model has a visual mismatch with the streetwear brief and its delivered GLB reports no animation clips. It is not being imported or reused.

## Deferred work / explicit dependencies

Character 01B cannot be completed until an original hero mesh and rig are produced and added to the repository. The project currently has no approved hero model source asset. Do not substitute an unrelated downloaded character or silently change the approved appearance. If the mesh/rig is not ready when the runtime foundation closes, keep 01B as its own open stage and proceed only with asset-independent documentation or test scaffolding.
