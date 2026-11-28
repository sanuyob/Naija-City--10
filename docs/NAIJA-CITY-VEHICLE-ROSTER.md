# Naija City — District Vehicle Roster

## Implementation

The five streamed Stage 08L districts now have a local vehicle traffic fleet. The current game scene defines 50 lightweight procedural vehicle models (10 per district), across 18 types. Only the nearby or remotely selected district's ten-vehicle fleet is simulated and visible at a time; closing remote CCTV returns the fleet to the normal proximity-streaming rule.

The existing player-drivable Naija City sedan is unchanged. District traffic is autonomous scenery and does not replace the player's drivable vehicle or the original Yaba/Ikeja traffic.

The vehicle models are currently low-poly PlayCanvas geometry built from shared cached materials: this is an intentional first traffic implementation, not a claim that the entire fleet has final production vehicle art. Each model has a body and vehicle-specific silhouette/parts (wheel count, cab/glass, cargo bed, roof lights, etc.). Higher-detail, properly licensed GLB models can replace individual types later without changing the traffic roster contract.

## Current per-district roster

| District | Fleet | Representative mix |
|---|---:|---|
| Alimosho | 10 | Saloon, hatchback, SUV, taxi, pickup, Danfo, minibus, keke, motorcycle/Okada, light truck |
| Lekki | 10 | Two saloons, two SUVs, executive car, hatchback, taxi, minibus, delivery van, keke |
| Victoria Island | 10 | Two saloons, SUV, executive car, taxi, hatchback, police SUV, Coaster, delivery van, ambulance |
| Eko Atlantic | 10 | Three saloons, two SUVs, executive car, hatchback, police SUV, service van, pickup |
| Ekiti Uplands | 10 | Saloon, station wagon, taxi, pickup, SUV, minibus, keke, motorcycle/Okada, tractor, light truck |

Across the complete authored fleet, 30 of the 50 instances are car-class types (60%); the rest represent passenger transport, logistics, emergency/service, and local/utility transport. This is a deliberate game-population mix, not a claim of measured real-world mode share. Alimosho and Ekiti are intentionally more mixed; Eko Atlantic is most car-heavy.

## Evidence used to guide the mix

- **Lekki / the Lagos coastal corridor:** the Lagos Bus Reform Project report's Lekki–Epe classified counts list private car/SUV/pickup, minibus, taxi, HOV/Coaster, Danfo/light truck, tricycle, motorcycle and trucks. Its reported average was 75% private cars, 11% Danfo/light truck, 4% motorcycles, 3% trucks, 2% tricycles, 2% minibuses, and 1% each taxi and HOV/Coaster. The report itself is dated May 2017; the percentages are historical context, not a 2026 count. Source: https://www.lamata-ng.com/wp-content/uploads/2025/04/Final-LBR-Project-Report.pdf
- **Alimosho freight / market roads:** a 2025 Alimosho market-women study reports the most favoured small-freight modes as keke (40.3%) and commercial minibus/pickup truck (34.9%), then motorcycle (18.1%), private car (4.7%), and other means (1.3%). This is a survey of small-goods distribution by market traders, not general passenger traffic, so it guides the market-side mix rather than the entire district. Source: https://rsisinternational.org/journals/ijriss/articles/analysis-of-the-intra-urban-challenges-of-small-freight-distribution-among-market-women-in-alimosho-local-government-area-of-lagos-state-nigeria/
- **Ekiti:** Ekiti State's Digest of Transport Statistics (2020) records newly purchased vehicles as 49.39% saloon cars, 24.47% station wagons, 15.22% minibuses, 8.46% pickups, and 2.46% lorries. It separately records 3,192 newly registered motorcycles, 67.42% used commercially. A 2025 peri-urban Ado-Ekiti study describes informal reliance on motorcycle taxis, tricycles, and minibuses; its percentages are a small local survey and should not be treated as a statewide count. Sources: https://www.ekitistate.gov.ng/wp-content/uploads/TRANSPORT-STATISTICS-new-2020-1.pdf and https://www.onlinescientificsresearch.com/articles/development-at-the-urban-fringes-analysing-intraurban--mobility-in-periurban-communities-of-adoekiti-nigeria.pdf
- **Eko Atlantic:** a current area/transport guide describes light internal traffic, private cars and ride-hailing as the primary access modes, and no public bus/BRT service into the city. That supports a more private-car-heavy roster with service vehicles rather than Danfo routes inside the district. Source: https://cwlagos.com/area-guides/eko-atlantic

The five-district roster is an authored visual/gameplay approximation. Sources cover different geographies, years and populations; their percentages are not combined into a statistical model.

## Runtime and performance policy

- Vehicle roots are children of the matching district streaming root.
- A district fleet is advanced only when the player is nearby or its remote CCTV district is selected.
- Low-memory mode keeps the same ten-vehicle district budget instead of simulating all 50 simultaneously.
- Shared materials are cached by colour to reduce material duplication.
- Vehicles are dynamic and are kept out of static batching.
- This implementation does not yet have detailed road-junction yielding, traffic lights, collision physics between vehicles, boarding, or vehicle damage.

## Verification

- `npm run test:district-vehicles` checks the five district rosters, all 18 vehicle profiles, total count and car-majority design constraint.
- `npm run test:stage-08m:runtime` checks that the live district fleet activates when remote CCTV streams a district and that its vehicles move.
- `npm run test:production` checks the production Vite build, district fleet API and ten-vehicle activation for Ekiti and Alimosho.
