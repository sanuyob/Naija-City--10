# GIDI Character Simulation Stack

## Goal

A modular, mobile-conscious character simulation system for Ara, companions, and city pedestrians. Systems communicate through small state contracts: input, animation, physics, senses, decisions, navigation, interactions, vitals, feedback, and persistence. GIDI remains on its current PlayCanvas + Ammo/Bullet runtime; no engine migration is required.

## Current implementation status

| System | Current state | What exists now |
|---|---|---|
| Skeletal rigging | Integrated | Ara's imported GLB retains 70 bones, 25 skinned meshes, and 32,346 weighted vertices. |
| Animation state machine | Existing / integrated | The controller selects Idle, Walk, Run, Jump, crouch, traversal, and vehicle-transition states with blended transitions. |
| Character controller | Integrated | Camera-relative touch/keyboard movement, speed synchronization, stamina gate, collisions, coyote/buffered jump, crouch and vehicle handoff. |
| Physics and collisions | Integrated | Bullet capsule for the player, Bullet vehicle body/wheels, and a separate lightweight kinematic actor solver. |
| Procedural animation | Partial | Speed-calibrated locomotion, root/facing response, footstep events and pelvis-based grounded foot-lock correction. |
| Foot placement / ground detection | Integrated / terrain-tested IK | Toe/heel Bullet raycasts produce foot targets from the actual support hit. The two-bone solver rotates Ara's thigh/shin chain after animation evaluation and aligns the calibrated sole normal to the measured surface normal. A browser test places Ara over two separate sloped Bullet surfaces and checks reachability, sub-millimetre end-effector error and surface-normal alignment. Level-ground locomotion keeps the existing pelvis/sole lock path; the walk/run slide regression remains green. |
| Behavior trees | Integrated for pedestrians | Reusable selector/sequence/action/condition nodes choose notice, investigate, wait, waypoint and path-follow actions. |
| AI perception | Integrated for pedestrians | Range + field-of-view + oriented-box line-of-sight checks and simple running/vehicle hearing signals. |
| Navigation | Integrated as A* grid | Pedestrian A* routes around collision proxies; this is a grid navigator, not a baked polygon NavMesh. |
| Health and stamina | Integrated | Real health/stamina state, drain/regeneration, recovery delay, damage invulnerability and downed/recovering state. |
| Hit reaction | Basic integrated | Damage events, optional bounded knockback, a short bracing pose, and impact feedback. A dedicated authored hit-reaction animation is still needed. |
| Recovery | Integrated procedural front/back get-up; uneven support tested | Recovery samples the final ragdoll pose, classifies face-up versus face-down (side falls use the face-up fallback), probes five support points around the character, rejects steep/non-walkable normals, and uses the median valid support height before restoring the capsule. The saved pose blends into a generated posture-specific get-up track, then transitions to Idle. Browser stress coverage includes a two-level stair landing and an 8° inclined walkway; both used all five support samples in the passing run. The get-up tracks remain rig-bound procedural animations, not artist/mocap clips. |
| Interaction system | Integrated foundation | Data-driven interactable registry, distance/visibility checks, contextual HUD prompt, plus Yaba kiosk and bus-stop interactions. Vendor inventory and transit schedules remain future work. |
| Vehicle transition | Existing / integrated | Door open, seat entry, vehicle occupancy, exit animation and return to character controls. |
| Facial animation | Integrated | Expression presets, smoothed morph targets, autonomous blink layer and speech viseme channel control over the 34 available morphs. |
| Motion matching | Prototype utility | A tested trajectory-feature scorer ranks supplied candidates by speed, direction, turn rate and movement state. It is not a full pose-search database and is not the live locomotion driver. |
| Ragdoll physics | Integrated prototype; eight-direction and joint-limit stress tested | Eleven Bullet bodies and ten cone-twist/hinge constraints run in the player Ammo world with a 72 kg configured mass budget. Each body starts from the captured animated pose, receives sampled per-bone motion plus the requested horizontal impact velocity, and the rendered skeleton blends to Bullet over 160 ms. The browser stress suite checks all eight horizontal directions, pelvis velocity alignment, settling speed, hinge angles and recovery. Body self-collision remains disabled for stability/mobile cost. Masses and limits are tuned estimates, not a calibrated human biomechanical model. |

## Next build phases

