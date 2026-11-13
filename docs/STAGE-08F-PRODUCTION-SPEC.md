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
