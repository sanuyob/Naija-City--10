# GIDI Yaba Architecture Upgrade 01

## Scope

This is the first authored mixed-use architecture replacement for Naija City Stage 08E. It targets the existing `expansion-shop-38` placement; the 48-placement Stage 08E layout remains intact.

| Property | Value |
|---|---|
| Placement | `expansion-shop-38` |
| District cell | Yaba east-north |
| World position | `[20.5, 0, -65]` |
| Placement yaw | `0°` |
| World dimensions | `8.4 m wide × 7.4 m high × 13.5 m deep` |
| Asset | `public/assets/curated-buildings/gidi-yaba-mixeduse-upgrade-01.glb` |
| Curated GLB size | 2,514,308 bytes (2.51 MB) |
| Shared texture set | 24 KTX2 maps, stored once at 12,031,694 bytes |
| Source scene | GIDI Yaba Architecture Upgrade 01 (3D Jutsu) |

## Architectural features

The two-storey mixed-use building includes a recessed upper-floor facade with two window/balcony bays, external security grilles, concrete sunshades and drip edges, a glazed shopfront and separate roller shutter, shop fascia panels, a flat roof with parapet, raised rooftop water tank, external AC condenser housings, rainwater downpipe, electrical service boxes, a drain channel and a forecourt apron.

The authored geometry is grouped into eight render mesh instances at LOD0 (44,156 triangles), seven at LOD1 (252 triangles), and six at LOD2 (120 triangles). The separate `COLLISION_PROXY` remains present and is disabled by the existing Stage 08E render loader.

## Dedicated weathered PBR texture pass

Eight surface families now use dedicated base-colour, OpenGL tangent-space normal, and roughness maps:

- 2K weathered painted plaster and cast concrete for the large facade and structural surfaces.
- 1K painted steel, roof membrane, sign enamel, terracotta coating, tinted shop glass, and weathered polyethylene water tank finishes.

The licensed source maps reuse ambientCG PaintedPlaster017, Concrete034, and CorrugatedSteel009 (CC0 1.0). The three sources are identified in the Stage 08E manifest and in the asset authoring record. Base-colour textures use sRGB; normal and roughness textures use linear/non-colour data. The roughness maps are bound through glTF metallic-roughness slots with material-specific metalness factors; no baked AO maps are claimed for this pass.

The final GLB references 24 external KTX2 Basis textures from the shared Yaba library, with full mip chains. Normal and metallic-roughness slots are encoded as UASTC; base-colour slots use ETC1S. The asset also includes MikkTSpace tangent attributes on every mesh primitive. The first embedded PNG/KTX2 payload was removed from the GLB; its geometry-only container is now 2,514,308 bytes, while the 12,031,694-byte texture library exists once and is shared by the 38 additional Yaba commercial/mixed-use buildings.

The installed Khronos glTF Validator build does not understand `KHR_texture_basisu` and reports unsupported-extension / URI-in-GLB / unrecognized-image warnings for the external KTX2 references. With the local external-resource callback, it reports zero errors. The PlayCanvas 2.24.1 Stage 08E loader with the game's pinned Basis initializer loaded the 24 shared maps successfully, and batch smoke tests across Yaba core and expansion placements reported zero asset-loader or browser failures.

## Runtime compatibility checks

- Khronos glTF Validator on the original PNG geometry source: **0 errors, 0 warnings**.
- KTX2 export: **0 glTF validation errors**; this validator version reports expected KTX2-support warnings because it does not recognize the extension/image MIME type.
- PlayCanvas 2.24.1 with the game's pinned Basis initializer: **passed**. All 24 KTX2 maps decoded, including 2K and 1K mip chains; all eight material families were present and there were no browser errors.
- Actual Stage 08E loader smoke: 48 manifest entries recognised; `expansion-shop-38` loaded with zero loader failures; LOD0/1/2 contained 8/7/6 mesh instances; the initial near-field selection enabled only LOD0; the separate collision proxy was found and disabled.
- Hierarchy contract: `BuildingRoot`, nested `ASSET_ORIENTATION`, `LOD0`, `LOD1`, `LOD2`, and `COLLISION_PROXY`: **passed**.
- LOD switching: each level activated separately; the initial near-field selection leaves only LOD0 active: **passed**.
- Inner facing after the game applies the placement root transform: **[-1, 0, 0]**, matching the manifest's `frontAxis: "-X"`.
- Collision proxy discovery and render disable: **passed**.
- Stage 08E generation: still produces 48 placements and reapplies the authored override to `expansion-shop-38`: **passed**.

The inner orientation node is deliberate: the game sets rotation on the outer building entity, so storing the authored -X facing on the outer node would be overwritten during placement.

## Yaba architecture standard v1

This building is the reference archetype for the next Yaba shop and office upgrades. Future assets should follow these rules rather than copy the exact facade:

1. Preserve district-specific building variety: narrow Computer Village shopfronts, mixed-use upper floors, repair-office windows, service stairs, balconies and rooftop plant where the building's role requires them.
2. Build real architectural depth: visible wall thickness, recessed openings, projecting balcony slabs, sunshades, parapets, shutters, rainwater routes and service hardware. Do not fake all detail with flat facade decals.
3. Reuse the eight named surface families and their source maps. Keep plaster and concrete at 2K for hero surfaces and secondary finishes at 1K. The 24 external KTX2 files live once in `public/assets/curated-buildings/textures/` and are referenced by all 39 curated Yaba GLBs; never embed another copy in a building asset. The shared external-texture path has passed the Stage 08E PlayCanvas container smoke test.
4. Keep metre scale and the Stage 08E contract: neutral outer `BuildingRoot`, nested `ASSET_ORIENTATION`, `LOD0`, `LOD1`, `LOD2`, and a separate `COLLISION_PROXY`. Keep the district front axis at `-X`.
5. Keep geometry mobile-conscious: material-grouped meshes, restrained draw calls, simplified distant LODs, mipmapped KTX2 maps and a separate low-cost collision proxy.
6. Preserve texture provenance. Use the recorded ambientCG CC0 sources or other clearly licensed maps; colour is sRGB, normal and roughness data are non-colour. Do not claim AO where no AO map exists.
7. Review the full street-facing, side and rooftop silhouettes before promoting an asset. A successful GLB export is not a substitute for visual review or physical-device profiling.

## Remaining quality gates

This is the completed first dedicated texture-map pass, not a final photogrammetric or physically scanned environment asset. Physical Android load time, GPU texture memory, thermal behaviour, and sustained FPS have not yet been tested. Do not promote a mobile-performance claim until the asset is installed in a device test build and measured.

## Change control

The authored override is maintained in `scripts/generate-stage-08e-assets.mjs`, so the normal Stage 08E asset-generation step does not replace it with the procedural blockout. The upgrade is isolated on `feature/gidi-yaba-architecture-01`; it has not been deployed to the public game.
