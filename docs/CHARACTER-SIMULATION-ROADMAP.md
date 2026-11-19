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
| Foot placement / ground detection | Existing / partial | Ground raycasts, support snapping and animated sole-marker diagnostics. The new two-bone solver is currently a tested math utility, not yet applied to Ara's animated leg bones. |
| Behavior trees | Integrated for pedestrians | Reusable selector/sequence/action/condition nodes choose notice, investigate, wait, waypoint and path-follow actions. |
| AI perception | Integrated for pedestrians | Range + field-of-view + oriented-box line-of-sight checks and simple running/vehicle hearing signals. |
| Navigation | Integrated as A* grid | Pedestrian A* routes around collision proxies; this is a grid navigator, not a baked polygon NavMesh. |
| Health and stamina | Integrated | Real health/stamina state, drain/regeneration, recovery delay, damage invulnerability and downed/recovering state. |
| Hit reaction | Basic integrated | Damage events, optional bounded knockback, a short bracing pose, and impact feedback. A dedicated authored hit-reaction animation is still needed. |
| Recovery | Logical recovery integrated | A downed player can recover to a configured health/stamina state, play a temporary recovery posture and regain control. Physical ragdoll/get-up blending is not yet present. |
| Interaction system | Integrated foundation | Data-driven interactable registry, distance/visibility checks, contextual HUD prompt, plus Yaba kiosk and bus-stop interactions. Vendor inventory and transit schedules remain future work. |
| Vehicle transition | Existing / integrated | Door open, seat entry, vehicle occupancy, exit animation and return to character controls. |
| Facial animation | Integrated | Expression presets, smoothed morph targets, autonomous blink layer and speech viseme channel control over the 34 available morphs. |
| Motion matching | Prototype utility | A tested trajectory-feature scorer ranks supplied candidates by speed, direction, turn rate and movement state. It is not a full pose-search database and is not the live locomotion driver. |
| Ragdoll physics | Not yet implemented | Requires mapped body-segment rigid bodies, constraints, safe handoff from animation, collision filtering, and a controlled get-up/pose-recovery transition. |

## Next build phases

### Phase 1 — Connected simulation foundation

Completed in this branch: vitals, reusable behaviour-tree nodes, perception/line-of-sight, A* navigation grid, world-interaction registry, facial expression/blink/viseme controller, two-bone IK mathematics, motion-feature scoring prototype, and integration tests in the Yaba scene.

### Phase 2 — Full body animation and IK

Bind the two-bone solver to Ara's actual thigh/shin/foot joint chains through a separate post-animation pose layer. Use ground hit normals and bounded ankle targets. Preserve the existing authored walk and run clips; IK must be enabled only when the foot is in stance and disabled during jumps, ladder traversal and vehicle transitions. Add a small clip blend graph for start, stop, pivot, reverse and lateral movement.

### Phase 3 — Ragdoll and physical recovery

Create a low-body-count physics proxy rig with pelvis, torso, head, upper/lower arms and upper/lower legs. Add stable constraints, mass ratios, angular limits, collision filters and a low-frequency update budget. On impact, blend from animation to physics; on recovery, sample body pose and choose a suitable authored get-up animation. Do not activate this on mobile until it passes stability and frame-time tests.

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
- IK never applies on top of incompatible full-body actions and never moves the physics capsule.
- Ragdoll and motion matching are not accepted as complete until they are implemented, profiled and separately tested on the target Android device.

## Mobile budget

Keep full perception and route planning focused on nearby actors. Use a coarse update cadence for distant NPCs, cap path-search expansions, pool physics/render resources, and do not create one full rigidbody ragdoll per pedestrian. The phone-target baseline remains a small active crowd with the full player rig and lightweight kinematic NPCs.
