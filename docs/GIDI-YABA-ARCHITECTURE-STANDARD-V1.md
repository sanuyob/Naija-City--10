# GIDI Yaba Architecture Standard v1

This standard is based on the first authored Yaba mixed-use building upgrade at `expansion-shop-38`. It is a reusable quality and delivery contract for future Yaba shop, office and mixed-use assets, not a command to duplicate one building design across the district.

## Architecture and facade

- Model in metres and respect each placement's real footprint, height, and street orientation.
- Make the building's use legible from its silhouette and ground-floor composition.
- Use actual depth for window reveals, balcony slabs and rails, sunshades, parapet coping, shutters, service recesses and sign fascia.
- Add Nigerian street-use features where the building calls for them: security grilles, metal roller shutters, rooftop water tanks, external AC condensers, meter boxes, conduits, drainage and locally appropriate business signage.
- Differentiate electronics retail, repair shop, office, small mixed-use block and neighbourhood commercial building. Do not copy-paste the same balcony and sign layout onto every frontage.

## Shared PBR surface library

Use the eight current material families as the initial Yaba surface vocabulary:

1. Weathered painted plaster
2. Cast concrete
3. Painted steel
4. Roof membrane / galvanized roofing
5. Sign enamel
6. Terracotta coating
7. Tinted shop glass
8. Weathered polyethylene tank

The first library is based on ambientCG PaintedPlaster017, Concrete034 and CorrugatedSteel009, with CC0 1.0 source attribution recorded in the Stage 08E manifest. Keep hero facade maps at 2K and secondary trim maps at 1K unless measured camera distance or mobile budget justifies a change.

Base colour must be sRGB; normal and roughness data must be non-colour. Use OpenGL tangent-space normal maps and generate MikkTSpace tangents in the GLB. Keep material metalness physically plausible: painted steel and sign enamel are not bare polished metal; plaster, concrete, terracotta, glass and polyethylene should not be assigned metalness merely to make them look shiny. Do not claim baked AO when the source does not provide an AO map.

Use KTX2 Basis Universal with a full mip chain. Current Yaba delivery uses UASTC for normal and metallic-roughness maps and ETC1S for base colour. The 24 shared KTX2 files live once in `public/assets/curated-buildings/textures/`; all 39 curated Yaba commercial/mixed-use assets reference the same 24 relative URIs. Do not embed another copy of the maps in individual building GLBs. The shared external-texture path passed PlayCanvas 2.24.1 Stage 08E container loading with the game's Basis initializer.

## GLB and runtime contract

Every curated building must contain:
- `BuildingRoot` with neutral transform, so game placement rotation is not overwritten.
- Nested `ASSET_ORIENTATION` for local facing and fit.
- `LOD0`, `LOD1`, and `LOD2` nodes.
- Separate `COLLISION_PROXY`, disabled in the render hierarchy by the Stage 08E loader.
- UVs, normals and MikkTSpace tangents on normal-mapped meshes.
- Embedded or intentionally shared texture references that the actual PlayCanvas loader has been tested against.

Keep the Stage 08E manifest at 48 placements until a separate world-layout task changes it. Verify all three LODs and the actual placement transform in PlayCanvas; static geometry checks alone are not enough.

## Review gates

1. Orthographic front and side proportions pass.
2. Full 3/4 street camera shows correct silhouette, openings and contact.
3. PBR maps read at gameplay distance without excessive surface noise.
4. GLB structural checks pass, with known KTX2 validator support limitations documented rather than hidden.
5. Actual PlayCanvas Basis/KTX2 container load succeeds and texture mip chains decode.
6. Mobile test records load time, texture memory, draw calls, frame time, thermal behaviour and memory growth on the target Android device.

Batch 02 applied the standard to the 38 remaining existing Yaba commercial/mixed-use placements. Together with the first anchor, 39 placements now share the same PBR library without duplicating the KTX2 payload. This proves the shared loading path on PlayCanvas 2.24.1; it does not yet establish sustained 30 FPS or a complete mobile texture budget.
