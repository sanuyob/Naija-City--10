# Naija City — Fictional Lagos District Reference & Asset Plan

**Status:** Research-backed district library plus first playable Yaba heritage slice (Stage 08K)
**Scope:** Lekki, Ekiti, Eko Atlantic, Victoria Island (VI), Yaba and Alimosho  
**Target art style:** Low-poly semi-realism: readable low-cost geometry, believable real-world scale, restrained colour variation, grounded material response and Nigerian district-specific composition.

This is a **fictionalized city plan**, not a claim that the six districts are geographically adjacent or that every proposed building is built today. Real places are reference sources; road geometry, parcel positions, landmarks and names can be rearranged for gameplay.

## 1. Art-direction rules

1. **District identity must come from the whole street, not one landmark.** Building proportions, plot setbacks, road width, drainage, power lines, vegetation, signage, walls, shopfronts and street activity must work together.
2. **Use modular asset kits, then add Nigerian frontage detail.** A generic apartment block can supply the massing, but Yaba, Ekiti and Alimosho need bespoke facades, compounds, signs, gates, kiosks and market pieces.
3. **Low-poly is a budget, not a toy look.** Keep most reusable props below roughly 1,000 triangles, ordinary buildings in the low thousands, and skyline/background buildings far lower. Use realistic scale, natural daylight, restrained roughness, subtle weathering and local surface materials.
4. **Share models; vary placement and finish.** Reuse one GLB as many instances with different transforms and selected material variants. Avoid importing hundreds of unique copies.
5. **Stream by district and distance.** The downloaded library is not a scene. Do not load every asset at startup. Use high-detail near the player, low-detail skyline models at distance, and unload or deactivate assets outside the active area.
6. **Do not use generic foreign signage as Nigerian signage.** Keep sign meshes blank where practical; author fictional Nigerian business names and district graphics separately. Do not copy real brand logos without permission.

## 2. District reference findings and in-game lineups

### Lekki — coastal expressway, gated estates and active road edges

**Reference traits.** Lekki is a low-lying coastal barrier-peninsula that urbanized rapidly along the Lekki–Epe Expressway. The urban morphology study describes a major road corridor with drainage and power cables, roadside one-storey service/trade structures, informal clusters, and more formal estate housing behind controlled gates. It also documents the difference between maintained estate streets and poorly maintained approach roads. Coastal studies identify wetlands, mangroves, low elevation and flood exposure as important landscape constraints.

**Build lineup.** A multi-lane expressway spine; service roads and estate entrances; gated low-rise houses and townhouses; mid-rise apartments; construction / service-yard buildings; gatehouse, perimeter walls, guards' shelter, drainage channels, utility poles and overhead lines; small roadside shop and repair-yard fronts; palms, wetland shrubs and scattered trees. Use commercial and suburban GLBs for building massing, industrial GLBs for service-yard shapes, Roads Kit for road and utility pieces, and Nature Kit for coastal planting.

**Must be custom-authored.** Nigerian estate gates and security lodges; roadside kiosk / vulcanizer / food stand family; lagoon and wetland transitions; Lagos-style shop signs and road-edge clutter.

### Ekiti — green uplands, dome rocks and compound-based neighbourhoods

**Reference traits.** Ekiti State's official description places much of the state on an upland zone above 250 metres with an undulating surface, steep-sided dome rocks and ridges; Efon-Alaaye, Ikere-Ekiti and Okemesi-Ekiti are noted for prominent rock formations. Research on Ado-Ekiti records roads across primary, secondary and local access levels, including sloped and sometimes irregular building edges. Historical writing documents Yoruba/Ekiti compound settlement patterns with an open shared centre, while contemporary housing studies show a mix of traditional adobe, rooming houses and newer cement-block buildings. Treat historic compound arrangements as one architectural reference, not as the only present-day housing type.

**Build lineup.** A hilly town edge; visible distant green ridges; clustered large rock outcrops; curved slope roads and narrow access streets; detached family compounds and small blocks; walls and compound gates; roadside shops; laterite-coloured ground shoulders, rock-edged cuts, dense broadleaf trees, palms and shrubs. Use the suburban kit as basic house massing, the road kit for modular streets, and Nature Kit rock/vegetation models for the landscape.

**Must be custom-authored.** Ekiti/Yoruba courtyard-compound house modules; laterite and earth-block facade materials; compound walls and gates; local slope-road shoulders and rock retaining edges; larger Efon-Alaaye-inspired dome-rock silhouettes.

### Eko Atlantic — planned reclaimed coastal city

