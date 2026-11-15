# Naija City — Hero Character & Crew System Specification

**Specification:** v1.0  
**Status:** Approved design baseline  
**Approved decisions:** Two active teammates; grounded traversal; balanced action presentation.  
**Runtime:** PlayCanvas 2.24, Blender glTF/GLB pipeline.  
**Scope:** Character art, rig, animation, traversal, crew behaviour, integration and mobile acceptance.

## 1. Character identity

A grounded, semi-photorealistic fictional Nigerian male protagonist, approximately 24–26. He is an agile, resourceful and technologically capable Nigerian city resident, not a superhero or full-time military operator. The character must have an original Naija City identity rather than reproduce a named character or proprietary game design.

## 2. Appearance, clothing and materials

- Believable African facial anatomy, natural skin shading and subtle skin detail.
- Carefully modelled eyes, brows, lips, hair, hands, fingers and footwear.
- Natural proportions, readable silhouette and expressive but restrained facial performance.
- Contemporary Lagos streetwear: T-shirt or casual overshirt, jeans or cargo trousers, everyday sneakers and a small crossbody bag.
- Smartphone and discreet communication earpiece as optional attachment props.
- One recognisable launch outfit; later wardrobe variants reuse the same compatible body rig.
- PBR material authoring with sensible texture budgets, mipmaps and mobile-appropriate texture compression.
- Wardrobe parts must be replaceable without changing the skeleton contract.

No final mesh, textures or animation clips are considered delivered until the actual assets exist in the repository and pass review.

## 3. Rig and skeleton contract

Use one reusable humanoid skeleton for the hero's complete animation set. The skeleton hierarchy and animated node names must remain identical across animation-only GLBs.

Required capabilities:
- Full-body skeletal animation.
- Upper/lower body masks and independent head/eye control.
- Hand and foot IK where required by a specific interaction or traversal.
- Facial expression controls, blink and eye-look channels.
- Stable attachment nodes for phone, bag, earpiece and fictional game props.
- Consistent rest pose, bone roll, forward axis, scale and root convention.
- Documented naming convention and a skeleton version identifier.

Facial channels are additional controls and do not count toward the 60 body clips.

## 4. Approved 60-clip library

All clips bind to the same skeleton. These are animation assets, not 60 separate animation systems.

### A. Locomotion — 14
1. Relaxed idle
2. Alert idle
3. Forward walk
4. Backward walk
5. Jog
6. Sprint
7. Strafe left
8. Strafe right
9. Movement start
10. Movement stop
11. Turn left 90 degrees
12. Turn right 90 degrees
13. Pivot left 180 degrees
14. Pivot right 180 degrees

### B. Grounded parkour and stunts — 18
15. Running approach transition
16. Speed vault
17. Controlled two-hand vault
18. Side vault
19. Vehicle bonnet vault
20. Step-up climb
21. Jump-to-ledge reach
22. Hanging idle
23. Ledge shimmy left
24. Ledge shimmy right
25. Ledge mantle and pull-up
26. Controlled drop-down
27. Precision gap jump
28. Wall rebound
29. Short wall-run on approved surfaces
30. Handrail balance traversal
31. Soft landing
32. Shoulder-roll landing

### C. Everyday interactions — 8
33. Checking phone
34. Typing on phone
35. Casual greeting
36. Picking up an object
37. Inspecting an object
38. Opening a door
39. Sitting down
40. Standing up

### D. Squad and teammate interactions — 10
41. Calling a teammate
42. Listening and responding through earpiece
43. Pointing towards a location
44. Beckoning a teammate to follow
45. Hold-position hand signal
46. Regroup hand signal
47. Assisting a teammate
48. Helping a teammate back to their feet
49. Team briefing gesture
50. Team celebration

### E. Equipment and cinematic action — 10
51. Equipping a fictional game prop
52. Stowing equipment
53. Relaxed ready pose
54. Stationary aiming pose
55. Turning while carrying equipment
56. Slow movement while carrying equipment
57. Crouched equipment pose
58. Stylised fictional equipment-use action
59. Deploying a non-lethal technology gadget
60. Fictional equipment cooldown/reset

Action clips are authored as fictional game presentation. They are not intended to reproduce real-world weapon operation or tactics.

## 5. Grounded traversal gameplay

The traversal system must be contextual and geometry-aware. It should identify approved obstacle categories and select an animation based on obstacle dimensions, approach direction, movement state and available landing space.

