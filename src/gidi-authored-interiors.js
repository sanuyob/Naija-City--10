/**
 * Runtime access for the five authored interior spaces in GIDI 02 REBUILD r106.
 * Geometry is already streamed in the four existing GIDI cells; this module
 * only replaces broad player blockers with compact wall/floor boxes and hides
 * ceilings while the player is inside.
 */
const WORLD_Y_OFFSET = -0.3;
const PLAYER_REPLACED_BUILDING_COLLIDERS = new Set([
  'building:12,-73', // Fresh Cut
  'building:22,-74', // Mide Tech Hub
  'building:33,-84', // Grand Hotel lobby / guest room
  'building:34,-84',
  'building:35,-84'
]);

function box(id, min, max, surface = 'concrete') {
  const dx = max[0] - min[0], dy = max[1] - min[1], dz = max[2] - min[2];
  return {
    id,
    position: [
      (min[0] + max[0]) / 2,
      (min[2] + max[2]) / 2 + WORLD_Y_OFFSET,
      -(min[1] + max[1]) / 2
    ],
    halfExtents: [Math.max(0.04, dx / 2), Math.max(0.04, dz / 2), Math.max(0.04, dy / 2)],
    surface
  };
}

function makeInterior(id, label, cellId, bounds, floorY, ceilingY, roofNodes, colliderBounds) {
  return {
    id, label, cellId, bounds, floorY, ceilingY, roofNodes,
    colliders: colliderBounds.map(([name, min, max, surface]) => box(`${id}:${name}`, min, max, surface || 'concrete'))
  };
}

