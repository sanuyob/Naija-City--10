# Stage 08K — GIDI district roads, bridge approaches and junctions

## Work strategy

The existing GIDI infrastructure is retained as the source of truth for primary and secondary road geometry. A topology pass over the streamed road collision tiles found one connected component across the 42-cell region (3,049 road collision rectangles in the connectivity analysis). This stage therefore does not pave over those corridors or create a second set of drivable primary roads. It finishes the local-road experience with bridge approach cues, junction markings, wayfinding, street lighting, drain details and waterfront/estate public-realm pieces.

## Four bridge approach treatments

- **B01 — Yaba Spine Bridge:** deck approximately x=686–714m, z=-1900 to -700m; approaches near z=-700 and -1900m, with intermediate ramp references at z=-1116.5 and -1569.5m.
- **B02 — Eko Canal Bridge:** deck approximately x=1159–1453m, z=-859 to -590m; the two ramp references lie near x=1246m and x=1309m at z=-900m.
- **B03 — Canal Link Bridge:** short deck approximately x=1445–1455m, z=-1028 to -982m; ramp references near z=-972m and -1038m.
- **B04 — Lekki Connector Bridge:** deck approximately x=2971–2994m, z=-1964 to -1816m; ramp references near z=-1798m and -1977m.

Approach treatments use warning boards and reflective delineators outside the deck edges. They do not modify bridge spans or represent structural engineering changes. Deck collision and bridge geometry continue to come from the existing GIDI infrastructure assets.

## Five main junction treatments

The stage marks five intersections on the existing primary corridors: the Eko/VI side, the Eko CBD grid, the Ikoyi east corridor, the Lekki corridor and the northern lagoon link. Each treatment adds zebra crossings in both directions, stop lines, tactile corner pads and kerbside grated inlets. The actual road surface, roundabout and bridge topology remain unchanged.

## District coverage and local streetscape

- Yaba: lighting and directional signs for the Spine, Market Loop, Tech Hub Link and South Connector.
- Eko CBD and Victoria Island: primary-road junction markings and district wayfinding.
- Ikoyi Waterfront: local-road lights, seating, bins, paving margin and a drainage inlet.
- Lekki: local-estate road lighting, bridge/collector reflectors and district signs.
- Ekiti Highlands: foothill approach reflectors and a trailhead marker, using the existing upland terrain and road approach.

The result is 496 small static detail meshes, 145 collision proxies, 9 district signs, 4 bridge approach sets, 5 junctions, 90 crosswalk stripe elements, 20 tactile pads and more than 50 local street lights. Geometry is put in its own static batch group, with a 96m maximum AABB for spatial culling.

## Explicit limits

This is a detailed streetscape and road-safety treatment over the existing authored network, not a full survey-grade rebuild of every district. It does not add new bridge spans, alter bridge structural dimensions, route live traffic across the whole city, create new canal or drainage hydrology, or certify bridge/road engineering. Individual internal roads, shorelines, bridges and district building placements still need a full visual route audit and physical mobile testing.
