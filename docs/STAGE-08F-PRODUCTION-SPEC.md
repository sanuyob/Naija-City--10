# Naija City — Stage 08F Production Specification

## Objective
Move Stage 08E's generated building placeholders toward final architectural art and a mobile-safe production asset pipeline. Stage 08F is deliberately split into verifiable gates; no stage is called complete merely because source files compile.

## 1. Architectural art direction
Create a curated set of authored Nigerian building archetypes before scaling to all 48 placements:
- Yaba / Computer Village commercial: narrow shopfronts, repair/service signage zones, security shutters and grilles, upper-floor offices, external AC units, rooftop tanks, parapets, service conduits and rainwater staining.
- Lagos mixed-use: active commercial ground floor, residential or office upper floors, balconies, deep window reveals, sunshades and practical rooftop service areas.
- Ekiti/Oyo residential: compound-facing entrances, verandas/balconies, security gates, shaded openings, weathered plaster and locally plausible roof forms.

Each hero archetype needs a front/side/rear/roof review, measured dimensions in metres, correct origin and front axis, believable facade proportions, and a separate low-cost collision representation. Reuse modules only where repetition is architecturally plausible; avoid making every building a recoloured clone.

## 2. PBR authoring contract
Target 2K (2048px) maps for hero materials, with 1K fallback variants where profiling proves necessary. Keep color maps in sRGB; keep normal, roughness, metallic and occlusion data linear. Pack AO/Roughness/Metallic into the glTF metallic-roughness workflow where appropriate. Use calibrated roughness variation and restrained normal intensity; avoid noisy bump detail that reads poorly at phone resolution.

Required material families: weathered painted plaster, cast concrete, tinted/clear glass, painted steel, galvanized roofing, timber, ceramic/terrazzo floor surfaces, asphalt and paving. Every externally sourced texture must record its source URL, license, author and modification notes. Prefer CC0 sources or user-authored work; do not silently bundle assets with unclear licenses.

- The Computer Village hero pilot adds a photogrammetry-based painted-plaster facade (ambientCG Painted Plaster 017, CC0) as a separate surface family. It supplies colour, normal and roughness maps; neutral AO/metalness channels are packed deliberately because that source does not provide those maps.

## 3. KTX2 / Basis delivery
Use glTF's KHR_texture_basisu extension with a complete mip pyramid. Initial quality policy:
- Base color / emissive: ETC1S at high quality where visual review accepts the result.
- Normal and packed ORM: UASTC to preserve channel fidelity and avoid block artifacts.
- Validate color-space metadata, alpha handling, dimensions, mip levels and extension declarations.
- Keep a PNG/JPEG development source or reproducible source-art manifest; compare decoded output visually before promoting compressed files.

The project must not advertise KTX2 support until the runtime Basis transcoder is initialized and a real GLB containing KTX2 textures has been loaded successfully on WebGL2 Android.

## 4. Collision and physics
Use low-cost collision shapes, not render geometry:
- Static building boxes or simplified static compound/triangle proxies.
- Static road, kerb and major obstacle collision.
- Player capsule with a foot-level offset.
- Keep collision meshes separate from visible LODs and verify world-space dimensions/orientation.
- Ammo must be initialized before AppBase; register CollisionComponentSystem and RigidBodyComponentSystem when using AppBase/AppOptions.
- Test walking against walls, doorways, kerbs, slopes and building corners. Check that no collider moves when a streamed render asset unloads.

### Current collision implementation status

The runtime now resolves the player's horizontal movement against persistent circle-versus-AABB building bounds derived from all 48 manifest placements. These bounds remain active even when a building's visual GLB is streamed out, so unloading render geometry does not make the building walk-through. The player footprint radius and body height are explicit constants in the Stage 08E building manager.

This is a lightweight static world-collision layer, not a full Ammo/Bullet rigid-body simulation. The GLB `COLLISION_PROXY` meshes remain separate authoring references and are not yet instantiated as physics bodies. Dynamic rigid bodies, capsule contacts, vertical obstacle interaction, slopes and physical doorway tests remain a separate physics gate; do not describe this implementation as Ammo physics.

