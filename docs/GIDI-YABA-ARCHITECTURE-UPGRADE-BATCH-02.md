# GIDI Yaba Architecture Upgrade — Batch 02

## Scope

Batch 02 upgrades the existing Yaba commercial and mixed-use building placements in Naija City. It does not add new plots, move buildings, or change placement sizes.

- Existing Yaba core placements upgraded: `yaba-core-02` through `yaba-core-32` (31 assets).
- Existing expansion shop placements upgraded: `expansion-shop-33`, `34`, `35`, `36`, `37`, `39`, and `40` (7 assets).
- Existing anchor retained and switched to the shared texture pack: `expansion-shop-38`.
- Computer Village hero `yaba-core-01` remains its own Stage 08F hero asset.
- All 8 neighbourhood-home placements remain unchanged.

The 38 new curated replacements plus the original anchor give 39 Yaba commercial/mixed-use placements on the GIDI Yaba Architecture Standard v1 material contract. The Stage 08E manifest remains exactly 48 placements.

## Shared weathered PBR library

The 24 shared KTX2 files are stored once in:

`public/assets/curated-buildings/textures/`

They provide eight material families: warm cast concrete, weathered cream plaster, painted dark metal, roof membrane, sign enamel, terracotta coating, tinted shop glass, and weathered polyethylene tank.

- 2K: plaster and cast concrete.
- 1K: painted steel, roof membrane, sign enamel, terracotta, glass and tank finishes.
- Base colour: ETC1S Basis with mipmaps.
- Normal and roughness/metallic: UASTC Basis with mipmaps.
- Normal data: OpenGL tangent-space; all geometry primitives include MikkTSpace tangents.
- Source maps: ambientCG PaintedPlaster017, Concrete034 and CorrugatedSteel009, CC0 1.0.

Each GLB points to the same relative `textures/*.ktx2` URIs. Texture binaries are not embedded in the 39 building GLBs.

## Geometry and runtime contract

Every upgraded placement keeps its existing manifest ID, kind, position, yaw and size. Each curated GLB has a neutral outer `BuildingRoot`, nested `ASSET_ORIENTATION`, `LOD0`, `LOD1`, `LOD2`, and a separate `COLLISION_PROXY`.

The models reuse a controlled set of material-grouped meshes and vary facade details by the existing asset seed and building type. Commercial assets use street-facing retail glazing or shutters, sign fascia, awnings/canopies, concrete pilasters, security details, roof parapets, water tanks, AC condensers, rainwater pipes and utility hardware. Mixed-use assets add upper-floor window bays and projecting balcony/rail assemblies. Larger expansion footprints use wider shopfront compositions.

## Packaging and size

| Payload | Size |
|---|---:|
| 38 new geometry-only curated GLBs | 6,071,740 bytes |
| Existing anchor geometry-only GLB | 2,514,308 bytes |
| Shared 24-map KTX2 library (one copy) | 12,031,694 bytes |
| Combined Yaba curated geometry + shared texture payload | 20,617,742 bytes |

The shared map library is approximately 12.0 MB regardless of whether one or all 39 curated buildings are loaded. Each of the new geometry GLBs is approximately 112 KB–283 KB. The anchor GLB no longer embeds its previous texture payload.

## Verification

- `npm run assets:08e`: passed; the 38 existing placements were regenerated and the anchor was externalized once.
- Stage 08F hero generation after Stage 08E: passed; the Computer Village hero and 48-entry world manifest are preserved.
- Khronos glTF validation with a local external-resource callback: zero errors. This validator version does not fully understand `KHR_texture_basisu`, so the expected URI / unsupported-extension / KTX2 image warnings are recorded.
- PlayCanvas 2.24.1 with the game's pinned Basis initializer: sampled Yaba core commercial, core mixed-use, expansion mixed-use, anchor and expansion commercial assets all loaded. Zero loader failures and zero browser errors.
- Sample LOD mesh-instance counts: core commercial 7/6/4; core mixed-use 8/7/5; expansion mixed-use 8/7/4; anchor 8/7/6; expansion commercial 8/7/5.
- Stage 08E manifest remains 48 placements; no new buildings were added.

Physical Android load time, GPU memory, thermal behaviour and sustained frame rate still require a device build and measurement. The assets are staged on `feature/gidi-yaba-architecture-01`; no public deployment or merge has been performed.