Supported interactions include suitable wall and rail vaults, designated gaps, approved ledges, hanging/shimmy, accessible rooftop mantles, controlled drops, selected landing rolls and short assisted wall movements.

A single contextual Parkour action should be practical on mobile. It may automatically select a traversal only after a valid target has been found and the path/landing area is clear. No arbitrary building scaling or unlimited climbing.

The movement/collision controller remains authoritative unless a separately tested traversal contract temporarily coordinates a fixed target displacement. Animation and gameplay movement must finish at the same validated target; visual root motion must not silently desynchronise collision.

## 6. Crew system

The approved gameplay cap is **two active companions alongside the hero**. The recurring roster may contain three roles:
- **Tech specialist:** technology mission assistance, scouting and information.
- **Driver:** vehicle delivery, transport and extraction.
- **Field support:** follows the protagonist and assists with objectives.

The two active slots are selected from the roster. Do not assume all three roles are simultaneously active. Player calls use the in-game phone or a compact quick-access communication interface.

Commands:
1. Follow me
2. Hold position
3. Regroup
4. Assist me
5. Check ahead
6. Create a distraction
7. Return to pickup

Every command receives clear feedback through a radio/phone response and visible behaviour. Companions navigate from a believable nearby position, avoid obstructing the player and can report that they are unavailable. No teleporting or unexplained spawning. Start with deterministic, lightweight companion behaviour; networked or LLM-driven AI is not required.

## 7. Balanced action presentation

Use short radio exchanges, squad status, acknowledgement gestures, mission briefings, restrained camera moments, readable fictional gadget feedback, optional equipment selection and teammate assistance/extraction sequences. Preserve the game's city exploration, social interactions, driving and traversal focus. The result must be original to Naija City.

## 8. PlayCanvas animation architecture

- **Base layer:** locomotion and ordinary movement.
- **Upper-body masked layer:** phone, gestures and compatible equipment poses.
- **Facial layer:** blink, eye direction and expressions.
- **Full-body action states:** parkour, falls, landings and interactions that require complete body control.
- **Animation events:** footsteps, landings, interaction cues and dialogue timing.

Use the modern PlayCanvas Anim component, state graphs, blend trees, layers and masks. Keep movement authority in the existing third-person controller. Root motion is evaluated clip-by-clip; do not enable it globally without a tested movement/collision integration.

The character container and animation-only containers must share the same animated node names. Validate the imported hierarchy and clips before enabling gameplay. Reuse shared graph definitions where practical, but keep clip assignment explicit and testable.

## 9. Asset production and validation

1. Model the hero and wardrobe in Blender.
2. Build and validate the skeleton, rest pose, scale and axis.
3. Create a five-clip animation pilot before producing all 60.
4. Name Blender Actions and NLA tracks explicitly; avoid generated names such as Action.001.
5. Export GLB with skinning and animation enabled.
6. Validate GLB structure, animation count, duration, joint bindings and file size.
7. Import the character and animation assets into PlayCanvas.
8. Connect clips to state graphs, blend trees and masks.
9. Integrate with the existing controller without replacing its movement/collision responsibilities.
10. Run automated browser tests and physical Android acceptance tests.

## 10. Acceptance criteria

- Stable character scale, orientation and root convention.
- All clips bind to the same skeleton without missing nodes.
- No missing or duplicated clip names.
- Smooth locomotion transitions and no obvious foot sliding at target movement speeds.
- No severe mesh deformation, broken skinning or visible clothing intersections in reviewed poses.
- Parkour only activates for valid obstacles and reaches the intended collision-safe target.
- No unexplained animation freeze or permanent input lock.
- Teammates do not block the hero or spawn without a believable arrival.
- No major mobile frame-time, memory or loading regression.
- Physical Android results are recorded separately from automated desktop/browser results.

## 11. Mobile performance policy

The target remains the Android-first Naija City build. Start with one hero and at most two active companions. Use shared materials and animation data, appropriate LODs, compressed textures, bounded update rates for distant companions and minimal background simulation. Record cold/warm load time, average and p95 frame time, draw calls, memory estimates, thermal drift and stability on the actual phone. A 30 FPS target is a test goal, not a claimed result.

## 12. Inspirations and originality

- Watch Dogs 2: expressive urban movement, crew identity and technology-driven mission options.
- Call of Duty: concise radio presentation, briefings and responsive squad feedback.
- RPGs: wardrobe, equipment progression and relationships.

Naija City must retain original characters, assets, animations, UI and world identity.
