# Stage 08L — Road audit, street clearance and low-memory profile

> Stage 08M supersedes the lighting values, Ikeja local-road widths and first-spawn placement described here. See `STAGE-08M-LIGHTING-ROAD-WIDENING-AND-VISUAL-AUDIT.md` for the latest audited state. The draw-call and real-Android limitations below remain relevant.

## Scope

This pass improves the connected Yaba–Ikeja route and audits representative GIDI district roads, bridge approaches and junctions. It does not claim the remaining city districts are fully built. Residential/commercial building completion, interiors, interactive local activities, and a complete signal-aware traffic system remain separate content phases.

## Road and obstruction changes

| Road section | Previous width | Current width |
|---|---:|---:|
| Yaba–Ikeja connector | 11 m | 14 m |
| Ikeja commercial avenue | 14 m | 18 m |
| Ikeja connector approach | 11 m | 14 m |
| Ikeja collectors | 7.5 m | 9.5 m |
| Ikeja outer residential roads | 7.2 m | 9 m |
| Ikeja cross streets | 7.5 m | 9.5 m |

Widths are authored carriageway dimensions, not total road reserve widths. Footpaths, kerbs, drains, utility furniture, market stalls and pedestrian silhouettes were moved outwards to follow the widened carriageways.

Removed or relocated obstructions:

- Removed the two blocky trees from the Ikeja pocket-park edge.
- Removed the old wide overhead market gate frame and its spanning signboard; the compact direction marker remains.
- Moved the district wayfinding marker off the centre of the Ikeja avenue.
- Moved the nearby house/shop shells away from the cross-street approaches.
- Removed the parked danfo, keke and sedan that were occupying the Ikeja carriageway. Two kinematic traffic vehicles now move along the Ikeja avenue; this is not full collision-aware traffic AI.

The eight new Stage 08I road slabs now each have a matching asphalt Bullet support collider. This fixes the outer residential and cross-street areas that previously looked paved but returned grass from the ground query.

## Spawn

Ara now begins at the Yaba road's marked centre line at `[0, 0, -40]`, between the two moving traffic lanes. The first-spawn test checks the exact player position, grounded state, asphalt support and a finite camera transform. This is a road-side start marker, not a protected physical island.

## Rendering and GIDI visual treatment

- Lowered neutral ambient illumination from 0.42/0.43/0.45 to 0.29/0.30/0.31 and directional intensity from 1.05 to 0.84, retaining the warm daylight key. This reduces the white wash on the imported GIDI surfaces without changing their source textures.
- Capped the device pixel ratio at 1 on browsers reporting low memory or four-or-fewer logical CPU cores.
- Added a lower-memory GIDI streamer profile: 130 m full-detail radius, 280 m medium-detail radius, 720 m visual unload radius, 200/360 m collision load/unload radii, one new cell load per update.
- Processed all 85 GIDI infrastructure/full/LOD GLTF assets with glTF-Transform 4.5.1 `join` + `meshopt`. The originals remain under `assets/gidi/cells`; the manifest points at the new offline-merged assets under `assets/gidi/optimized`. Compatible static geometry is joined by material, then meshopt-quantized/compressed. Total primitive count fell from 5,432 to 1,144 (78.9% fewer draw items across those assets). Optimized assets occupy about 15.9 MB before delivery compression.
- Runtime BatchManager groups were explicitly disabled for streamed GIDI cell/infrastructure imports after a visual regression was caught: assigning late-streamed render components to groups hid them. The imported GIDI meshes now remain visible in the normal render path; Stage 08J and 08K procedural street details continue to use their working static batch groups.
- Disabled dynamic scene-colour refraction for imported GIDI glass materials while retaining their tinted base colour, avoiding an expensive scene-colour grab pass on this mobile path.
- Shared duplicate Ikeja wear-state material variants and increased bounded static batch groups to reduce batch fragmentation.

