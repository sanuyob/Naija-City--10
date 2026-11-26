# Naija City — Player Character 01: Visual Design v1.0

**Status:** Design specification locked for asset production  
**Engine target:** PlayCanvas 2.24  
**Primary target:** Android browser, with desktop browser support  
**Asset format:** glTF 2.0 binary (.glb)  
**Character identity:** Original fictional Nigerian man; no likeness to a real person or copyrighted character

## 1. Design intent

Create a believable young Nigerian city resident who can move naturally through Naija City's Yaba and Lagos-inspired streets. He should look capable and athletic without reading as a superhero, soldier, bodybuilder, or fantasy protagonist.

Visual pillars:
1. **Authentic contemporary Nigerian streetwear** — practical, locally believable, modern, and replaceable.
2. **Grounded human proportions** — natural anatomy, expressive face, convincing hands and feet.
3. **Readable at mobile gameplay distance** — clear silhouette and restrained colour blocking, without oversized accessories.

## 2. Face and identity

- Fictional male, approximately 24–26 years old.
- Deep warm-brown skin with subtle tonal variation; realistic but not pore-heavy at gameplay distance.
- Face shape: softly angular oval with a defined but natural jaw and cheek structure.
- Dark-brown eyes, natural brows, proportionate ears, medium-width nose, and natural lips.
- Short, neat low taper fade with compact natural coils on top; clean hairline, no exaggerated height.
- Subtle facial asymmetry and restrained expression detail so the face does not look like a plastic mannequin.
- Neutral expression is calm and alert. Do not add scars, weapons, tactical markings, or caricatured ethnic features.

## 3. Body proportions and silhouette

- Approximate in-world height: 1.80–1.84 m; final scale must be calibrated against the existing player capsule and street props.
- Lean-athletic everyday build: balanced shoulders, natural chest, waist and limbs; not oversized.
- Hands, wrists, knees, ankles and feet must be anatomically readable and deform cleanly.
- Shoulder width and clothing silhouette must permit arm swing, crouching, jumping and climbing/landing poses.
- Neutral A-pose for rigging, with enough clearance between arms and torso for skinning.

## 4. Wardrobe — launch outfit

- **Base layer:** dark muted teal crew-neck T-shirt, short sleeves, natural fabric folds.
- **Overshirt:** open lightweight casual overshirt in warm sand/olive, relaxed but fitted enough to avoid a boxy silhouette; collar, placket, cuffs and hem are separate readable forms.
- **Trousers:** charcoal/graphite straight-fit jeans or practical casual cargo trousers; restrained pocket detail and clear knee deformation.
- **Footwear:** low-profile everyday sneakers in charcoal with off-white sole accents; no visible third-party logos.
- **Accessory:** compact crossbody sling bag with strap routed diagonally across the torso and enough clearance from shoulder/arm joints.
- **Optional small detail:** simple wristwatch and phone attachment point. Keep accessories removable and avoid dangling pieces that create excessive draw calls.

All clothing must be separate material regions or meshes where practical, but share the same deforming skeleton. No garment may be a rigid shell that clips through the body during motion.

## 5. Colour palette

| Region | Colour direction | Hex guide |
|---|---|---|
| Skin | Deep warm brown | #70452F |
| Hair | Natural near-black | #171513 |
| T-shirt | Muted deep teal | #244B50 |
| Overshirt | Warm sand/olive | #9A8B68 |
| Trousers | Graphite charcoal | #30343A |
| Sneakers | Charcoal / off-white | #292B2D / #D8D4C9 |
| Bag | Dark olive-charcoal | #3B4036 |
| Small accent | Muted brass | #A7864E |

Hex values are art-direction guides, not final sRGB-to-linear material values. Tune materials under the actual Naija City daylight and street lighting.

## 6. Materials and surface quality

- PBR workflow: base colour, normal, roughness; metallic only where physically appropriate.
- Skin should be matte/satin, not glossy plastic. Cloth should have visible but restrained roughness and normal detail.
- Avoid unnecessary 4K maps. Start with 1K maps for small assets and 2K only for hero-critical texture sets after device profiling.
- Use trim sheets/atlases or shared materials where this does not compromise garment readability.
- No baked lighting that conflicts with the game's dynamic daylight.

## 7. Modularity and attachment points

Required named attachment points:
- hand_r_item, hand_l_item
- back_bag
- head_look
- foot_l, foot_r
- root_motion_reference (reference only; gameplay controller remains authoritative initially)

Clothing variants must be swappable without changing the base skeleton. The crossbody bag must be independently hideable.

## 8. Mobile-first asset budgets (initial targets, to be measured)

- Hero body + clothing: target 25k–45k triangles for the complete launch outfit; reduce if Android profiling requires it.
- One skinned mesh per sensible material/garment group; avoid a separate mesh for every button, seam or tiny accessory.
- Keep the launch outfit to approximately 4–6 material slots where possible.
- One shared humanoid skeleton; facial motion should use a small set of blend shapes or lightweight bones only if supported and affordable.
- Prefer 1K textures initially; cap hero-critical maps at 2K pending device tests.
- Provide a reduced-detail LOD for distant viewing if profiling demonstrates a need.

These are budgets, not proof of performance. The actual GLB must be measured in the game on the target Android device.

## 9. Required views and acceptance gates

Before rigging is accepted, capture front, back, left and right orthographic views plus a three-quarter gameplay view.

Reject or revise if:
- Clothing intersects the body in neutral pose or representative movement poses.
- The overshirt reads as a rigid box or has disconnected-looking cuffs/hem.
- Hands, feet, face or hair are unfinished or visibly primitive.
- The sling strap cuts through the neck, shoulder or arm.
- The character's silhouette becomes unclear at normal third-person camera distance.
- The model exceeds budget without a documented reason.

## 10. Animation compatibility requirements

The mesh and skeleton must support:
- Idle, walk, run, sprint
- Jump take-off, airborne loop, landing
- Crouch idle and crouch walk
- Contextual grounded parkour: low vault, step-up, short ledge climb, controlled drop and landing recovery

Use one reusable humanoid skeleton for the hero and future squad characters. Keep locomotion, upper-body actions and full-body parkour overrides separable. Facial blinks/expressions are not counted as body animation clips.

## 11. Rights and provenance

This is an original character specification authored for Naija City. Do not add third-party logos or copy a recognizable real person's face, commercial game character, costume, or proprietary animation. Record the origin and license of every externally sourced asset in the project's asset register.

## 12. Production handoff

Character 01 is complete when this specification is approved and the visual design is represented in a reviewable character sheet. Character 02 must then produce the original mesh, garments and weighted skeleton. Do not replace the current procedural player in the game until the resulting GLB passes visual inspection, glTF validation, PlayCanvas import and Android testing.