const INTERIORS = [
  makeInterior('fresh-cut', 'Fresh Cut', '0,-4', { minX: 315, maxX: 335, minZ: -1817, maxZ: -1803 }, 0.06, 3.56,
    ['FC_ARCH_CEILING_ROOF_SLAB'], [
      ['floor', [313.5,1803,0.20], [335,1817,0.36], 'concrete'],
      ['north-wall', [315,1816.82,0.36], [335,1817,3.56]],
      ['south-wall', [315,1803,0.36], [335,1803.18,3.56]],
      ['front-wall-a', [315,1803,0.36], [315.18,1809.075,3.56]],
      ['front-wall-b', [315,1810.925,0.36], [315.18,1817,3.56]],
      ['rear-wall-a', [334.82,1803,0.36], [335,1809.295,3.56]],
      ['rear-wall-b', [334.82,1810.655,0.36], [335,1817,3.56]],
      ['rear-door-lintel', [334.82,1809.295,2.58], [335,1810.655,2.68]]
    ]),

  makeInterior('mide-tech-hub', 'Mide Tech Hub', '1,-4', { minX: 551.1, maxX: 579, minZ: -1840, maxZ: -1820 }, 0.165, 5.4,
    ['MIDE_TECH_HUB_BLOCKOUT_ROOF'], [
      ['floor', [549.5,1820.225,0.425], [578.775,1839.775,0.465], 'concrete'],
      ['north-wall', [551.1,1820,0.44], [578.9,1820.2,5.4]],
      ['south-wall', [551.1,1839.8,0.44], [578.9,1840,5.4]],
      ['front-glass-a', [551.18,1820.35,0.44], [551.24,1827.55,3.585]],
      ['front-glass-b', [551.18,1832.45,0.44], [551.24,1839.65,3.585]],
      ['front-pier-a', [551,1827.8,0.44], [551.2,1828.62,5.4]],
      ['front-pier-b', [551,1831.38,0.44], [551.2,1832.2,5.4]],
      ['rear-wall-a', [578.8,1820.1,0.44], [579,1829.4,5.4]],
      ['rear-wall-b', [578.8,1830.6,0.44], [579,1839.9,5.4]],
      ['rear-service-lintel', [578.8,1829.4,2.93], [579,1830.6,3.43]],
      ['glass-partition-a', [562.57,1820.35,0.44], [562.63,1828.7,3.86]],
      ['glass-partition-b', [562.57,1831.3,0.44], [562.63,1839.65,3.86]],
      ['meeting-north-wall', [569,1825.73,0.47], [576.6,1825.87,4.37]],
      ['meeting-west-wall', [568.93,1825.8,0.47], [569.07,1831.4,4.37]],
      ['meeting-east-wall', [576.53,1825.8,0.47], [576.67,1831.4,4.37]],
      ['meeting-south-wall-a', [569,1831.33,0.47], [570.26,1831.47,4.37]],
      ['meeting-south-wall-b', [571.54,1831.33,0.47], [576.6,1831.47,4.37]],
      ['meeting-door-lintel', [570.26,1831.33,2.72], [571.54,1831.47,2.78]]
    ]),

  makeInterior('grand-hotel-lobby', 'Grand Hotel Lobby', '1,-5', { minX: 849, maxX: 891, minZ: -2085, maxZ: -2055 }, 0.24, 5.65,
    ['YABA_NEIGHBORHOOD_HOTEL_BLOCKOUT_ROOF'], [
      ['floor', [849.2,2053.5,0.42], [890.8,2084.8,0.54], 'concrete'],
      ['west-wall', [849,2055.2,0.57], [849.44,2084.8,5.57]],
      ['north-wall', [849.2,2084.56,0.57], [890.8,2085,5.57]],
      ['east-wall-south', [890.56,2055,0.57], [891,2079.5,5.57]],
      ['east-wall-north', [890.56,2081.5,0.57], [891,2085,5.57]],
      ['front-pier-a', [849,2055,0.57], [851.4,2055.44,5.57]],
      ['front-pier-b', [857.8,2055,0.57], [867.8,2055.44,5.57]],
      ['front-pier-c', [872.2,2055,0.57], [882.2,2055.44,5.57]],
      ['front-pier-d', [888.2,2055,0.57], [891,2055.44,5.57]],
      ['front-glass-a', [851.4,2055.41,0.725], [857.8,2055.48,4.275]],
      ['front-glass-b', [882.2,2055.41,0.725], [888.6,2055.48,4.275]],
      ['core-west-partition', [878.89,2072.5,0.55], [879.11,2084.5,5.55]],
      ['core-south-partition', [879,2072.69,0.55], [889,2072.91,5.55]],
    ]),

  makeInterior('grand-hotel-guestroom-01', 'Grand Hotel Guest Room 01', '1,-5', { minX: 851.5, maxX: 859.5, minZ: -2084.7, maxZ: -2077.5 }, 0.24, 3.55,
    ['YABA_NEIGHBORHOOD_HOTEL_BLOCKOUT_ROOF'], [
      ['west-wall', [851.43,2077.5,0.54], [851.57,2084.7,5.45]],
      ['east-wall', [859.43,2077.5,0.54], [859.57,2084.7,5.45]],
      ['entry-wall-a', [851.5,2077.46,0.54], [854.94,2077.64,5.45]],
      ['entry-wall-b', [856.06,2077.46,0.54], [859.5,2077.64,5.45]],
      ['entry-lintel', [854.94,2077.46,2.76], [856.06,2077.64,2.82]],
      ['window-glass', [853.26,2084.762,1.315], [856.74,2084.798,3.135]]
    ]),

  makeInterior('player-home', 'Player Home', '0,-5', { minX: 288, maxX: 312, minZ: -2119, maxZ: -2101 }, 1.23, 4.6,
    ['PLAYER_HOME_ROOF'], [
      ['floor', [288.325,2099.5,1.5], [311.675,2118.675,1.53], 'concrete'],
      ['front-wall-west', [288,2100.995,1.5], [298.8,2101.245,4.5]],
      ['front-wall-east', [301.2,2100.995,1.5], [312,2101.245,4.5]],
      ['rear-wall-west', [288,2118.755,1.5], [303.125,2119.005,4.5]],
      ['rear-window-low', [303.125,2118.755,1.5], [304.875,2119.005,2.5]],
      ['rear-window-high', [303.125,2118.755,3.5], [304.875,2119.005,4.5]],
      ['rear-wall-east', [304.875,2118.755,1.5], [312,2119.005,4.5]],
      ['west-wall-front', [287.995,2101,1.5], [288.245,2112.325,4.5]],
      ['west-window-low', [287.995,2112.325,1.5], [288.245,2114.075,2.4]],
      ['west-window-high', [287.995,2112.325,3.6], [288.245,2114.075,4.5]],
      ['west-wall-rear', [287.995,2114.075,1.5], [288.245,2119,4.5]],
      ['east-wall-front', [311.755,2101,1.5], [312.005,2110.825,4.5]],
      ['east-window-low', [311.755,2110.825,1.5], [312.005,2112.575,2.4]],
      ['east-window-high', [311.755,2110.825,3.6], [312.005,2112.575,4.5]],
      ['east-wall-rear', [311.755,2112.575,1.5], [312.005,2119,4.5]],
      ['hall-east-a', [301.13,2109.45,1.53], [301.27,2110.95,4.5]],
      ['hall-east-b', [301.13,2111.9,1.53], [301.27,2115.85,4.5]],
      ['hall-east-c', [301.13,2116.8,1.53], [301.27,2118.55,4.5]],
      ['hall-west-a', [298.73,2109.45,1.53], [298.87,2110.95,4.5]],
      ['hall-west-b', [298.73,2111.9,1.53], [298.87,2118.55,4.5]],
      ['living-partition-west', [288.35,2109.38,1.53], [298.8,2109.52,4.5]],
      ['living-partition-east', [301.2,2109.38,1.53], [311.65,2109.52,4.5]],
      ['bath-divider-east', [305.83,2114.2,1.53], [305.97,2118.55,4.5]],
      ['bath-south-west', [301.2,2114.13,1.53], [305.9,2114.27,4.5]],
      ['bath-south-east', [306.8,2114.13,1.53], [311.65,2114.27,4.5]]
    ])
];

