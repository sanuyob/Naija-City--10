# Naija City — Character 02: Original Mesh, Clothing & Reusable Humanoid Rig v1.0

**Status:** Production specification / asset-generation gate  
**Depends on:** Character 01 visual design v1.0  
**Target:** PlayCanvas 2.24, Android browser first  
**Delivery target:** GLB 2.0, with FBX retained only if a tool requires it for an intermediate rig workflow  
**Character:** Original fictional Nigerian male city resident; no real-person likeness

## 1. Objective

Create the first actual 3D hero asset for Naija City: a complete human character with the locked face, hairstyle, body proportions, launch outfit and a reusable humanoid skeleton. This stage is asset production, not a gameplay-controller rewrite.

The current procedural player remains active until the delivered asset passes the acceptance gates in this document.

## 2. Locked visual reference

Follow `docs/character-01-visual-design-v1.md` exactly:

- Fictional Nigerian man, approximately 24–26.
- Deep warm-brown skin; softly angular oval face; natural dark-brown eyes.
- Short low taper fade with compact natural coils.
- Lean-athletic everyday proportions; approximate height 1.80–1.84 m.
- Muted deep-teal crew-neck T-shirt.
- Open warm sand/olive casual overshirt.
- Charcoal/graphite straight-fit trousers.
- Charcoal low-profile sneakers with off-white sole accents.
- Compact dark olive-charcoal crossbody sling bag.
- No third-party logos, weapons, tactical styling or exaggerated superhero proportions.

## 3. Required geometry and garment construction

The asset must include complete head, ears, neck, torso, arms, hands, fingers, legs and feet. Facial geometry must be coherent at third-person gameplay distance; avoid a featureless mask, fused fingers, malformed ears, floating hair or unfinished shoe soles.

Clothing must visibly read as separate garments:
- T-shirt with collar and sleeves.
- Open overshirt with collar, front placket, cuffs and hem.
- Trousers with a readable waistband, crotch and knee regions.
- Pair of sneakers with distinct uppers and soles.
- Sling bag with a continuous strap routed diagonally across the torso.

Where the generation pipeline supports it, keep the T-shirt, overshirt, trousers, shoes and bag as separate named mesh objects or independently hideable garment groups. If the generated GLB merges garments, record that limitation; do not claim wardrobe modularity until verified. Do not add tiny detached buttons, stitches or decorative objects that inflate draw calls.

## 4. Skeleton and skinning requirements

Create one reusable humanoid biped skeleton suitable for the hero and future squad members. The skeleton should include, at minimum:

- Root / hips / spine chain / chest / neck / head.
- Left and right clavicle, upper arm, forearm and hand.
- Finger chains sufficient for readable grips and interactions.
- Left and right upper leg, lower leg, ankle and foot.
- Stable left/right naming and consistent bone orientation.

Skin weights must support neutral A-pose, arm swing, elbow bend, crouch, knee bend, jump, landing and short grounded parkour poses. Inspect shoulder, elbow, wrist, hip, knee and ankle deformation. Avoid rigid clothing shells and obvious body-through-cloth intersections.

Add named attachment transforms where the export pipeline permits:
- `hand_r_item`, `hand_l_item`
- `back_bag`
- `head_look`
- `foot_l`, `foot_r`
- `root_motion_reference`

The gameplay controller remains authoritative for movement. The rig must not force root-motion integration in this stage.

## 5. Mobile-first budgets

These are acceptance targets, not claims about the generator's output:

- Final complete hero outfit: target 25,000–45,000 triangles.
- Prefer 4–6 material slots.
- Start with 1K textures; 2K only if a device test justifies it.
- Avoid unnecessary transparency, hair cards with excessive overdraw, dense hidden geometry and one-object-per-detail construction.
- Keep a high-quality source/master separately from the optimized runtime GLB when the tool supports it.
- Record actual triangle count, vertex count, mesh count, material count, texture dimensions and GLB byte size before accepting.

If an initial generator returns a denser model, run a controlled retopology/simplification pass and inspect the result. Never decimate blindly across the face, hands, clothing folds or deformation zones.

## 6. Proposed production sequence

1. Generate one original full-body character mesh from the locked written design. Prefer an A-pose suitable for skinning and a neutral, uncluttered background only if a reference render is required.
2. Inspect the generated mesh and clothing silhouette before proceeding. Reject obvious anatomy, face, garment or accessory defects.
3. Retopologize or simplify to a measured mobile budget while preserving face, hands, garment edges and deformation loops.
4. Generate PBR textures/materials and verify that the palette matches the Character 01 specification.
5. Rig the completed mesh as a biped and export GLB.
6. Inspect the rigged GLB for bone hierarchy, skin weights, bind pose, orientation, scale, materials and missing assets.
7. Test representative poses and deformation. If the rig is not reusable or clothing deforms badly, revise before integration.
8. Import into a temporary PlayCanvas test scene; do not replace the live player yet.
9. Run browser smoke checks and Android-device checks for load time, memory pressure, frame stability and visual quality.
10. Only after all gates pass, prepare a separate Character 03 animation pass and later Character 04 integration.

## 7. Tooling and truthfulness

The Design Game Studio asset-pipeline workflow defines production checks; it is not itself a mesh generator or Blender session.

A connected 3D generation service may create a GLB from text or image input, and a separate rigging operation may create a biped rig. These are distinct operations. A generated mesh is not automatically a clean, production-ready, modular character. A rigged GLB is not proof of good skin weights, reusable bone naming, animation quality or PlayCanvas compatibility.

Before any credit-consuming generation, disclose the exact provider, requested output and credit cost when the service exposes it, and obtain explicit approval. If the service cannot quote cost before execution, stop and ask before starting the paid operation. Never silently spend credits or retry an uncertain generation.

## 8. Acceptance checklist

- [ ] Visual identity matches Character 01 front, side, back and three-quarter views.
- [ ] Full anatomy is present and visually coherent.
- [ ] All five garment/accessory groups are present and named or their merged status is documented.
- [ ] Clothing has no obvious gaps, floating pieces or severe intersections in representative poses.
- [ ] One humanoid biped skeleton exists with a documented hierarchy.
- [ ] Skin weights deform shoulders, elbows, wrists, hips, knees and ankles acceptably.
- [ ] Attachment transforms exist or are explicitly documented as unavailable.
- [ ] Actual mesh, material, texture and file-size metrics are recorded.
- [ ] GLB opens and validates; scale and up-axis are confirmed.
- [ ] Temporary PlayCanvas import succeeds without modifying the live controller.
- [ ] Android test is completed before replacing the procedural player.

## 9. Explicit non-goals

This stage does not produce the full 60-clip animation library, companion AI, movement controller changes, camera changes, mobile UI changes or live-player replacement. Those belong to later stages.

## 10. Delivery record

Record the generator/provider and model version, generation and rig job identifiers, source prompt, output URL, asset hashes, license/provenance statement, GLB metrics, validation results and known limitations. Do not mark Character 02 complete until the actual rigged asset and its checks are available.
