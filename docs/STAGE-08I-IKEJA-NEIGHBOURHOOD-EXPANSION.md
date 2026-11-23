# Stage 08I — Ikeja Neighbourhood Expansion

## Purpose

Extend the existing Stage 08G/08H Ikeja commercial-corridor prototype into a connected neighbourhood rather than replacing the existing road or repeating the Computer Village frontage. Stage 08G/08H remains the original central commercial street; Stage 08I adds the residential, mixed-use, market, civic and collector-road fabric around it.

## Added geography

- Two collector roads and two outer residential access roads.
- Four east-west cross streets joining the main Ikeja avenue to both collectors and the outer residential streets.
- Twenty road intersections across the four east-west streets (twelve principal junctions on the main avenue and collector roads), with raised crossing approaches, zebra markings, stop lines and tactile pads.
- Nine low-rise residential compounds with entry doors, window grilles, rooftop water tanks and AC condensers.
- Four mixed-use commercial blocks with glazed shopfronts, security grilles, fascia and awnings.
- Six open-air market stalls and a marked market entrance.
- A transport/community hall landmark and forecourt, plus a small residential pocket park.
- Local storm drains, spaced grates, kerbs, footpaths, utility poles, streetlights and restrained asphalt repairs.

## Runtime and mobile implementation

Static geometry uses a dedicated non-dynamic PlayCanvas batch group. It is split by material and bounded spatial batches, with a 96m maximum AABB to preserve useful culling. A compact collection of box collision proxies is used for houses, commercial shells, poles, lights and market fixtures; collision geometry is intentionally simpler than the render treatment. The visual district has separate ground support strips where it extends beyond the original physics floor. The same solid street proxies and ground strips are supplied to the vehicle physics scene.

## Verification contract

`window.__NAIJA_GAME__.stage08I` exposes the district bounds, road graph summary, counts and collision metadata. The browser smoke checks that the four cross streets, two collectors, two residential access roads, twelve junctions, nine houses, four commercial blocks, six stalls and collision support are present. The geometry audit verifies non-overlapping house/commercial footprints. The standalone Playwright runtime smoke confirms the outer residential road has Bullet ground support, a horizontal ray meets a house collision shell, and the expanded collider set is active. Project verification and browser automation do not replace the required physical Android test.

## Explicit limits

This stage is a connected static-world expansion, not a completed Ikeja geographical survey. It does not add live traffic routing, animated pedestrians, interactive vendor inventories, enterable house interiors or dynamic activity schedules. Road junction geometry is connected at grade; bridge/culvert engineering, utility simulation, drainage flow and measured real-world coordinates are later validation tasks. Existing city geography remains subject to visual and in-game route review.