## 5. Mobile performance acceptance
Automated Chromium smoke tests are regression checks only. Physical Android acceptance must record:
- cold and warm first-load time;
- 30-second and 5-minute average / p50 / p95 frame times;
- draw calls, mesh instances, texture/GPU resource estimate and JS heap where exposed;
- memory growth during district travel and after unload/revisit;
- thermal throttling / frame-time drift;
- WebGL context loss, failed requests and recovery behaviour.

Initial target is a stable 30 FPS on the Itel A90 at a controlled DPR and low/medium settings, with p95 frame time and memory trend reported. This is a target, not a claim or a guaranteed result. Profile the physical phone before setting final budgets.

## 6. Stage gates
A. Art direction and hero-building blockout approved.
B. Hero GLBs pass Khronos validation and visual review.
C. PBR source maps and 1K/2K variants pass color-space and texture review.
D. KTX2/Basis runtime load verified; size and quality compared against source.
E. Static colliders and player capsule pass collision test scenes.
F. Streaming and memory tests pass on desktop automation and physical Android.
G. Scale the approved pipeline across all 48 placements.

## References
- PlayCanvas optimization: https://developer.playcanvas.com/user-manual/optimization/guidelines/
- PlayCanvas texture compression: https://developer.playcanvas.com/user-manual/optimization/texture-compression/
- PlayCanvas loading/unloading: https://developer.playcanvas.com/user-manual/assets/loading-unloading/
- PlayCanvas physics basics: https://developer.playcanvas.com/user-manual/physics/physics-basics/
- PlayCanvas collision shapes: https://developer.playcanvas.com/user-manual/physics/collision-shapes/
- Khronos KTX artist guide: https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md
- glTF Transform CLI: https://gltf-transform.dev/cli
- glTF Validator: https://github.com/KhronosGroup/glTF-Validator


## 7. First hero-building pilot — Computer Village Electronics Plaza
The first Stage 08F asset replaces only the existing `yaba-core-01` placement, preserving the 48-building manifest and the Stage 08E streaming contract. It is a four-storey, meter-scaled commercial plaza with paired shopfront bays, upper-office glazing, window reveals, security grilles, balconies, sunshades, rooftop water tanks, AC condensers, service conduits and a Computer Village sign. The model is procedurally authored from distinct architectural modules; it is not represented as a hand-sculpted or photogrammetry building.

The pilot consumes 2K PNG map sets from ambientCG Concrete 034 and Corrugated Steel 009 (both CC0 1.0). Their native 2048×1024 aspect ratio is preserved; maps are not stretched to square. Color images are treated as sRGB; normal and packed ORM data are linear. The ORM channels are AO=R, roughness=G and metalness=B. glTF Transform 4.5.0 encodes normal/ORM slots to UASTC and remaining color slots to ETC1S, with mipmaps enabled. The generated GLB is embedded in the regular Stage 08E asset stream and is checked by Khronos glTF Validator plus the mobile Chromium runtime smoke test.

**Pilot boundaries:** only `yaba-core-01` has the new authored geometry and real 2K PBR maps. The other 47 GLBs remain unchanged. Its simplified `COLLISION_PROXY` is present but deliberately remains disconnected from live physics. A passing desktop Chromium load is not a physical Itel A90 test; Android visual review, load-time, memory and sustained frame-time acceptance remain open gates.


## 8. PlayCanvas Basis runtime integration
The KTX2 GLB requires the PlayCanvas Basis Universal transcoder at runtime. The build preparation script downloads the matching `v2.24.0` runtime files from the official PlayCanvas Engine repository (`basis.wasm.js`, `basis.wasm.wasm` and `basis.js`), checks their minimum lengths and WebAssembly magic header, caches them under `.cache/stage-08f/basis` and copies them into `public/assets/wasm/basis/`. The game calls `pc.basisInitialize` before graphics-device creation and before the GLB streaming system requests any KTX2 texture; it uses one worker to limit mobile startup overhead. The Chromium browser smoke test verifies the hero load and reports the current building-loader state and browser errors if transcoding fails.

The Basis runtime assets are distributed by the PlayCanvas Engine project; preserve the upstream MIT license and version pin when updating them. The hero's KTX2 pipeline is not accepted until the browser load succeeds and physical Android testing is completed.
