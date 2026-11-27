# Stage 08K — Yaba Heritage Slice Delivery Report

**Date:** 27 November 2026
**Branch:** `feature/fictional-lagos-district-asset-pipeline`
**Status:** Implemented and automated verification passed; physical Android validation remains open.

## Delivered

Stage 08K is integrated into the PlayCanvas game startup and runtime diagnostics. It adds a first locally grounded Yaba frontage/streetscape layer over the existing Yaba–Ikeja playable map.

| Component | Runtime count |
|---|---:|
| Afro-Brazilian-inspired veranda bungalow frontage modules | 10 |
| Low-rise Lagos tenement frontage modules | 8 |
| Yoruba courtyard family-compound modules | 18 |
| Roadside produce/food stalls | 3 |
| Fictional Nigerian shop signs | 5 |
| Roadside drain grates | 84 |
| Collision proxies connected to actor/player physics | 53 |
| Shared procedural surface maps | 5 × 128 × 128 |

The compound frontage replaces one residential blockout shell with a three-sided room arrangement around an open courtyard and a gated entry. The bungalow language includes veranda beams/columns, stepped arch details, shutters, sills, plinth and a metal canopy. The tenement language includes repeated shop-level shutters, window bays, shallow balconies, service/rain pipes and rooftop water tanks. Market stalls use simple counters, shade canopies, legs and produce crates. Sign text is fictional; no third-party brand logos are copied.

The five small shared procedural maps provide painted plaster, aged plaster, timber grain, metal and concrete variation. Their raw texel payload is approximately 320 KiB before mipmaps/runtime overhead. Repeated scene geometry uses a static batch group. The optional CC0 road-light GLB is deliberately skipped when the runtime identifies a low-memory device.

## Asset library

The district catalog contains 258 GLB models across commercial, suburban, industrial, roads and nature packs, plus four shared colour atlases. Combined model/atlas size is about 11.01 MiB and the catalog totals 131,930 triangles. Source archives and license records are retained separately; the catalog is not bulk-loaded at startup. Six district manifests exist for Yaba, Lekki, Ekiti, Eko Atlantic, Victoria Island and Alimosho.

These generic kits remain the low-poly foundation, not ready-made Nigerian architecture. The Yaba-specific pieces above are procedural game geometry, not measured reproductions of specific listed heritage buildings.

## Verification results

- `npm run verify` — passed, including the new Stage 08K source test and the existing project, character, building, economy, traffic and field-equipment checks.
- `npm run build` — passed with Vite; 1,437 modules transformed. Game bundle: about 1.61 MB uncompressed / 438 KB gzip.
- `npm run test:browser` — passed. The suite included locomotion, IK/ragdoll, player rig, vehicle/parkour, character simulation, browser smoke and mobile-soak checks.
- Stage 08K browser audit at 844×390 — 10 bungalow fronts, 8 tenement fronts, 18 compound pieces, 3 stalls, 5 signs, 84 grates and 53 collision proxies. Static batching was enabled; no page or console errors were reported.
- Yaba scene sample diagnostics — 205 draw calls, 70,880 primitives, 4,311 mesh instances and approximately 86.8 MB reported graphics memory in the captured browser frame. A single frame/sample is not a performance guarantee.
- Software-rendered mobile soak — 3 GiB / 4-core / touch Chromium profile, approximately 20.3 seconds and 78 sampled frames; p50 233 ms, p95 550 ms and max 1,233 ms. Heap growth was approximately -3.0 MB. This profile uses software WebGL/SwiftShader, so the slow frame timings primarily indicate the emulation environment and must not be presented as measured Android performance. It is not a substitute for a physical-device test.

## Not claimed as finished

- No physical Itel A90 / Android device playtest has been run.
- This is a Yaba slice in the existing compact map, not a complete standalone city district rebuild.
- Full compound interiors, more differentiated roof silhouettes, richer market inventory, a dedicated asphalt/paving material pass and additional Nigerian signage/road markings remain art-depth tasks.
- Lekki, Victoria Island, Eko Atlantic, Alimosho and Ekiti are researched and have district asset manifests, but are not yet playable rebuilt districts.
- Eko Atlantic seawall/revetment, canal quay walls, bridges and marina are research-backed next custom asset tasks, not part of Stage 08K.

## Next rollout order

1. Validate the Yaba slice on real Android hardware and tune its asset/LOD budgets against measured frame-time and memory.
2. Finish the Yaba material family (asphalt, worn paving, wall/roof variants), signage kit and interior courtyard props.
3. Reuse the validated module/batching/collision pattern for Lekki and Alimosho street/estate/market fabric.
4. Build Ekiti around local compound layouts, sloped streets, laterite/stone materials and ridgeline terrain.
5. Build Victoria Island and Eko Atlantic as separate visual grammars; Eko Atlantic needs a dedicated rock-armoured sea defence, sheet-pile canal walls, bridges, promenade and marina modules.

## Research anchors

- [ICWA — How Long is Now? Lagos' fast-evolving architectural landscape](https://www.icwa.org/how-long-is-now-lagos-fast-evolving-architectural-landscape/)
- [Duerksen — Waterhouses](https://ohioopen.library.ohio.edu/cgi/viewcontent.cgi?article=1109&context=oupress)
- [Bloomberg — How Face-Me-I-Face-You Homes Became a Way of Life in Lagos](https://www.bloomberg.com/news/features/2022-05-05/the-history-and-design-of-lagos-face-me-i-face-you-homes)
- [Ibitoye et al. — Yoruba residential building vocabularies](https://doi.org/10.33003/fjs-2021-0601-2037)
- [Jolaoso & Onolaja — Informal trading and urban spatial vernacular in Lagos](https://doi.org/10.26905/lw.v13i1.5177)
- [African Development Bank — Eko Atlantic ESIA Summary](https://www.afdb.org/fileadmin/uploads/afdb/Documents/Environmental-and-Social-Assessments/Nigeria_Eko_Atlantic_ESIA_ESMP_Summary.pdf)
