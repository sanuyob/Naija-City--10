# Stage 08M — Lighting balance, wider local roads and visual route audit

## Changes

- Switched the world camera from linear tonemapping to PlayCanvas ACES2 and set scene exposure to 0.88.
- Reduced neutral ambient illumination to RGB 0.24/0.26/0.28, lowered the warm daylight directional key to 0.76, and shifted the clear colour to a deeper blue. The intent is to retain readable daylight while preventing concrete, terrain and imported PBR surfaces from clipping toward white.
- Widened Ikeja neighbourhood collectors from 9.5 m to 11 m, cross streets from 9.5 m to 11 m, and outer residential access roads from 9 m to 10 m. Sidewalks, kerbs, drains and covers were moved outward to match.
- Moved the two market stalls nearest the z=310 cross street, streetlights beside the collectors/residential roads, and the residential wayfinding post off the widened carriageway envelopes.
- Retained the earlier removal of the two blocky Ikeja pocket-park trees, the overhead market gate frame/signboard and parked vehicles that had occupied the main road. The park now uses benches and bins rather than the removed trees.
- Added automated clearance coverage for all 84 Stage 08I solid proxies and all 37 Stage 08G commercial-corridor proxies against the widened road envelopes. No solid proxy overlaps the audited carriageways.
- Moved first spawn from the moving carriageway centreline to the west Yaba pedestrian footpath at `[-6.1, 0.12, -40]`. The sidewalk's Bullet support patch now matches its visible 12cm top and reports a concrete ground hit.
- Added a visual-settings snapshot and screenshot capture to the repeatable route audits. Each of the 10 Yaba/Ikeja points and 14 GIDI district/bridge/junction points gets a camera screenshot after the vehicle is moved out of frame; the simulation is paused only for each capture so the inspection camera stays put, then resumed for the next drive test.

## Widths after this pass

| Section | Carriageway width |
|---|---:|
| Yaba–Ikeja connector | 14 m |
| Ikeja commercial avenue | 18 m |
| Ikeja approach | 14 m |
| Ikeja collectors | 11 m |
| Ikeja cross streets | 11 m |
| Ikeja outer residential access | 10 m |

These are carriageway widths, not the full road reserve including footpaths, kerbs and drainage.

## Audit results

- Yaba/Ikeja: 10/10 physical drive points passed; first spawn is grounded on the west pedestrian sidewalk at `[-6.1, 0.12, -40]`, and the first ground probe reports the concrete sidewalk surface. The moving traffic actors advanced during the test.
- Ikeja clearance: 84 Stage 08I collision proxies and 37 Stage 08G commercial proxies passed the widened-road overlap checks. No solid building, vendor or street-furniture proxy intrudes into the tested carriageways.
- GIDI: 3,049/3,049 road collider tiles passed the surface/geometry checks and form one connected component. 14/14 drive points passed across Yaba, Eko CBD, Victoria Island, Ikoyi, Lekki and Ekiti Highlands, including the four bridge approaches and named junctions. Each vehicle retained four wheel contacts and moved under throttle. No browser errors or vertex-alignment warnings were recorded.
- Visual capture: the audits saved 24 route screenshots (10 Yaba/Ikeja and 14 GIDI) under `/tmp/naija-city-visual-audit/` in the cloud sandbox. These are repeatable camera captures at representative audited points, not a claim that every metre of every road was manually inspected.
- Rendering settings verified at runtime: ACES2 tone mapping, scene exposure 0.88, ambient RGB 0.24/0.26/0.28, warm directional key intensity 0.76. The runtime smoke test also confirms these values through the game diagnostics API.

## Performance and Android limitation

The 960×540 DPR-1 cloud-browser diagnostic around the GIDI cells recorded 129 draw calls, 316,022 primitives, and about 305.6 MiB of engine-tracked GPU resources. A separate early runtime smoke snapshot at 844×390, while 10 cells were loaded, recorded 363 draw calls, 4,953 scene mesh instances and about 308.6 MiB tracked GPU resources; it was captured during the startup/streaming window and is not directly comparable with the warmed diagnostic. Both are Chromium/ANGLE/SwiftShader on a Linux cloud host; the roughly 2.2 FPS result from the former is not a phone performance estimate. Treat these as build diagnostics, not Android acceptance. The GIDI offline join/meshopt pass reduced total imported GIDI primitives from 5,432 to 1,144 (78.9%), but the total city scene still has a high geometry/resource footprint.

No physical Android device was connected to the sandbox, and ADB is not installed in this environment. Therefore, real Itel A90 profiling has not been performed. The Stage 08F profiler was upgraded to retain up to 18,000 frame samples (five minutes at 60 Hz) and export average/p50/p95/worst frame time, average/peak draw calls, average/peak tracked GPU resources, CPU update/render times, JS heap where available, GIDI cell/streaming counters, static batch state, vehicle state and traffic count. Open the PERF panel on the actual phone, start a 3–5 minute drive from Yaba through Ikeja and into GIDI, then export the profile JSON. Device acceptance still requires checking sustained frame time, p95, draw calls, memory growth, thermal throttling, touch latency and streaming hitches on the real Itel A90; the cloud sandbox cannot perform that physical-device step.

## Remaining content

This pass improves roads, clearance and lighting; it does not complete every district's remaining building set, enterable interiors, full signal-aware traffic AI, pedestrian/vendor simulation or local activities. Those require separate district content passes and should not be represented as complete yet.

No additional external models were required for this lighting/road-clearance pass. Existing registered CC0 Poly Haven and ambientCG assets remain in use; no unlicensed assets were introduced.
