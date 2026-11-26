# Stage 08J — Yaba–Ikeja arterial and Yaba street completion

## Scope

Join the existing Yaba starter-road network to the Stage 08I Ikeja cross-street without moving earlier buildings or replacing the original roads. The connection is a local 79m street segment, not a new long-distance route: it starts at z=168m, ends at z=247m and meets the Stage 08I east-west junction at z=246m.

## Road and street layout

- 11m asphalt carriageway, centred on x=0.
- The new slab overlaps the existing Yaba and Ikeja road slabs by 1m at each end to prevent a visual or collision seam.
- Two 1.2m pedestrian sidewalk strips, kerbs and edge lines.
- Centre-lane dashes, storm-drain channels and 12 spaced drain grates.
- A raised approach table and stop line before the Ikeja end. The zebra crossing and tactile pads are deliberately inherited from Stage 08I rather than duplicated.
- Four utility poles, street lights, two wayfinding boards and two modest roadside stalls with tarpaulin canopies, counters, produce crates, a bench and waste points.

## Imported assets and materials

The game loads two downloaded Poly Haven CC0 GLB props: `utility_box_01` and `WetFloorSign_01`. Their geometry-only GLBs are used because the external texture paths in the upstream glTF download were missing. The source glTF and binary files are retained beside the derived GLBs. Materials are assigned locally in the game.

Three ambientCG CC0 material families provide the connector finish: Road 008 B asphalt, Concrete 044 D weathered concrete and Paving Stones 152. The original 1K JPG maps are retained as source; runtime uses resized 512px colour, OpenGL normal and inverted-roughness/gloss maps. Ambient occlusion is retained in the source package but is not loaded by this stage. Anisotropy is limited to 2 and the maps repeat with material tiling, rather than using large unique textures for each road piece.

## Runtime integration

- Separate non-dynamic batch group with an 80m maximum AABB.
- 22 collision proxies, including the two imported street props.
- The connector and its props participate in player, pedestrian navigation and vehicle collision systems.
- The stage exposes connector bounds, loaded assets, material map state and collision metadata through `window.__NAIJA_GAME__.stage08J`.

## Verification

`npm run test:city:jk` checks the generated geometry and metadata with network assets intentionally disabled. `npm run test:city:jk:runtime` launches the actual PlayCanvas runtime and checks that both GLB assets load, all nine 512px PBR maps load, the connector has ground support, the utility cabinet has physical collision and the connector remains walkable without any distant-world streaming.

A physical Android drive/walk acceptance run is still required. No claim of Itel A90 performance acceptance is made by these browser checks.