### Phase 1 — Connected simulation foundation

Completed in this branch: vitals, reusable behaviour-tree nodes, perception/line-of-sight, A* navigation grid, world-interaction registry, facial expression/blink/viseme controller, two-bone IK mathematics, motion-feature scoring prototype, and integration tests in the Yaba scene.

### Phase 2 — Full body animation and IK

The two-bone solver is bound to Ara's live thigh/shin/ankle chain and runs after PlayCanvas animation evaluation. Toe/heel contacts query the real Bullet support surface, set ankle height from the marker-to-sole offset, and align the foot's calibrated local sole normal to the support normal. The uneven-terrain browser test uses two distinct sloped collision surfaces and checks both legs. Flat-ground walking/running is deliberately kept on the existing low-slide foot-lock path. Remaining work: calibrate the pole vector across more poses, add explicit IK weight fades for jumps/traversal/vehicle entry-exit, and test stairs, compound slopes and narrow supports on the target device. Add a small clip blend graph for start, stop, pivot, reverse and lateral movement.

### Phase 3 — Ragdoll and physical recovery

The 11-body / 10-joint Bullet rig captures the live animation pose, estimates individual body linear/angular velocities, adds the directional impact velocity, and blends the rendered skeleton into the evolving physical pose over 160 ms. Its configured segment masses total 72 kg, matching the player capsule's nominal mass budget. A repeatable browser stress suite covers eight horizontal impact directions, verifies pelvis velocity alignment and hinge-limit tolerances, and checks that every case settles and restores player controls. Recovery uses five ground probes and is exercised on a two-level step landing and an 8° sloped walkway. The suite also verifies that Bullet world raycasts still work after the capsule is re-added; this guards a broadphase bug caused by updating the AABB of a capsule while it had been removed from the world. Remaining work: airborne/vertical and edge/corner impacts, more complex stairs and compound terrain, optional selective self-collision, artist-authored get-up clips, and real Android-device profiling before broadening ragdoll use.

### Phase 4 — Real motion matching

Capture or author representative pose samples for walk, jog, run, start, stop, pivot, lateral movement and reverse. Record pose features and short future trajectories, then query the database with speed/direction/turn-rate plus pose features. Use hysteresis to avoid rapid clip switching. Until there is a real sample database, keep the current authored state machine as the runtime source of truth.

### Phase 5 — World-scale AI and interaction depth

Move from simple per-NPC routes to district-specific navigation data, social schedules, vendor/shop state, transit timetables, perception events and low-cost crowd LOD. Reuse shared path requests and throttle sensing/path updates by distance from the player.

## Acceptance gates

- No page errors or missing rig bindings during startup, walking, vehicle transition or recovery.
- Player health never goes below zero; damage invulnerability prevents duplicate hits; stamina never exceeds its maximum.
- Downed state blocks movement; recovery restores the player and returns to Idle.
- NPC vision respects facing direction, range and occlusion; hearing can trigger investigation without direct line of sight.
- A* routes avoid solid proxies and never drive through a blocked diagonal corner.
- Interactions require range and a clear view; the nearest available target is exposed to the HUD.
- Facial expression and viseme channels are smoothed and do not overwrite unrelated face channels.
- Ara's two-bone IK must keep the foot planted without degrading the measured walk/run sole-slide limits; it never moves the physics capsule.
- Ragdoll startup must disable the player capsule, constrain all mapped body segments, preserve the configured 72 kg mass budget, and transfer the requested horizontal impact direction.
- The browser stress suite must pass eight horizontal impact directions, report no hinge-limit violations, settle below its body-speed threshold, restore controls, and preserve Bullet floor raycasts after recovery.
- Stair and uneven-ground recovery must use at least three valid support probes, select a walkable surface normal, and restore the player capsule. The current suite covers a two-level landing and an 8° slope.
- Airborne/vertical and edge/corner cases, real Android-device profiling, selective self-collision experiments and animator-authored get-up tracks remain future work. Current get-up clips are generated procedurally.

## Mobile budget

Keep full perception and route planning focused on nearby actors. Use a coarse update cadence for distant NPCs, cap path-search expansions, pool physics/render resources, and do not create one full rigidbody ragdoll per pedestrian. The phone-target baseline remains a small active crowd with the full player rig and lightweight kinematic NPCs.
