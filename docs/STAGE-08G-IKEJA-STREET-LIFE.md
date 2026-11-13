# Stage 08G — Ikeja Street Life & Environmental Authenticity

## Goal
Add a geographically distinct Ikeja commercial-street prototype before beginning Yaba street-life work. The prototype is an extension south of the existing test district, reached by a short connecting approach road. It is not presented as a complete Ikeja city replica.

## Reference-led art direction
Research reviewed:
- 2025 unfiltered photo walk from Ikeja Along through Computer Village and Obafemi Awolowo Way: https://www.nairaland.com/8462867/ikeja-along-computer-village-unfiltered
- Street photography tagged Allen Avenue, Opebi Link Road and Omofade Street: https://jujufilms.tv/tag/ikeja/
- Opebi–Allen roundabout street-life report, including food vendors and changing day/night activity: https://ynaija.com/so-you-think-you-know-lagos-ii-any-way-na-way-any-hustle-na-hustle-the-nightlife-of-opebi-allen-and-fela-shrine/
- Computer Village market footage and phone-repair frontage: https://www.gettyimages.com.au/detail/video/market-street-in-lagos-stock-footage/2166800180
- Ikeja Along / Computer Village / Obafemi Awolowo Way walk-through discussion: https://www.youtube.com/watch?v=qeTgVmCodQI

The sources support distinct Ikeja street characters rather than one uniform style:
- Computer Village / Ikeja Along: dense electronics retail, repair shopfronts, commercial minibuses and high pedestrian activity.
- Allen–Opebi: mixed business frontage, food stands, roadside seating, evening commerce and changing activity by time of day.
- Opebi and residential side streets: quieter mixed-use edges, trees and residential streets; do not dress every block as a market.
- Ikeja GRA: greener and more orderly stretches can still sit alongside local road and drainage maintenance issues.

## Implemented in this slice
- 150m Ikeja commercial corridor with a connecting approach from the existing district.
- Mixed-use shop shells, glazed shopfronts, security grilles, fascia boards and awnings.
- Four vendor setups with umbrella canopies, tables, goods display and plastic seating.
- POS kiosk, cartons, beverage crate, jerrycans, small generator, wheelbarrow and handcart.
- Selective litter hotspots using small bottle/carton/sachet props, kept near activity and drainage rather than scattered uniformly across the road.
- Open gutter runs, spaced drain covers and silt deposits.
- Local asphalt repair patches and a small number of shallow road defects.
- Utility poles, streetlights and direction signboards.
- Three parked transport/vehicle props: danfo minibus, keke and sedan.
- Four static low-poly pedestrian silhouettes for scale and scene readability.
- Dedicated PlayCanvas static batch group and runtime metadata.
- Player traversal and camera range extended to reach the Ikeja prototype.

## Explicit limitations
- This is a focused static art prototype, not a complete geographically surveyed Ikeja district.
- Vehicles are parked static props; no new live traffic AI is claimed.
- Pedestrian silhouettes are static props; no NPC navigation, animation, crowds or vendor interaction is claimed.
- No audio, weather cycle, day/night activity schedule, or dynamic waste simulation is included.
- The 48-building Stage 08E system still owns its original Yaba placements. The Computer Village hero identity in Stage 08F must be relocated/reassigned to the Ikeja zone before a final district geography pass; this Stage 08G slice does not silently claim that old placement is corrected.
- Automated Chromium smoke is not physical Itel A90 validation. Check frame time, memory and heat on the actual phone before merging.

## Mobile constraints
Props are procedural, share a small material palette and join one bounded static batch group. Avoid individual dynamic lights and runtime particle litter. Keep the prototype's detail density local to the 150m corridor so the visual payoff can be assessed before scaling it.

## Acceptance
- Project verification confirms the new Stage 08G module and feature contract.
- Mobile Chromium smoke confirms the district metadata and expanded traversal bounds.
- Real-device visual/performance review remains a required gate.
