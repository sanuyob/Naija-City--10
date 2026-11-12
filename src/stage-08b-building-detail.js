// Stage 08B: Nigerian commercial and residential facade pass.
// Keep geometry modular, share material families, and use simple low-poly details
// so the expanded neighbourhood remains practical to profile on entry-level phones.
export function createStage08BBuildingDetail({ app, box, material }) {
  const mats = {
    glass: material([0.055, 0.14, 0.18], 0.28),
    glassLight: material([0.12, 0.25, 0.29], 0.34),
    plaster: [
      material([0.76, 0.68, 0.54]), material([0.68, 0.72, 0.65]),
      material([0.72, 0.61, 0.49]), material([0.66, 0.69, 0.72])
    ],
    trim: material([0.87, 0.82, 0.68], 0.72),
    metal: material([0.19, 0.22, 0.23], 0.42),
    shutter: material([0.34, 0.38, 0.37], 0.52),
    door: material([0.25, 0.17, 0.11], 0.62),
    awnings: [
      material([0.70, 0.16, 0.10]), material([0.08, 0.34, 0.25]),
      material([0.12, 0.25, 0.48]), material([0.78, 0.48, 0.10])
    ],
    tank: material([0.12, 0.25, 0.55], 0.3),
    concrete: material([0.48, 0.46, 0.41]),
    ac: material([0.72, 0.75, 0.72], 0.48)
  };

  let detailMeshes = 0;
  const detail = (name, position, scale, mat) => {
    const entity = box(name, position, scale, mat);
    entity.tags.add('stage08b-detail');
    detailMeshes++;
    return entity;
  };

  // Commercial facades face inward toward the new distributor streets.
  const shopZ = [-160, -65, 62, 153];
  for (const side of [-1, 1]) {
    shopZ.forEach((z, index) => {
      const x = side * 20.5;
      const height = 5.2 + (index % 2) * 1.1;
      const frontX = x - side * 4.2;
      const faceX = offset => frontX - side * offset;
      const awning = mats.awnings[(index + (side > 0 ? 1 : 0)) % mats.awnings.length];

      // Distinct fascia, projecting canopy and a recognisable roller-shutter / door split.
      detail('stage08b-shop-sign-fascia', [faceX(0.12), 3.55, z], [0.2, 0.78, 8.8], awning);
      detail('stage08b-shop-awning', [faceX(0.62), 2.93, z], [1.05, 0.16, 9.3], mats.metal);
      detail('stage08b-shop-roller-shutter', [faceX(0.16), 1.25, z + 2.15], [0.13, 1.85, 3.45], mats.shutter);
      detail('stage08b-shop-security-door', [faceX(0.18), 1.25, z - 2.45], [0.15, 2.25, 1.45], mats.door);
      detail('stage08b-shop-upper-window', [faceX(0.1), 4.55, z], [0.13, 0.78, 7.5], mats.glassLight);
      detail('stage08b-shop-roof-water-tank', [x + side * 1.6, height + 1.05, z + 4.3], [1.25, 1.8, 1.25], mats.tank);
      // A light parapet edge gives the flat-roof shop blocks a finished silhouette.
      detail('stage08b-shop-roof-parapet', [x, height + 0.32, z], [8.75, 0.32, 13.85], mats.concrete);
    });
  }

  // Residential facades use shaded windows, projecting balconies, security grilles,
  // external AC condensers and rooftop tanks commonly seen in Nigerian estates.
  const homeZ = [-155, -72, 65, 150];
  for (const side of [-1, 1]) {
    homeZ.forEach((z, index) => {
      const x = side * 42.5;
      const height = 4.1 + (index % 3) * 0.45;
      const frontX = x - side * 4.75;
      const faceX = offset => frontX - side * offset;
      const wallTone = mats.plaster[(index + (side > 0 ? 2 : 0)) % mats.plaster.length];

      // Recessed-looking window band and security grille.
      detail('stage08b-home-window-band', [faceX(0.08), 3.05, z], [0.14, 1.15, 8.7], mats.glass);
      detail('stage08b-home-window-sill', [faceX(0.28), 2.42, z], [0.42, 0.14, 9.1], mats.trim);
      detail('stage08b-home-balcony-slab', [faceX(0.82), 2.35, z], [1.55, 0.18, 5.4], mats.concrete);
      detail('stage08b-home-balcony-rail', [faceX(1.48), 2.9, z], [0.12, 0.92, 5.25], mats.metal);
      detail('stage08b-home-front-door', [faceX(0.12), 1.12, z - 4.45], [0.16, 2.2, 1.35], mats.door);
      detail('stage08b-home-security-grille', [faceX(0.22), 3.05, z], [0.16, 1.25, 8.45], mats.metal);
      detail('stage08b-home-external-ac', [faceX(0.48), 3.95, z + 5.25], [0.75, 0.58, 0.85], mats.ac);
      detail('stage08b-home-roof-water-tank', [x + side * 1.8, height + 1.1, z + 4.9], [1.35, 1.9, 1.35], mats.tank);
      detail('stage08b-home-roof-parapet', [x, height + 0.28, z], [9.75, 0.3, 14.75], wallTone);
    });
  }

  return {
    stage: '08B',
    commercialFacades: 8,
    residentialFacades: 8,
    sharedMaterialFamilies: Object.keys(mats).length,
    detailMeshes,
    features: [
      'shop fascia and projecting awnings',
      'roller shutters and security doors',
      'upper shop glazing and flat-roof parapets',
      'residential balcony slabs and metal rails',
      'security grilles, window bands and front doors',
      'external AC condensers and rooftop water tanks'
    ],
    note: 'Low-poly architectural detail pass; signage is represented by coloured fascia panels, not readable business names. PBR texture baking and interiors remain later work.'
  };
}
