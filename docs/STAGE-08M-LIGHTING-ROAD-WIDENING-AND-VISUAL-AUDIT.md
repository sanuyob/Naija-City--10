# Stage 08M — Lighting balance, wider local roads and visual route audit

## Changes

- Kept ACES2 tone mapping and reduced the washed-out look on imported GIDI terrain and concrete: ambient RGB is now 0.18/0.20/0.23, scene exposure 0.82, warm daylight key intensity 0.68, key colour 1.00/0.82/0.66, and the camera clear colour is a deeper blue.
- Low-memory devices now use a 650m camera far clip, 105m GIDI full-detail radius, 220m medium-detail radius, 620m visual-unload radius, and one new GIDI cell load per update. Higher-memory devices retain the larger 850m/160m/360m/900m profile.
- Widened Ikeja collectors from 11m to 12m, cross streets from 11m to 12m, and outer residential access roads from 10m to 11m. Footpaths, kerbs, gutters and drain covers were shifted out with the kerb line.
- Moved the four utility poles that intruded into the southern cross street at z=438; their line now sits farther south at z=450.
- Retained earlier removals of the two blocky Ikeja pocket-park trees, the old overhead market gate frame/signboard, and parked vehicles that occupied the carriageway. The earlier road-clearance pass also moved the main-avenue wayfinding marker and stalls away from the widened carriageway.
- First spawn remains on the west Yaba pedestrian footpath at `[-6.1, 0.12, -40]`, with a matching Bullet support patch that reports a concrete sidewalk hit.
- The HUD district and local-area labels now update from the player's world position across Yaba, Ikeja, Eko CBD, Victoria Island, Ikoyi, Lekki and Ekiti Highlands.
- The screenshot audits freeze the inspection camera, verify its intended position, and label the capture with the audited district. The driving simulation is resumed between captures.

## Carriageway widths

| Section | Width |
|---|---:|
| Yaba–Ikeja connector | 14m |
| Ikeja commercial avenue | 18m |
| Ikeja approach | 14m |
| Ikeja collectors | 12m |
| Ikeja cross streets | 12m |
| Ikeja outer residential access | 11m |

These are carriageway widths, not total road-reserve widths including footpaths, kerbs and drainage.

## Road and visual audits

- Yaba/Ikeja: 10/10 physical driving points passed, covering the first-spawn frontage, main road, connector, Ikeja approach, commercial avenue, both collectors, both outer residential accesses and two cross-street extensions. All tests found asphalt, maintained four wheel contacts and moved under throttle. The first-spawn probe confirmed Ara is grounded on the west concrete sidewalk.
- Ikeja clearance: all 84 Stage 08I solid proxies and all 37 Stage 08G commercial-corridor proxies passed the strict widened-road overlap checks. The check caught and led to relocation of the four utility poles at the z=438 approach.
- GIDI road network: 3,049/3,049 road collider tiles across 42 manifest cells passed finite-geometry/asphalt checks; they form one connected component with 5,483 adjacency pairs and no isolated tiles.
- GIDI driving: 14/14 physical driving points passed across Yaba, Eko CBD, Victoria Island, Ikoyi, Lekki and Ekiti Highlands, including the four bridge approaches and principal district junctions. Each test retained four wheel contacts and moved under throttle. No browser errors or vertex-alignment warnings were recorded.
- Visual capture: 24 screenshots were saved in the cloud sandbox under `/tmp/naija-city-visual-audit/` (10 Yaba/Ikeja and 14 GIDI). These are representative route/junction camera captures, not a manual inspection of every metre of every road.

## Draw calls and cloud-browser profile

The existing GIDI offline asset pipeline remains the main structural geometry reduction: it joins compatible static geometry by material and meshopt-compresses the resulting assets. Across the processed 85 GIDI infrastructure/full/LOD assets, the primitive count had already fallen from 5,432 to 1,144 (78.9% fewer source primitives). The project retains spatially bounded static batches for local city props and uses lower-detail/shorter-distance streaming on low-memory devices. Streamed cells are deliberately not passed through PlayCanvas runtime BatchManager because a prior experiment hid late-streamed render components.

The latest short cloud-browser smoke profile (Chromium + ANGLE/SwiftShader, 480×270, DPR 1) reported 266.3 average draw calls, 270 peak draw calls, about 317.6MiB average tracked GPU resources (318.9MiB peak), and 5,001 scene mesh instances. The sample covered only 14 frames and about 3.0 seconds; its software-renderer frame-time readings (316.7ms average, 2,016.6ms p95/worst, roughly 3.2 average FPS) are highly noisy and are not a phone-performance estimate. Peak draw calls were seven lower than the preceding comparable smoke capture, but this is a small cloud-side change, not proof of a major device speed-up.

PlayCanvas references used: [optimization guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/), [static batching](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/batching/), and [runtime device-pixel-ratio guidance](https://developer.playcanvas.com/user-manual/optimization/runtime-devicepixelratio/). Batch group bounds are kept local to avoid combining distant city geometry into unnecessarily large culling bounds.

## Physical Android profiling — not yet performed

No Android device was connected to the cloud sandbox, ADB is unavailable there, and no USB device interface is exposed. Real Itel A90 profiling has therefore **not** been performed. The in-game Stage 08F profiler and PERF panel remain available for on-device export. A device acceptance pass still needs a 3–5 minute drive across Yaba, Ikeja and the GIDI districts, then comparison of sustained/p95 frame time, draw calls, tracked GPU resources, memory growth, streaming hitches, thermal throttling and touch latency on the physical phone.

## Remaining district-content work

This pass improves lighting, road widths, clearance, first-spawn placement, district labels and representative driving/screenshot coverage. It does **not** finish all remaining district buildings, enterable interiors, complete collision-aware/signal-aware traffic AI, or the full set of local activities and pedestrian/vendor behaviours. Those are still separate district-content phases; they are not being marked complete here.

No new external model downloads were necessary for this road-and-lighting pass. The existing registered CC0 Poly Haven props and ambientCG road/concrete/paving materials remain in use, and no unlicensed assets were introduced.
