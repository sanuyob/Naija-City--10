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
| Foot placement / ground detection | Integrated / terrain-conditioned IK | Ground raycasts, support snapping, animated sole markers and the proven pelvis foot-lock remain. The two-bone solver now rotates Ara's actual thigh/shin bones after animation evaluation when grounded foot height needs a meaningful correction; level-ground gait is left on the stable pelvis lock path. |
| Behavior trees | Integrated for pedestrians | Reusable selector/sequence/action/condition nodes choose notice, investigate, wait, waypoint and path-follow actions. |
| AI perception | Integrated for pedestrians | Range + field-of-view + oriented-box line-of-sight checks and simple running/vehicle hearing signals. |
| Navigation | Integrated as A* grid | Pedestrian A* routes around collision proxies; this is a grid navigator, not a baked polygon NavMesh. |
| Health and stamina | Integrated | Real health/stamina state, drain/regeneration, recovery delay, damage invulnerability and downed/recovering state. |
| Hit reaction | Basic integrated | Damage events, optional bounded knockback, a short bracing pose, and impact feedback. A dedicated authored hit-reaction animation is still needed. |
| Recovery | Physical handoff integrated; authored get-up still pending | Lethal damage transfers from animation to Bullet bodies, disables the player capsule, then recovery removes the ragdoll, samples the pelvis location/orientation, restores the capsule and controls, and crossfades to the available crouch/idle posture. Ara's asset has no dedicated front/back get-up clip yet. |
| Interaction system | Integrated foundation | Data-driven interactable registry, distance/visibility checks, contextual HUD prompt, plus Yaba kiosk and bus-stop interactions. Vendor inventory and transit schedules remain future work. |
| Vehicle transition | Existing / integrated | Door open, seat entry, vehicle occupancy, exit animation and return to character controls. |
| Facial animation | Integrated | Expression presets, smoothed morph targets, autonomous blink layer and speech viseme channel control over the 34 available morphs. |
| Motion matching | Prototype utility | A tested trajectory-feature scorer ranks supplied candidates by speed, direction, turn rate and movement state. It is not a full pose-search database and is not the live locomotion driver. |
| Ragdoll physics | Integrated prototype; refinement pending | Eleven low-count Bullet bodies (pelvis, chest, head, upper/lower arms and thighs/shins) use ten cone-twist/hinge constraints in the existing player Ammo world. Physics drives Ara's mapped bones; the capsule is disabled during the fall and the ragdoll is disposed on recovery. Body self-collision is disabled for stability/mobile cost. |

## Next build phases

### Phase 1 — Connected simulation foundation

Completed in this branch: vitals, reusable behaviour-tree nodes, perception/line-of-sight, A* navigation grid, world-interaction registry, facial expression/blink/viseme controller, two-bone IK mathematics, motion-feature scoring prototype, and integration tests in the Yaba scene.

### Phase 2 — Full body animation and IK

The two-bone solver is now bound to Ara's actual thigh/shin/foot nodes. The controller runs after PlayCanvas animation evaluation and uses it for grounded height correction while preserving the existing authored walk/run gait and pelvis-based horizontal foot lock. Next: add surface-normal-aware foot orientation, terrain/step tests, a leg pole-vector calibration pass, and explicit IK weight fades for transitions, jumps, ladder traversal and vehicle entry/exit. Add a small clip blend graph for start, stop, pivot, reverse and lateral movement.

### Phase 3 — Ragdoll and physical recovery

A first 11-body / 10-joint Bullet rig now runs in the existing player physics world, with constrained limbs, collision against static city surfaces, animation-to-physics handoff, body-to-bone synchronization, capsule disable and deterministic resource teardown. Browser smoke verifies a fall, ground settling and recovery. Next: tune joint frames/limits and mass distribution against more poses and impact directions; add optional self-collision only where stable; author front/back get-up clips and blend from the sampled ragdoll pose into those clips. Profile on the target Android device before enabling broader damage/impact cases.

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
- Ragdoll startup must disable the player capsule, constrain all mapped body segments, collide against the city floor and return the character to a valid capsule state on recovery.
- Ragdoll joint quality, full-body recovery blending and motion matching are not accepted as production-complete until profiled and separately tested on the target Android device.

## Mobile budget

Keep full perception and route planning focused on nearby actors. Use a coarse update cadence for distant NPCs, cap path-search expansions, pool physics/render resources, and do not create one full rigidbody ragdoll per pedestrian. The phone-target baseline remains a small active crowd with the full player rig and lightweight kinematic NPCs.
