# Naija City — Hero Character & Crew Development Roadmap

**Baseline:** Hero Character & Crew System Specification v1.0  
**Approved design:** 2 active companions; grounded stunts; balanced action presentation.  
**Policy:** Each stage has its own scope, deliverables and acceptance gate. If an asset or test cannot be completed properly in its stage, it remains open and is carried into its named follow-up stage. Never mark an unbuilt asset or unrun device test as complete.

## Character Stage 00 — Runtime preparation (current foundation)

**Goal:** Prepare the PlayCanvas runtime to support the modern animation component without changing the current placeholder controller.

Deliverables:
- Register PlayCanvas 2.24 AnimComponentSystem.
- Preserve the existing procedural player and movement controller.
- Record the asset/skeleton contract and staged delivery plan.
- No dummy rig or fake animation clips.

Acceptance:
- Existing verification, production build and browser smoke tests pass.
- Existing mobile controls and movement remain unchanged.
- No claim that the hero is animated until a real rigged asset is imported.

## Character Stage 01 — Hero appearance, mesh and rig

Deliverables:
- Approved hero concept and final original Nigerian streetwear design.
- Production mesh, UVs, materials and mobile LODs.
- Wardrobe separation/attachment plan.
- Humanoid skeleton, rest pose, attachment nodes and facial controls.
- Skeleton naming/version document and a validation GLB.

Acceptance:
- Visual review of front, side, back and close-up views.
- Correct scale, axis, topology, UVs, skinning and attachment transforms.
- Khronos glTF Validator passes.
- Character loads in PlayCanvas without replacing or breaking the controller.

If a suitable Blender authoring environment or final character asset is not available, Stage 01 remains open; do not substitute the existing primitive placeholder and call it done.

## Character Stage 02 — Core locomotion and controller integration

Deliverables:
- Five-clip pilot: relaxed idle, forward walk, jog, sprint and jump/landing test as applicable.
- Complete locomotion set after pilot approval.
- Anim state graph, speed/direction blend logic and movement parameter mapping.
- Clean replacement of the procedural placeholder geometry only after the rig passes.

Acceptance:
- Consistent skeleton bindings and smooth state transitions.
- Foot sliding and acceleration/deceleration reviewed at actual controller speeds.
- Sprint, jump, crouch, camera, collision and mobile controls remain functional.
- Automated build/browser tests pass.

## Character Stage 03 — Grounded parkour and traversal

Deliverables:
- All 18 approved traversal clips.
- Contextual obstacle classification and safe traversal target selection.
- Mobile contextual Parkour action.
- Ledge, landing and collision coordination.

Acceptance:
- Each traversal only activates for an approved obstacle.
- The hero reaches the validated target without passing through geometry.
- Invalid traversal requests leave normal controls available.
- No arbitrary climbing or permanent movement lock.

## Character Stage 04 — Everyday interactions and facial performance

Deliverables:
- Eight everyday interaction clips.
- Facial blink, eye-look and expression channels.
- Phone and door attachment/interactions.
- Upper-body masking where compatible.

Acceptance:
- Interactions start and end at the correct prop/world positions.
- Facial channels do not break body animation.
- Movement is safely restored after each interaction.

## Character Stage 05 — Equipment animation and balanced presentation

Deliverables:
- Ten fictional equipment/cinematic clips.
- Original prop attachment points and selection feedback.
- Radio/briefing presentation hooks and contextual camera/audio cues.
- Non-lethal gadget interaction.

Acceptance:
- Equipment attaches to the correct nodes and does not visibly clip through the body.
- Presentation remains balanced and does not overwhelm city exploration.
- All actions are fictional game presentation, not real-world weapon-operation simulations.

## Character Stage 06 — Crew roster, calling and companion AI

Deliverables:
- Three roster roles: tech specialist, driver and field support.
- Maximum two active companions at a time.
- Phone/quick-access calling UI and seven approved commands.
- Deterministic follow, hold, regroup, assist, check-ahead, distraction and pickup behaviours.
- Believable approach/arrival and unavailable responses.
- Radio acknowledgements and squad status.

Acceptance:
- Active companion cap is enforced.
- Companions navigate without blocking the hero or popping into existence.
- Commands produce clear state changes and acknowledgements.
- Mobile performance is profiled with two companions active.

## Character Stage 07 — Polish, profiling and Android acceptance

Deliverables:
- Animation polish, timing and transition cleanup.
- LOD, material, texture and update-rate optimisation.
- Automated regression suite and physical Android test report.
- Final known-issues list and release gate.

Acceptance:
- No broken bindings, missing clips or persistent animation freezes.
- Record load time, average/p95 frame time, draw calls, memory estimates, thermal drift and stability.
- Test the actual target Android phone; browser smoke tests alone do not qualify as device acceptance.
- Document any deferred work as a separate follow-up stage.

## Deferred-work rule

If a stage cannot be completed within its scope or available tools/assets, create a separate named follow-up stage or issue describing:
- the exact unfinished deliverable;
- why it is blocked;
- required asset/tool/input;
- dependencies;
- measurable acceptance criteria.

Do not silently expand a stage, lower its acceptance criteria or mark it complete because the code compiles.