**Reference traits.** Eko Atlantic's official material and the African Development Bank ESIA describe a planned mixed-use coastal city on reclaimed land with a sea defence, waterfront promenade, marinas/canals, bridges and a hierarchy of primary, secondary and local roads. The ESIA describes a 10-district plan and gives design-intent proportions of residential, office, retail and recreational uses. These are planning references; they should not be treated as a live, fully built inventory.

**Build lineup.** Flat reclaimed-ground platform; broad boulevard; formal primary/secondary/local street hierarchy; roundabouts and signalized junctions; high-rise office and hotel clusters; mid-rise mixed-use blocks; marina and canal edges; bridges; tree-lined promenades, wide paving, benches and planters; coastal rock revetment / sea wall. Use the commercial towers, road junction pieces, industrial utility props and selected rock/vegetation assets.

**Must be custom-authored.** Continuous rock-armoured seawall; canal quay-wall modules and pedestrian bridges; waterfront furniture; glass-and-stone curtain-wall material family; district-specific boulevard and marina signs.

### Victoria Island — office towers, hotels, serviced apartments and leafy side streets

**Reference traits.** The Lagos State Ikoyi–Victoria Island Model City Plan maps central business, hospitality, high-/medium-/low-residential, mixed-use and recreation zones. Current district descriptions show a blend of office towers on the main commercial corridors, serviced-apartment blocks, large residential estates, hotels, older detached homes and quieter tree-lined side streets. The district is not one uninterrupted skyscraper canyon.

**Build lineup.** Office and hotel tower clusters; serviced apartments; 1004-style slab-block massing (fictional, not a copy); converted detached-house offices; mixed-use retail podiums; wide commercial avenues; leafy side streets; plazas, covered retail frontage, benches, planters, streetlights and clean sidewalks. Use commercial buildings and LOD forms for skyline, suburban forms for side streets, and road/vegetation assets for the streetscape.

**Must be custom-authored.** Lagos-specific hotel and office facade variations without copying protected logos; high-end entrance plazas; covered retail canopies; distinctive glass, stone and tinted-window material variants.

### Yaba — layered mainland streets and mixed-age low-rise architecture

**Reference traits.** Reporting and architectural writing describe Yaba's mix of older Afro-Brazilian / colonial-era bungalows, 1980s apartment blocks, three- and four-storey tenements, newer commercial/technology buildings, school frontages and busy central streets. The street-level image is mixed: shops and food businesses, compound walls, courtyards, informal trade, utility infrastructure and leafy residential pockets.

**Build lineup.** Compact streets and smaller plots; three- to four-storey apartment / tenement massing; older bungalow forms; ground-floor shops; small offices and education buildings; narrow shop awnings; signboards; window AC units; metal gates; fences; utility poles and wires; drains and patched road surfaces; small food and market frontage; tropical trees and courtyard plants. Use low/mid-rise commercial GLBs, suburban forms and road / street-prop pieces as a base.

**Implemented in Stage 08K.** Ten Afro-Brazilian-inspired veranda bungalow frontage modules; eight low-rise tenement frontage modules with repeated window bays, balconies and rain pipes; an 18-piece open-courtyard Yoruba family-compound kit; three roadside produce stalls; five fictional Nigerian business signs; and 84 roadside drain/grate modules. The compound replaces one original neighbourhood-home blockout shell. The modules are static-batched, and 53 collision proxies are exposed to player/actor physics. The optional CC0 streetlight GLB is skipped on low-memory devices. **Still to deepen:** full room/courtyard interiors, bespoke roof silhouettes, more varied market inventory and a dedicated asphalt/paving PBR pass.

### Alimosho — expansive residential fabric and strong local commercial nodes

**Reference traits.** The Lagos State Alimosho model-plan material identifies low-, medium- and high-density residential areas, mixed use, high streets, expressways, markets and transport links. Local area coverage describes Egbeda as residential with junction markets, Ikotun as a busy roundabout / market centre, Igando as a local centre with transport facilities, and Iyana Ipaja as a high-traffic mix of homes and shops. The 2022–2042 plan is listed by the state Ministry; the current plan's full contents were not needed for this first asset pass.

**Build lineup.** Repeating low-/medium-rise houses and walled compounds; small apartment blocks; lock-up shops; local market rows; bus stop / terminal scenery; busy roundabout and collector-road nodes; workshops and service yards; overhead wires, streetlights, road signs, trees and roadside stalls. Use suburban buildings for housing, commercial buildings for mixed-use infill, industrial buildings for workshops and the road kit for junctions.

