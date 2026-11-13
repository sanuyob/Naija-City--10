# Naija City — Character 02: 3D Asset Production v1.0

**Status:** Production handoff prepared; generation awaiting credit approval  
**Depends on:** `docs/character-01-visual-design-v1.md`  
**Target engine:** PlayCanvas 2.24  
**Runtime target:** Android browser first  
**Delivery format:** GLB / glTF 2.0

## 1. Objective

Produce the first real, original, game-ready 3D hero asset for Naija City. Character 02 is an asset-production stage, not a controller rewrite. The current procedural player remains in place until the hero GLB passes every acceptance gate in this document.

The hero must match Character 01's approved identity, proportions, launch wardrobe and palette. Do not redesign the face, hair, body shape or outfit during asset generation.

## 2. Locked character target

Use the full source of truth in Character 01. Key constraints:

- Original fictional Nigerian man, approximately 24–26 years old.
- Approximately 1.82 m tall, lean-athletic natural proportions.
- Deep warm-brown skin, softly angular oval face, natural dark-brown eyes.
- Short low taper fade with compact natural coils.
- Muted teal crew-neck T-shirt; open sand/olive casual overshirt; charcoal trousers; charcoal sneakers with off-white soles; compact dark olive crossbody bag.
- Everyday Nigerian city resident. No superhero, military, police or tactical styling.
- Rig-friendly neutral A-pose. Complete hands, feet, face, ears, hair and footwear.

## 3. Proposed model-generation configuration

A model catalog check found a direct Meshy 6 text-to-3D GLB workflow that supports full materials, quad remeshing, an A-pose, and humanoid rigging. The configured estimate is **25 Higgsfield credits**.

The estimate was requested with the following settings:

| Setting | Target |
|---|---|
| Model | Meshy 6 Text to 3D |
| Mode | Full (textured) |
| Geometry | Standard |
| Topology | Quad |
| Target polygon count | 30,000 |
| Symmetry | On |
| PBR | Enabled |
| Pose | A-pose |
| Prompt expansion | Off |
| Height for rig | 1.82 m |
| Humanoid rig | Enabled |
| Initial animation | Disabled |
| Safety checker | Enabled |

**Spend gate:** This is only a cost estimate. No generation job has been submitted and no credits have been spent. Do not submit a paid generation until the user explicitly approves the 25-credit spend. Do not switch to a credit-consuming alternative without approval.

## 4. Asset structure requirements

Preferred eventual project path:

`public/assets/characters/hero-01/hero-01.glb`

Keep the source output and any optimized runtime copy distinguishable. Never overwrite the diagnostic cube, existing city assets, or current player controller.

The generated GLB must be inspected to determine whether the body, T-shirt, overshirt, trousers, footwear and sling bag are separate named mesh nodes or at least separate material regions. Do not claim clothing is independently swappable until the hierarchy proves it. If the provider returns a monolithic mesh, record that limitation and create a separate-garment follow-up rather than silently accepting it as modular.

The bag must be removable or hideable if the export hierarchy permits. Keep the shared skeleton independent of outfit variants wherever practical.

## 5. Skeleton and deformation requirements

- One reusable humanoid skeleton for the hero and future squad characters.
- Correct left/right limbs and readable hierarchy.
- Skin weights must deform shoulders, elbows, wrists, hips, knees and ankles without major collapse.
- Confirm the GLB contains a valid skin, joints and inverse bind matrices.
- Keep the gameplay controller authoritative. Do not enable root-motion movement as part of this asset handoff.
- Add or verify attachment points for `hand_r_item`, `hand_l_item`, `back_bag`, `head_look`, `foot_l`, `foot_r`, and `root_motion_reference`. If the provider cannot emit them, document which anchors need to be added in a later rig pass.

## 6. Mobile budgets

Initial acceptance targets, subject to measured device testing:

- Approximately 25k–45k triangles for the complete launch outfit; initial generation target is 30k polygons.
- Approximately 4–6 material slots where achievable.
- Prefer 1K textures initially; do not assume 2K maps are safe on the target phone.
- Avoid unnecessary small meshes, transparent layers and excessive material splits.
- Record the actual GLB byte size, triangle count, vertex count, mesh count, material count, texture dimensions, joint count and animation count.

These are targets, not performance guarantees. Test load time and frame stability on the actual Android device before release.

## 7. Validation sequence

Run these checks in order after the GLB exists:

1. **File integrity:** confirm the output is a real GLB 2.0 file and record its size and checksum.
2. **glTF validation:** run the repository's installed `gltf-validator` and fix all errors; review warnings rather than ignoring them.
3. **Structure audit:** inspect scenes, nodes, mesh primitives, materials, embedded images, UVs, skin, joints, inverse bind matrices, scale and forward orientation.
4. **Visual review:** capture front, back, left, right and three-quarter views. Check the face, hands, fingers, feet, hairline, folds, garment silhouette and bag strap.
5. **Rig inspection:** check A-pose symmetry, joint placement and representative deformation at shoulders, elbows, hips and knees. A rig's mere presence is not acceptance.
6. **PlayCanvas import test:** load the asset in an isolated test scene first. Confirm it renders, materials resolve, it scales to approximately 1.82 m, and the skeleton can be addressed by the animation system.
7. **Android test:** profile loading, memory pressure and frame stability on the target phone. Do not insert the hero into the live player controller until this passes.

## 8. Integration boundary

No edits to `src/third-person-controller.js`, `src/game.js`, `src/asset-loader.js`, `public/assets/manifest.json`, or the live player scene are part of the initial mesh-generation step.

After the asset is validated, Character 03 will build and test the animation set. Character 04 will integrate the GLB and PlayCanvas animation state graph while preserving movement, camera, stamina, collision, joystick, sprint, jump and crouch behaviour.

## 9. Rights and provenance

Record the output as AI-generated original content and identify the generation provider/model, generation date, source prompt/spec, asset path, modifications and license/usage terms shown by the provider. Do not add third-party logos or imitate a real person's likeness or a protected game character.

## 10. Completion definition

Character 02 is complete only when:

- A real downloadable GLB has been generated and saved into the project.
- The visual identity matches Character 01 closely enough to approve.
- The mesh, garment regions, materials and rig have been inspected and documented.
- glTF validation passes without errors.
- The isolated PlayCanvas import test succeeds.
- The asset register records its provenance and measured technical properties.

Until then, Character 02 remains in production preparation and the existing procedural player remains untouched.
