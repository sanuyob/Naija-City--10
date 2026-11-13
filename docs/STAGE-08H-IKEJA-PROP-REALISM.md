# Stage 08H — Ikeja Prop Materials & Surface Realism

## Scope

Stage 08H is a street-prop material and shape-art pass over the Stage 08G Ikeja corridor. It preserves the 08G street layout and its static/deterministic nature. It does not claim a fully surveyed Ikeja district, animated pedestrians, live vehicle traffic, vendor interaction, or physical-device acceptance.

## Audit: state before 08H

| Area | Stage 08G baseline | Required treatment |
|---|---|---|
| Road and repairs | Flat-colour asphalt slabs and patches | Asphalt aggregate, bitumen variation, roughness and low-strength normal detail |
| Sidewalks, gutters, kerbs | Single flat concrete colours | Concrete grain, dust, drain-edge deposits and varied cleanliness |
| Shop shells | Flat painted boxes | Faded plaster, rain streaking, dirt accumulation near ground contact |
| Grilles, poles, drains, streetlights | Flat metal colour | Distinguish painted steel from galvanized metal; add scuffing and oxidation selectively |
| Vendor equipment | Box-like tables, chair, jerrycan and crates | Wood grain, moulded plastic finish, more legible silhouettes and detail |
| Umbrellas and awnings | Flat slabs | Fabric surface, canopy volume, ribs and round support mast |
| Cartons and litter | Solid-colour cuboids | Kraft-paper/cardboard appearance, folds/tape and worn ground-contact variation |
| Bottles | Cuboid stand-ins | Cylindrical bottle, neck and cap |
| Vehicles | Low-detail body boxes | Keep original vehicle types/colours, add bumpers, headlamps and wheel hubs |
| Glass | Flat tinted colour | Semi-transparent smoked-glass finish with alpha blending and depth writes disabled; avoid mirror-like fake reflections |
| Mobile delivery | Existing static batching | Shared maps, controlled texture sizes, no extra dynamic lights or external runtime downloads |

## Implemented material system

The 08H runtime creates original deterministic procedural surface maps in the browser. Ten textured surface families use three maps each: base colour/albedo, tangent-space normal, and gloss/smoothness. A separate tuned glass material does not use image maps.

| Material family | Typical assignments | Base wear |
|---|---|---|
| Asphalt | Main road, approach road, repair patches | Rough and aggregate-rich; patches are darker |
| Cast concrete | Sidewalks, kerbs, gutter edges | Dust, aggregate and local darkening |
| Painted plaster | Mixed-use shop shells | Fading, rain streaks and low-wall grime |
| Painted steel | Grilles, poles, streetlights, generator frames, vehicle paint | Mostly matte paint, with selective edge wear |
| Galvanized metal | Drain covers, exposed fittings, small hardware | Higher metallic response, dulling |
| Wood | Vendor tables and handcart platform | Grain and rubbed edges |
| Moulded plastic | Chairs, crates, jerrycans, kiosk and selected waste | Clean, used and ground-contact variants |
| Rubber | Vehicle wheels | Dark, very low gloss |
| Fabric | Umbrella canopies and awnings | Woven-like variation and sun fading |
| Cardboard | Shipping cartons and discarded packaging | Kraft colour, scuffs and damp-stain tint |
| Smoked glass | Shop windows and vehicle glazing | Restrained tint and gloss; no fake mirror reflection |

Textures are generated at 512×512 for asphalt and 256×256 for the other nine textured families, with mipmaps and anisotropy capped at 2. The ten texture-map sets generate 30 GPU texture objects (three maps per set); the silt set is a separate concrete-derived variant. The glass material is constant-parameter only. Materials share maps to reduce repeated texture allocations. All procedural surface maps are generated from project code; no third-party image maps are downloaded at runtime.

## Wear distribution

The pass explicitly separates clean, used and weathered items. Used and weathered material variants also become progressively less glossy, so grime is not represented by colour darkening alone. Clean shop glass and some signs remain maintained. Vendor chairs, awnings, crates and market equipment vary by position/index. Stronger grime is concentrated around open gutters, drain covers, generator equipment, utility metalwork, road repairs and litter hotspots. The entire district is not covered in uniform dirt.

## Shape upgrades

- Umbrella slabs become shallow cone canopies with fabric ribs, finials and cylindrical metal masts.
- Plastic chair blocks become seat/back pieces with narrow moulded-plastic supports.
- Bottle litter becomes cylindrical bottles with necks and caps.
- Generator gets vent slots, a control panel and exhaust detail.
- Beverage crates get a top rim and visible side rails.
- Cartons get tape seams.
- Parked vehicles receive bumpers, headlamps and wheel hubs while preserving danfo, keke and sedan paint colours; body and roof paint use the same clean/used state.

New details use a dedicated bounded static batch group. No dynamic lights are added.

## Verification gates

The source check verifies the Stage 08H module, ten textured map sets, 30 generated maps, prop assignment counts and material/geometry contract. The automated Chromium smoke test verifies that the game mounts Stage 08H, reports a non-zero textured-prop count and all three wear categories, creates prop details, and retains static batching. Production build and bundle-budget checks remain required.

Automated Chromium success does not equal an Itel A90 physical test. A real-device review is still needed for material readability, loading, frame time, memory pressure, thermal behaviour and texture shimmer.

## Known limitations

- Procedural maps are authored approximations, not photogrammetry or scans of actual Ikeja surfaces.
- Some props remain simple low-poly meshes even after material improvement.
- Four pedestrians and three parked vehicles remain static environment props; no crowd AI or live traffic is added.
- Glass is a restrained translucent material approximation; there is no ray-traced reflection.
- Stage 08F Computer Village hero placement remains a separate outstanding geography correction and is not fixed by 08H.
- Do not merge the stacked PR or claim phone-tested until the user reviews the preview on the physical device.