The optimized GIDI GLTF paths are recorded in `public/assets/gidi/manifest.json`; the reproducible offline processor is `npm run assets:gidi:optimize`, and its per-asset report is `public/assets/gidi/optimized/optimization-report.json`. The originals remain untouched for rollback. The profile is not yet a visual sign-off for every district; individual camera-by-camera artistic review on a phone is still required.

## Automated road and driving results

`npm run test:audit:gidi` first validates every road collision tile across all 42 manifest cells, then drives 14 named points spanning Yaba, Eko CBD, Victoria Island, Ikoyi, Lekki and Ekiti Highlands, including the four bridges' approaches and principal junctions. The network pass checks all 3,049 road rectangles for finite geometry and asphalt surface, then verifies one connected graph (5,483 touching/near-touching tile pairs at a 0.75 m tolerance, no isolated tiles). Each physical drive point is checked for asphalt ground contact, vehicle placement, four-wheel contact and movement under throttle.

`npm run test:audit:yaba-ikeja` tests 10 points covering the initial Yaba spawn, Yaba–Ikeja connector, Ikeja approach, main avenue, both collectors, both outer residential roads and two extended cross streets. It also verifies that the two Ikeja traffic vehicles advance.

Latest audit result: 3,049/3,049 GIDI road tiles passed structural/surface checks and form one connected component; 14/14 GIDI and 10/10 Yaba/Ikeja physical drive points passed. Every tested vehicle retained four wheel contacts, and neither driving audit recorded browser errors. A separate Ikeja lane-clearance unit audit found no collision-proxy overlap with the authored road corridors.

These are automated cloud-browser driving checks. They are not a human visual drive-through of every metre of every road.

## Cloud-browser performance profile

Profiled with Chromium + ANGLE/SwiftShader at a 480×270 viewport and DPR 1, with the low-memory GIDI profile active around Yaba. GIDI infrastructure and the nearby full/medium cells were visibly loaded, and the browser recorded no JS errors or vertex-alignment warnings.

| Metric | Latest recorded value |
|---|---:|
| Draw calls | 166 |
| Tracked GPU resource estimate | 275.2 MiB |
| Scene mesh instances | 4,202 |
| Visible GIDI streamed mesh instances | 103 |
| Loaded GIDI cells | 10 |
| Full / medium cells | 1 / 2 |
| SwiftShader estimated frame rate | 3.18 FPS |
| SwiftShader P95 frame time | 733.3 ms |

The draw-call count is within the broad 100–200 draw-call starting range often used in PlayCanvas guidance for lower-end mobile, but tracked GPU resources and total scene geometry are still heavy. SwiftShader timing is dominated by the cloud software renderer and is **not** an estimate of Itel A90 performance. Treat the cloud profile as a repeatable build-to-build diagnostic, not device acceptance. The offline geometry reduction is a structural reduction in GIDI draw items; it does not by itself prove a smooth frame rate.

PlayCanvas references:

- https://developer.playcanvas.com/user-manual/optimization/guidelines/
- https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/batching/
- https://developer.playcanvas.com/user-manual/optimization/runtime-devicepixelratio/
- https://developer.playcanvas.com/user-manual/optimization/texture-compression/

## Physical Android profiling — still required

No Android device or ADB connection was available to the cloud sandbox during this pass. Real Itel A90 profiling has therefore **not** been performed. The project already includes the Stage 08F in-game profiler and JSON export. On the phone, open the game build, open **PERF**, then export the device profile and compare:

- sustained frame time and p95 frame time after a 3–5 minute drive;
- draw calls and tracked GPU resources at Yaba and each high-density district;
- memory growth while streaming between cells;
- temperature, throttling, loading hitches and touch input latency.

Do not treat the virtual/expandable RAM reported by Android as equivalent to physical RAM or GPU memory.

## Remaining content work

The current pass does not finish every remaining district's building set or interiors. Full traffic routing with junction signals, collision-aware turning, more pedestrians/vendors, interactive shops and local activities, and additional district-specific building/roof/interior passes are still outstanding. No new 3D downloads were needed for this road/profile pass; the existing licensed city props and PBR sets remain registered in `docs/CITY-ASSET-REGISTER.md`.