**Must be custom-authored.** Open-market stall rows and lock-up-shop modules; Lagos bus-stop / terminal kit; compound gates and walls; roadside vending, produce display and fictional shop sign families.

## 3. Downloaded source packs

The source archives are retained outside `public/` under `asset-sources/fictional-lagos/originals/`; only extracted model files and license records are under the public asset path. Every Kenney archive contained its own CC0 license file. The separate Innerscene palm model is listed as a CC0 dedication on its product page.

| Source | Downloaded models | Source / license | Main use |
|---|---:|---|---|
| Kenney City Kit (Commercial) | 41 GLB | [Official pack page](https://kenney.nl/assets/city-kit-commercial) · CC0 1.0 | Low-/mid-rise buildings, skyscrapers, low-detail buildings, awnings and overhangs |
| Kenney City Kit (Suburban) | 40 GLB | [Official pack page](https://kenney.nl/assets/city-kit-suburban) · CC0 1.0 | Houses, fences, driveways, paths and planters |
| Kenney City Kit (Roads) | 95 GLB | [Official pack page](https://kenney.nl/assets/city-kit-roads) · CC0 1.0 | Road modules, junctions, bridges, barriers, signs, lights, poles and wires |
| Kenney City Kit (Industrial) | 37 GLB | [Official pack page](https://kenney.nl/assets/city-kit-industrial) · CC0 1.0 | Workshop / industrial buildings, containers, tanks and utility pieces |
| Kenney Nature Kit | 44 selected GLB | [Official pack page](https://kenney.nl/assets/nature-kit) · CC0 1.0 | Trees, palms, shrubs, grass, rocks and cliffs |
| Innerscene Low-poly Nature Palm Tree | 1 GLB | [Model page](https://www.innerscene.com/tools/library/3d-parts/low-poly-nature-palm-tree-5e953f37) · CC0 dedication | Additional tropical palm form |

**Total:** 258 GLB files (11,498,688 bytes / 10.97 MiB), plus four shared 1K colour atlases (46,200 bytes). The complete model-plus-atlas library is 11,544,888 bytes (11.01 MiB), with 131,930 aggregate triangles across the GLBs. The largest individual file is 441 KB and the highest triangle count for one asset is 5,246. This total is a catalog sum; it is **not** a target for simultaneous loading. The full model and shared-texture registers contain file paths, hashes, sizes, license and source URLs; the model register also records triangle counts.

## 4. Performance and import policy

- Keep the library lazy: no new startup downloads or scene placements are introduced by this asset collection.
- Select district-specific assets from `public/assets/fictional-lagos/district-manifests/`.
- Use low-detail building variants for far skyline silhouettes and detailed models only near the player.
- Reuse repeated assets as PlayCanvas instances; group static geometry where it does not compromise streaming or visibility culling.
- Use shared low-resolution material variants. The existing registered ambientCG Road 008 B, Concrete 044 D and Paving Stones 152 CC0 materials can support the first pass of asphalt, kerbs and paving.
- For the actual district build, measure draw calls, frame time, GPU memory and download bytes on a real Android phone before raising object density.
- Asset file size and GLB structure have been checked. A visual sample check and full mobile device test are tracked separately from the file-level validation.

## 5. First playable Yaba slice and remaining gaps

- A Sketchfab market-stall result advertised itself as optimized low-poly, but its page reports about **474,300 triangles**. It was excluded as unsuitable for the mobile target.
- The generic city kits remain a base palette, not a finished Nigerian art pack. Stage 08K adds a first fictionalized Yaba frontage/compound/stall/sign/drain pass, but it is not a measured reproduction of a named heritage building and does not yet constitute a fully detailed AAA environment.
- Eko Atlantic seawall, revetment, canal quay walls, bridges and marina modules are researched and specified here but are not yet built into the runtime. The ESIA describes a rock-core defence with armour rock and precast concrete armour units, a vertical sheet-pile canal wall system, canals about 18m wide, and bridges crossing canals and roads; treat these as design references, not proof that every planned element is complete today.
- Lekki, Victoria Island, Eko Atlantic, Alimosho and Ekiti remain district-manifested asset plans, not playable rebuilt districts.
- No unverified or unclear-license downloaded asset was added. Paid items were not purchased.

## 6. Research references

- [Ekiti State Government — About Ekiti](https://www.ekitistate.gov.ng/about-ekiti) (topography and vegetation).
- [Oloidi, 2014 — Ekiti People and Socio-Economic Self-Reliance Before 1900](http://iiste.org/Journals/index.php/DCS/article/view/14760) (historical compound settlement pattern).
- [Ojo-Fajuru, 2017 — Reclaiming Setbacks and Open Spaces: Ado-Ekiti](https://ukzn-dspace.ukzn.ac.za/bitstreams/1f924abc-6c8a-4085-abcf-0a3632b304e0/download) (Ado-Ekiti streets, building edges and road categories).
- [Alade et al., 2018 — Local Building Materials in Ado-Ekiti](https://doi.org/10.15641/jcbm.2.2.449) (stone, timber, laterite, clay/mud and bamboo availability/use).
- [Shtanov, 2017 — Border Conditions: Urban Morphologies of Lekki](https://nobalsa.com/wp-content/uploads/2018/01/4-border-conditions-the-urban-morphologies-of-lekki-nigeria.pdf) (expressway, roadside trade, service settlements and gated estates).
- [Scientific African, 2021 — Flood risks on Lekki Peninsula](https://www.sciencedirect.com/science/article/pii/S2468227621000910) (barrier-island and wetland context).
- [Lagos State — Revised Ikoyi–Victoria Island Model City Plan](https://lasbca.lagosstate.gov.ng/wp-content/uploads/2021/07/Ikoyi-Victoria-Island-MCP.pdf) (zoning and corridor types).
- [BusinessDay, 2022 — Eko Atlantic and VI development](https://businessday.ng/real-estate/article/how-eko-atlantic-city-new-plan-drive-devt-boom-in-victoria-island/) (VI commercial and mixed-use growth).
- [ICWA, 2015 — How Long is Now? Lagos' architectural landscape](https://www.icwa.org/how-long-is-now-lagos-fast-evolving-architectural-landscape/) (Yaba's layered building stock and street character).
- [Duerksen — Waterhouses](https://ohioopen.library.ohio.edu/cgi/viewcontent.cgi?article=1109&context=oupress) (Lagos compounds, Yaba bungalow, tenements and waterfront housing).
- [Ibitoye et al., 2022 — Documentation of Local Architectural Vocabularies for Residential Building Components in Yoruba Cultures](https://doi.org/10.33003/fjs-2021-0601-2037) (Yoruba residential building components).
- [Adenaike et al., 2020 — A Documentation Review of Yoruba Indigenous Architectural Morphology](https://doi.org/10.7176/jaas/66-05) (room modules, family compounds, courtyards and material patterns).
- [Bloomberg, 2022 — How Face-Me-I-Face-You Homes Became a Way of Life in Lagos](https://www.bloomberg.com/news/features/2022-05-05/the-history-and-design-of-lagos-face-me-i-face-you-homes) (one-/two-storey axial tenement arrangement).
- [Jolaoso & Onolaja, 2021 — Significance of Informal Trading Activities in the Emergence of Urban Spatial Vernacular](https://doi.org/10.26905/lw.v13i1.5177) (Lagos street trading, open shelves/containers, mats, clustered stalls and integrated sheds).
- [African Development Bank — Eko Atlantic ESIA Summary](https://www.afdb.org/fileadmin/uploads/afdb/Documents/Environmental-and-Social-Assessments/Nigeria_Eko_Atlantic_ESIA_ESMP_Summary.pdf) (rock revetment, concrete armour units, sheet-pile canal walls, canal widths and bridges).
- [Eko Atlantic — Official Infrastructure](https://www.ekoatlantic.com/about/infrastructure) (developer description of the Great Wall, promenade and marinas).
- [Lagos State Ministry — Development Plans](https://mppud-opp.com/index.php?page=development-plans-new) (official Alimosho Model City Plan listing).
- [Alimosho Model City Plan 2010–2020](https://lasbca.lagosstate.gov.ng/wp-content/uploads/2021/07/ALIMOSHO-MODEL-CITY-PLAN-2010-2020.pdf) (residential density, mixed-use and road-network categories).
- [RALF — Alimosho local area guide](https://rentalocalfriend.com/en/global-community/africa/nigeria/alimosho153661-153661) (Ikotun, Igando, Egbeda, Iyana Ipaja and market/transport context).
- [African Development Bank — Eko Atlantic ESIA Summary](https://www.afdb.org/fileadmin/uploads/afdb/Documents/Environmental-and-Social-Assessments/Nigeria_Eko_Atlantic_ESIA_ESMP_Summary.pdf) (planned districts, road hierarchy, canals, sea defence and land-use intent).
- [Eko Atlantic — Official district brochure](https://www.ekoatlantic.com/wp-content/uploads/2015/03/Eko-Atlantic-Brochure.pdf) (district character and boulevard / marina intent).
