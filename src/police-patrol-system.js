import * as pc from 'playcanvas';

const ASSETS = Object.freeze({
  officer: 'https://grab3d.com/dl/police-officer-rigged/police-officer-rigged.glb',
  policeCar: 'https://grab3d.com/dl/police-car/police-car.glb'
});


function createLowMemoryOfficer(app, position) {
  const root = new pc.Entity('naija-city-police-officer-low-memory');
  const uniform = new pc.StandardMaterial();
  uniform.diffuse = new pc.Color(0.035, 0.075, 0.16);
  uniform.update();
  const dark = new pc.StandardMaterial();
  dark.diffuse = new pc.Color(0.018, 0.025, 0.04);
  dark.update();
  const skin = new pc.StandardMaterial();
  skin.diffuse = new pc.Color(0.48, 0.29, 0.20);
  skin.update();
  const add = (name, type, scale, pos, material) => {
    const part = new pc.Entity(name);
    part.addComponent('render', { type, material });
    part.setLocalScale(...scale);
    part.setLocalPosition(...pos);
    root.addChild(part);
    return part;
  };
  add('uniform-torso','box',[.43,.64,.24],[0,1.12,0],uniform);
  add('officer-head','sphere',[.22,.25,.21],[0,1.60,0],skin);
  add('uniform-cap','cylinder',[.25,.07,.25],[0,1.77,0],dark);
  add('uniform-left-arm','capsule',[.12,.43,.12],[-.29,1.13,0],uniform);
  add('uniform-right-arm','capsule',[.12,.43,.12],[.29,1.13,0],uniform);
  add('uniform-left-leg','capsule',[.14,.48,.14],[-.12,.48,0],dark);
  add('uniform-right-leg','capsule',[.14,.48,.14],[.12,.48,0],dark);
  root.tags.add('ambient-pedestrian');
  root.tags.add('police-patrol-npc');
  root.setPosition(...position);
  app.root.addChild(root);
  return root;
}

function loadContainer(app, name, url) {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(name, 'container', { url });
    app.assets.add(asset);
    asset.once('load', () => resolve(asset));
    asset.once('error', error => reject(new Error(error?.message || String(error || name + ' failed to load'))));
    app.assets.load(asset);
  });
}

/**
 * Optional streamed police patrol for Naija City.
 * Uses a CC0 Grab3D officer and car; patrol logic is a lightweight game AI loop.
 * No combat, weapon use or enforcement interaction is implemented.
 */
export function createPolicePatrolSystem({ app, playerPhysics, lowMemoryDevice = false, onStatus = () => {} } = {}) {
  if (!app) throw new Error('Police patrol requires the PlayCanvas app.');
  let destroyed = false;
  let officerAsset = null;
  let carAsset = null;
  let officer = null;
  let patrolCar = null;
  let elapsed = 0;
  let waypoint = 0;
  let animationName = '';
  let state = 'loading';
  let loadError = null;
  const route = [
    [8.2, 0, -18],
    [8.2, 0, -29],
    [10.8, 0, -29],
    [10.8, 0, -18]
  ];
  const speed = 0.78;
  const carPosition = [11.6, 0, -33.5];

  function setWalkAnimation() {
    const anim = officer?.anim;
    if (!anim?.baseLayer) return;
    const candidates = ['Walk', 'walk', 'PoliceOfficer_Walk', 'mixamo.com'];
    const clips = anim.baseLayer._controller?.findAnimation?.() || [];
    const names = clips.map(item => item.name || item);
    animationName = candidates.find(name => names.some(clip => String(clip).toLowerCase().includes(name.toLowerCase()))) || '';
    if (animationName) {
      try { anim.baseLayer.play(animationName); } catch {}
    }
  }

  async function load() {
    try {
      const [officerResult, carResult] = await Promise.allSettled([
        lowMemoryDevice ? Promise.reject(new Error('Rigged officer deferred for low-memory profile')) : loadContainer(app, 'grab3d-police-officer-rigged', ASSETS.officer),
        loadContainer(app, 'grab3d-police-car-lightweight', ASSETS.policeCar)
      ]);
      if (destroyed) {
        if (officerResult.status === 'fulfilled') officerResult.value.unload();
        if (carResult.status === 'fulfilled') carResult.value.unload();
        return;
      }
      if (officerResult.status === 'fulfilled') {
        officerAsset = officerResult.value;
        officer = officerAsset.resource.instantiateModelEntity();
        officer.name = 'naija-city-police-patrol-npc';
        officer.tags.add('ambient-pedestrian');
        officer.tags.add('police-patrol-npc');
        officer.setLocalScale(0.92, 0.92, 0.92);
        officer.setPosition(...route[0]);
        app.root.addChild(officer);
        setWalkAnimation();
      } else if (lowMemoryDevice) {
        officer = createLowMemoryOfficer(app, route[0]);
        animationName = 'low-poly procedural patrol';
      } else {
        loadError = String(officerResult.reason?.message || officerResult.reason);
      }
      if (carResult.status === 'fulfilled') {
        carAsset = carResult.value;
        patrolCar = carAsset.resource.instantiateRenderEntity();
        patrolCar.name = 'naija-city-police-patrol-car';
        patrolCar.tags.add('parked-traffic-vehicle');
        patrolCar.setLocalScale(1, 1, 1);
        patrolCar.setPosition(...carPosition);
        patrolCar.setEulerAngles(0, 180, 0);
        app.root.addChild(patrolCar);
      } else {
        loadError = [loadError, String(carResult.reason?.message || carResult.reason)].filter(Boolean).join('; ');
      }
      state = officer || patrolCar ? 'active' : 'failed';
      onStatus(state === 'active' ? 'Police patrol character and vehicle streamed in.' : 'Police patrol assets could not be loaded.');
    } catch (error) {
      state = 'failed';
      loadError = String(error?.message || error);
      onStatus('Police patrol assets could not be loaded.');
    }
  }

  void load();

  function update(deltaSeconds) {
    if (destroyed || !officer || state !== 'active') return;
    elapsed += Math.max(0, Math.min(0.05, Number(deltaSeconds) || 0));
    if (elapsed < 0.05) return;
    const dt = elapsed;
    elapsed = 0;
    const target = route[waypoint];
    const p = officer.getPosition();
    const dx = target[0] - p.x;
    const dz = target[2] - p.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.28) {
      waypoint = (waypoint + 1) % route.length;
      return;
    }
    const step = Math.min(distance, speed * dt);
    const x = p.x + dx / distance * step;
    const z = p.z + dz / distance * step;
    let y = p.y;
    const hit = playerPhysics?.raycast?.([x, p.y + 0.8, z], [x, p.y - 1.2, z]);
    if (hit?.point) y = hit.point[1];
    officer.setPosition(x, y, z);
    officer.setEulerAngles(0, Math.atan2(dx, dz) * 180 / Math.PI, 0);
  }

  function getState() {
    return {
      state,
      ai: 'four-waypoint pedestrian patrol',
      officerLoaded: Boolean(officer),
      carLoaded: Boolean(patrolCar),
      officerPosition: officer ? officer.getPosition().toArray() : null,
      carPosition: patrolCar ? patrolCar.getPosition().toArray() : null,
      animation: animationName || 'procedural patrol movement',
      assets: ASSETS,
      loadError
    };
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    officer?.destroy();
    patrolCar?.destroy();
    officerAsset?.unload();
    carAsset?.unload();
  }

  return { update, getState, destroy };
}
