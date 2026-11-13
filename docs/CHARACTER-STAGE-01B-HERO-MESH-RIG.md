# Character Stage 01B — Hero Appearance, Mesh, Materials and Rig

**Status:** In progress; asset-generation job queued, not yet validated.  
**Branch:** character-stage-01b-original-hero-rig  
**Previous stage:** Character 01A merged through PR #12.  
**Private asset workspace:** [Naija City — Hero Character 01B](https://blendstra.com/studio?workspace=wsp_a570bc495f2b652cccd702269f77dafd1b1ea057&project=befd196a-6cbf-4539-8671-f92446cab835)

## Objective

Create the first original production hero asset for Naija City: a grounded semi-photorealistic Nigerian young adult male, in everyday Lagos streetwear, with a reusable humanoid skeleton that can support the future 60-clip animation library.

The asset is not a military operator, a superhero, or a copy of a commercial-game character. Approved direction remains: age presentation around 24–26, approximate height target 1.82 m, relaxed A-pose, streetwear that can be replaced by the wardrobe system.

## Proposed appearance and modular parts

- Anatomical body and face with natural proportions, dark-brown skin shading, eyes and facial detail.
- Short natural twist hairstyle.
- Muted grey T-shirt under a forest-green casual overshirt.
- Dark charcoal/olive cargo trousers with separate pockets and tabs.
- Practical everyday trainers with separate soles and uppers.
- Compact cross-body sling bag and strap.
- Smartphone and discreet earpiece/microphone.
- Replaceable clothing/accessory objects remain separate from the body mesh where practical.

The character is an original fictional design. Do not transfer the appearance, logo, wardrobe, or geometry of the older GIDI Main Protagonist V1 or any commercial game character.

## Source and asset provenance

- Anatomy base: CC0 MakeHuman hm08 base, used through the installed Blendstra Human workflow and adapted for this original brief. CC0 describes the base source, not an automatic certification of every generated derivative.
- PBR material surfaces: original generated Blendstra material presets (worn_canvas, woven_fabric, oiled_leather, matte_rubber, dark_hair, brushed_aluminum, satin_plastic), customized for the character.
- Clothing geometry, accessories, rig and assembly: original authored project geometry.
- No external commercial character mesh or animation pack is imported.

## Skeleton contract

The rig uses one stable named humanoid hierarchy. Core locomotion bones use Mixamo-style names for future retargeting compatibility; this does not claim Mixamo certification.

Core body hierarchy:
- Root, Hips, Spine, Spine1, Spine2, Neck, Head.
- Left/Right UpLeg, Leg, Foot, ToeBase.
- Left/Right Shoulder, Arm, ForeArm, Hand.
- Three joints for each thumb, index, middle, ring and pinky finger.
- Jaw, LeftEye, RightEye, LeftBrow, RightBrow facial controls.
- Non-deforming attachment sockets for phone, gadget, bag and headset.
- Non-deforming hand/foot IK targets and elbow/knee pole targets for later authoring.

All future animation clips must use the exact approved bone names, rest pose, scale, orientation and hierarchy. Any rig change after this stage requires an explicit compatibility review before animation production.

## Rigging and deformation checks

- Skin each deforming mesh to the armature with normalized weights.
- Vertex weights must sum to 1.0 within 0.002.
- Run forearm and leg deformation smoke tests in Blender, restore the exact neutral pose, and preserve the tests in the asset notes.
- Clothing should be bound to its relevant torso/arm/leg chains; rigid details should be bone-parented to their attachment joint.
- IK control bones are authoring controls; runtime IK and gameplay integration are deferred to later stages.
- Do not create the 60 body clips in this stage.

## Technical delivery

Preferred deliverable is a single GLB containing the body, modular wardrobe, accessories, materials, skeleton and skinning, plus editable native Blender source in the private asset project. Export conventions: metre scale in Blender, source Z-up, glTF Y-up. Avoid 4K textures; maintain a mobile-conscious texture and topology budget.

The private asset project is the source of truth until its GLB is validated and a tested copy is added to this repository under public/assets/characters/.

## Acceptance gates

1. **Geometry:** no missing body/clothing parts, obvious intersections or broken normals; silhouette and proportions reviewed from front, rear, side and oblique views.
2. **Scale/orientation:** target height approximately 1.82 m; correct ground contact; front axis and glTF Y-up orientation checked.
3. **Materials:** all intended PBR materials survive GLB export/reopen; texture images are embedded; no unsupported material graphs.
4. **Skeleton:** stable bone count/names/hierarchy, rest pose and object attachments verified.
5. **Skinning:** normalized weights and visible deformation on forearm and leg tests; no detached clothing.
6. **GLB validation:** Khronos glTF Validator has no errors; any warnings are reviewed and explained.
7. **Runtime import:** PlayCanvas ContainerAsset test loads mesh, materials and skeleton without errors; AnimComponentSystem is registered by Stage 01A.
8. **Mobile budget:** delivered GLB remains within project profile (16 MiB, 250,000 triangles and 2,048 draw calls); record actual measured values rather than targets.
9. **Integration boundary:** do not replace the live controller's placeholder yet. Stage 02 will swap only the visual body after the asset passes all tests.

## Cross-check log

| Check | Result |
|---|---|
| Prior Stage 01A CI | Passed; one non-blocking GitHub Actions Node.js 20 deprecation warning |
| Prior GIDI Main Protagonist V1 candidate | Rejected for this brief; not reused |
| Original Character 01B generation | Queued; pending |
| GLB / rig / texture validation | Not run yet |
| PlayCanvas runtime import | Not run yet |
| Android visual/performance test | Not run yet |

Do not mark this stage complete while any of the required checks remain pending or fail. Move uncompleted animation, IK polish, traversal, facial-expression clips and companion work into their own later stages.