function insideBounds(position, bounds) {
  return position[0] >= bounds.minX && position[0] <= bounds.maxX
    && position[2] >= bounds.minZ && position[2] <= bounds.maxZ;
}
function distanceToBounds(position, bounds) {
  const dx = Math.max(bounds.minX - position[0], 0, position[0] - bounds.maxX);
  const dz = Math.max(bounds.minZ - position[2], 0, position[2] - bounds.maxZ);
  return Math.hypot(dx, dz);
}

export function isPlayerInteriorReplacementCollider(proxy) {
  return proxy?.kind === 'building' && PLAYER_REPLACED_BUILDING_COLLIDERS.has(proxy.id);
}

export function getGidiAuthoredInteriorDefinitions() {
  return INTERIORS.map(item => ({
    id: item.id, label: item.label, cellId: item.cellId,
    bounds: { ...item.bounds }, floorY: item.floorY, ceilingY: item.ceilingY,
    roofNodes: item.roofNodes.slice(), colliders: item.colliders.map(c => ({ ...c, position: c.position.slice(), halfExtents: c.halfExtents.slice() }))
  }));
}

export function createGidiAuthoredInteriors({ playerPhysics, gidiStreamer, getPlayerState = () => null, collisionLoadRadius = 220, collisionUnloadRadius = 460 } = {}) {
  if (!playerPhysics?.addStaticColliders || !playerPhysics?.removeStaticColliders) throw new Error('Authored GIDI interiors require player static-collider support.');
  const activeColliders = new Set();
  const roofVisibility = new Map();
  let currentInterior = null;
  let updates = 0;

  function setRoofVisible(name, visible) {
    if (roofVisibility.get(name) === visible) return;
    roofVisibility.set(name, visible);
    gidiStreamer?.setNamedEntityEnabled?.(name, visible);
  }

  function update(position = getPlayerState()?.position) {
    if (!Array.isArray(position) || position.length < 3 || !position.every(Number.isFinite)) return getState();
    updates++;
    for (const interior of INTERIORS) {
      const distance = distanceToBounds(position, interior.bounds);
      const owner = `gidi-authored-interior:${interior.id}`;
      if (distance <= collisionLoadRadius && !activeColliders.has(interior.id)) {
        const count = playerPhysics.addStaticColliders(interior.colliders, owner);
        activeColliders.add(interior.id);
        interior.lastColliderCount = count;
      } else if (distance > collisionUnloadRadius && activeColliders.has(interior.id)) {
        playerPhysics.removeStaticColliders(owner);
        activeColliders.delete(interior.id);
      }
    }
    const inRooms = INTERIORS.filter(item => insideBounds(position, item.bounds) && position[1] >= item.floorY - 0.8 && position[1] <= item.ceilingY + 1.5);
    currentInterior = inRooms.length ? inRooms.sort((a, b) => (a.bounds.maxX-a.bounds.minX)*(a.bounds.maxZ-a.bounds.minZ) - (b.bounds.maxX-b.bounds.minX)*(b.bounds.maxZ-b.bounds.minZ))[0] : null;
    const hidden = new Set(inRooms.flatMap(item => item.roofNodes));
    for (const interior of INTERIORS) for (const name of interior.roofNodes) setRoofVisible(name, !hidden.has(name));
    return getState();
  }

  function getState() {
    return {
      interiorCount: INTERIORS.length,
      activeColliderSets: activeColliders.size,
      activeColliderCount: INTERIORS.filter(item => activeColliders.has(item.id)).reduce((sum, item) => sum + (item.lastColliderCount || item.colliders.length), 0),
      currentInterior: currentInterior?.id || null,
      currentInteriorLabel: currentInterior?.label || null,
      hiddenRoofNodes: [...roofVisibility].filter(([, visible]) => !visible).map(([name]) => name),
      roofVisibility: Object.fromEntries(roofVisibility),
      updates
    };
  }

  function destroy() {
    for (const interior of INTERIORS) {
      if (activeColliders.has(interior.id)) playerPhysics.removeStaticColliders(`gidi-authored-interior:${interior.id}`);
      for (const name of interior.roofNodes) setRoofVisible(name, true);
    }
    activeColliders.clear();
    currentInterior = null;
  }

  return { update, getState, destroy };
}

export const GIDI_AUTHORED_INTERIOR_COLLIDER_IDS = [...PLAYER_REPLACED_BUILDING_COLLIDERS];
