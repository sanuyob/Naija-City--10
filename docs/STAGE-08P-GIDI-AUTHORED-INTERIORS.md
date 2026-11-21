# Stage 08P — GIDI authored interiors (source Revision 106)

## Source-of-truth audit

- Source project: **GIDI 02 REBUILD**
- Project ID: `5d0b57d1-197f-4532-bb0f-4ca703c3224a`
- Source revision: **106**, scene sequence **2**
- Source GLB SHA-256: `29092937dd6a03b834b43fdec558f598dde587a0e183d91c2724a4df49c7e0c2`
- The four existing streamed GIDI cells were compared against the Revision 106 source GLB: all 1,186 target-cell mesh nodes have matching names, transforms, primitive counts and vertex arrays. The original textured runtime cells were retained, preserving their 42 shared PBR textures. No duplicate building GLBs or second copy of the world were added.

## Authored spaces now enterable

| Space | GIDI cell | Source geometry / access |
|---|---|---|
| Fresh Cut | `0,-4` | Three barber stations, waiting area, floor slab, side/rear wall openings and already-open entry leaf |
| Mide Tech Hub | `1,-4` | Main office floor, glazing, open front entrance, collaboration furniture and meeting-room partition/door opening |
| Grand Hotel Lobby | `1,-5` | Lobby floor, reception, stairs, open glass entry and hotel core partitions |
| Grand Hotel Guest Room 01 | `1,-5` | Guest-room walls, open door leaf, bed, TV panel and shared hotel floor |
| Player Home | `0,-5` | Existing living/kitchen/bedroom/bathroom layout, front entry gap, tiled floor and roof |

The hotel guest room is accessed from the hotel lobby; it is not a separate street entrance. The Mide Tech Hub meeting room is a room inside the main hub and has its own open internal doorway. The source project contains already-open door leaves/openings for the spaces that have doors. Stage 08P does not invent new door panels or hinge animations.

## Collision correction

The existing generated building-bin collision boxes covered the Fresh Cut, Mide Tech Hub and hotel entry areas. They were replaced **for the player only** with 70 simple axis-aligned box proxies derived from Revision 106 wall/floor bounds:

- Fresh Cut: 8 boxes
- Mide Tech Hub: 18 boxes
- Grand Hotel Lobby: 13 boxes
- Grand Hotel Guest Room 01: 6 boxes
- Player Home: 25 boxes

The hotel guest room shares the lobby floor collider. Vehicle collision keeps the original solid building blockers, so cars cannot drive through the interiors. Open doorway centerlines are left free; the player can walk through the source openings. Floor collision is extended a short distance under the existing entry apron/threshold so the player capsule does not catch on the vertical edge of the floor slab. The meeting-room doorway and player-home bathroom doorway are also kept open.

The roof/ceiling nodes are hidden while the player is inside the corresponding space and restored when leaving. The hotel lobby and guest room share the same exported hotel blockout roof node; the source's separate guest-room ceiling is not present in the optimized runtime cell, so no phantom ceiling is referenced.

## Mobile/runtime approach

- Reuse the existing streamed 500 m GIDI cells; do not load the 48 MB source GLB as one world asset.
- Use primitive box collision rather than triangle-mesh collision for these static room boundaries. PlayCanvas documentation explains that simple primitive shapes are cheaper and more stable than polygon-matching collision for many repeated physics tests.
- Keep collision activation near the player and release it outside the streaming radius.
- Preserve the existing per-cell full/LOD1 visibility and meshopt-compressed asset pipeline.

## Validation

- Source GLB and generated cell node checks pass for all five spaces.
- All 70 replacement boxes have finite positions and valid extents.
- Automated doorway line tests confirm that each entrance remains clear.
- Browser runtime smoke loads the correct cell, activates room collision, raycasts the floor, confirms the actual streamed roof node is hidden inside and visible outside, and confirms the doorway ray is unobstructed.
- The player controller physically walked through all five exterior entrances; the Mide meeting-room, hotel guest-room and player-home bathroom doorways were also walked through.
- The runtime smoke passed all five spaces with zero browser errors.

## Professional references used

- The Build 3D Game Rooms workflow was used as the asset-audit gate: inspect the existing source, preserve approved room geometry, add only the missing gameplay collision/visibility layer, then validate each entry in the running game.
- Exa and Firecrawl were used to locate and cross-check current official PlayCanvas documentation.
- PlayCanvas, [Collision Shapes](https://developer.playcanvas.com/user-manual/physics/collision-shapes/): prefer simple primitives for common static shapes; triangle meshes are for static/kinematic bodies and large mesh collision costs time and memory.
- PlayCanvas, [Trigger Volumes](https://developer.playcanvas.com/user-manual/physics/trigger-volumes/): reference for trigger-only collision use where room entry/exit state is needed. The implementation uses the existing player-position update rather than adding separate physics trigger entities.
- SciSpace literature review: Silva & Rodrigues (2011), [*Interactive Rendering of Indoor and Urban Environments on Handheld Devices by Combining Visibility Algorithms with Spatial Data Structures*](https://scispace.com/papers/interactive-rendering-of-indoor-and-urban-environments-on-5dvsjepj4j), DOI `10.4018/JHCR.2011010104`; Mulloni, Nadalutti & Chittaro (2007), [*Interactive walkthrough of large 3D models of buildings on mobile devices*](https://scispace.com/papers/interactive-walkthrough-of-large-3d-models-of-buildings-on-2w0afo60yu), DOI `10.1145/1229390.1229393`; Marek & Krejcar (2015), [*Optimization of 3D Rendering by Simplification of Complicated Scene for Mobile Clients of Web Systems*](https://scispace.com/papers/optimization-of-3d-rendering-by-simplification-of-4o1xc4lkiw), DOI `10.1007/978-3-319-24306-1_1`.
- Scite literature search was attempted but the connected Scite service reports that this account needs a paid plan or active free trial. No Scite findings are claimed.

## Scope limits

This makes the five source-authored spaces physically accessible and camera-clear. It does not add new door-hinge animation, elevator/stair traversal to hotel upper floors, new dialogue, or new shop/economy interactions inside these five spaces. Physical acceptance on the user's Itel A90 remains untested; headless browser success is not a real-device performance certification.
