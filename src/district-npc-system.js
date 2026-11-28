import * as pc from 'playcanvas';
import { NPC_DEFINITIONS, NPC_DISTRICT_COUNTS } from './npc-roster.js';

const JOB_PROFILES = Object.freeze({
  vendor: { label: 'serving customers', pause: 2.4, speed: 0.62, interaction: 'Welcome! What can I get for you?', mode: 'work' },
  'retail-clerk': { label: 'arranging shop stock', pause: 2.1, speed: 0.58, interaction: 'Welcome. I can help you find something.', mode: 'work' },
  'store-manager': { label: 'checking the shop floor', pause: 2.2, speed: 0.62, interaction: 'I am checking today’s stock and sales.', mode: 'work' },
  shopper: { label: 'shopping around', pause: 2.8, speed: 0.72, interaction: 'Just looking around the neighbourhood shops.', mode: 'walk' },
  resident: { label: 'walking through the estate', pause: 3.0, speed: 0.68, interaction: 'Good day. I live around here.', mode: 'walk' },
  cleaner: { label: 'cleaning the street', pause: 2.0, speed: 0.72, interaction: 'Keeping our street clean and welcoming.', mode: 'work' },
  'delivery-rider': { label: 'making a delivery', pause: 1.1, speed: 2.0, interaction: 'Delivery route checked. Package handed over.', mode: 'work' },
  emergency: { label: 'standing by for a call', pause: 1.5, speed: 0.9, interaction: 'Emergency response crew. We are on standby.', mode: 'patrol' },
  chef: { label: 'preparing food', pause: 2.5, speed: 0.62, interaction: 'The kitchen is busy. Food will be ready soon.', mode: 'work' },
  'office-worker': { label: 'working at the office', pause: 3.0, speed: 0.58, interaction: 'Just finishing today’s work.', mode: 'work' },
  security: { label: 'patrolling the area', pause: 0.8, speed: 1.0, interaction: 'Security patrol. Everything is calm.', mode: 'patrol' },
  teacher: { label: 'working around the school', pause: 2.8, speed: 0.58, interaction: 'We are getting the next lesson ready.', mode: 'work' },
  entertainer: { label: 'performing for the neighbourhood', pause: 2.7, speed: 0.75, interaction: 'Come and enjoy the community performance.', mode: 'work' },
  student: { label: 'walking around the school', pause: 2.5, speed: 0.72, interaction: 'School is on. I am heading to class.', mode: 'walk' },
  'school-admin': { label: 'checking school activities', pause: 2.7, speed: 0.58, interaction: 'School activities are running as planned.', mode: 'work' },
  executive: { label: 'moving between office meetings', pause: 2.8, speed: 0.7, interaction: 'I am on my way to a meeting.', mode: 'work' },
  'it-technician': { label: 'checking office technology', pause: 2.4, speed: 0.68, interaction: 'I am checking the office systems.', mode: 'work' },
  receptionist: { label: 'serving at the front desk', pause: 2.8, speed: 0.52, interaction: 'Good day. How may I direct you?', mode: 'work' },
  'sales-rep': { label: 'meeting customers', pause: 2.8, speed: 0.66, interaction: 'I am helping a customer with an enquiry.', mode: 'work' },
  'site-worker': { label: 'checking the work area', pause: 2.0, speed: 0.8, interaction: 'The work area is being checked.', mode: 'work' },
  artisan: { label: 'working on a trade task', pause: 2.1, speed: 0.72, interaction: 'We are getting the job done safely.', mode: 'work' },
  hospitality: { label: 'serving hotel and restaurant guests', pause: 2.7, speed: 0.65, interaction: 'Welcome. How can I assist you?', mode: 'work' },
  customer: { label: 'visiting the restaurant', pause: 3.0, speed: 0.58, interaction: 'I am enjoying the food and the atmosphere.', mode: 'walk' },
  passenger: { label: 'walking along the waterfront', pause: 2.8, speed: 0.72, interaction: 'I am visiting the waterfront today.', mode: 'walk' },
  'transport-operator': { label: 'checking transport operations', pause: 2.4, speed: 0.72, interaction: 'Transport operations are running.', mode: 'work' },
  'logistics-worker': { label: 'moving cargo and supplies', pause: 2.0, speed: 0.95, interaction: 'We are moving supplies through this area.', mode: 'work' },
  'checkpoint-security': { label: 'checking access and safety', pause: 0.9, speed: 0.92, interaction: 'Please use the marked public access route.', mode: 'patrol' },
  'site-engineer': { label: 'inspecting the construction site', pause: 2.2, speed: 0.78, interaction: 'The site inspection is underway.', mode: 'work' },
  farmer: { label: 'working the field', pause: 2.8, speed: 0.72, interaction: 'Checking the crops and the field rows.', mode: 'work' }
});

const OUTFIT_LABELS = Object.freeze({
  'adire-apron': 'Adire-inspired market apron', 'ankara-market': 'Ankara-inspired marketwear',
  'ankara-casual': 'Ankara-inspired casualwear', 'yoruba-casual': 'Yoruba-inspired everyday clothing',
  'adire-smart': 'Adire-inspired smartwear', 'sanitation-green': 'Municipal sanitation workwear',
  'courier-vest': 'Dispatch rider workwear', 'smart-casual': 'Contemporary Lagos casualwear',
  'security-uniform': 'Estate security uniform', 'school-sports': 'School sportswear',
  'school-smart': 'School staff clothing', 'school-uniform': 'School uniform',
  'school-formal': 'School leadership formalwear', 'service-apron': 'Restaurant service apron',
  'smart-service': 'Hospitality smart uniform', 'chef-apron': 'Chef apron and kitchen workwear',
  'office-formal': 'Corporate office formalwear', 'tech-smart': 'Technology office smartwear',
  'office-smart': 'Office smartwear', 'field-workwear': 'Field survey workwear',
  workwear: 'Trade workwear', 'high-vis-workwear': 'High-visibility logistics workwear',
  'service-uniform': 'Passenger service uniform', 'transport-uniform': 'Transport operations uniform',
  'official-uniform': 'Port inspection uniform', 'farm-workwear': 'Practical farm workwear',
  'yoruba-farmwear': 'Yoruba-inspired rural workwear', 'performance-wear': 'Community performance clothing',
  'police-uniform': 'Community police uniform', 'hardhat-workwear': 'Construction safety workwear',
  'responder-uniform': 'Emergency response uniform'
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance2D = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

function getVisualBounds(root) {
  if (!root?.findComponents) return null;
  const bounds = [];
  for (const component of root.findComponents('render')) {
    for (const instance of component.meshInstances || []) {
      const box = instance.aabb;
      if (!box?.center || !box?.halfExtents) continue;
      const c = box.center, h = box.halfExtents;
      if (![c.x, c.y, c.z, h.x, h.y, h.z].every(Number.isFinite)) continue;
      bounds.push({ minX: c.x - h.x, maxX: c.x + h.x, minY: c.y - h.y, maxY: c.y + h.y, minZ: c.z - h.z, maxZ: c.z + h.z });
    }
  }
  if (!bounds.length) return null;
  const minX = Math.min(...bounds.map(b => b.minX)), maxX = Math.max(...bounds.map(b => b.maxX));
  const minY = Math.min(...bounds.map(b => b.minY)), maxY = Math.max(...bounds.map(b => b.maxY));
  const minZ = Math.min(...bounds.map(b => b.minZ)), maxZ = Math.max(...bounds.map(b => b.maxZ));
  return { width: maxX - minX, height: maxY - minY, depth: maxZ - minZ,
    center: [(minX + maxX) * 0.5, (minY + maxY) * 0.5, (minZ + maxZ) * 0.5],
    min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

export function isNpcOnShift(hour, schedule) {
  const [start, end] = schedule;
  return start <= end ? hour >= start && hour < end : hour >= start || hour < end;
}

function resolveClip(clips, pattern, fallback) {
  return clips.find(name => pattern.test(name)) || fallback;
}

function loadContainer(app, url, name) {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(name, 'container', { url: new URL(url, new URL(import.meta.env.BASE_URL || '/', window.location.origin)).href });
    app.assets.add(asset);
    asset.once('load', () => resolve(asset));
    asset.once('error', error => {
      app.assets.remove(asset);
      reject(new Error(name + ': ' + (error?.message || error || 'GLB load failed')));
    });
    app.assets.load(asset);
  });
}

/**
 * District-scoped, streamed civilian NPCs. Movement uses the game's shared
 * kinematic capsule solver; no per-character triangle-mesh physics is created.
 */
export function createDistrictNpcSystem({
  app, districtRoots = {}, physics, lowMemoryDevice = false,
  getPlayerState = () => null, onStatus = () => {}, loadCharacter = null
} = {}) {
  if (!app) throw new Error('District NPC system requires a PlayCanvas app.');
  if (!physics?.step) throw new Error('District NPC system requires the shared actor capsule solver.');

  const actors = NPC_DEFINITIONS.slice().map(def => ({
    ...def,
    root: null, asset: null, clips: {}, active: false, loaded: false, loading: null,
    motion: { position: def.spawn.slice(), velocity: [0, 0, 0], radius: 0.32, height: 1.78, grounded: true, shape: 'capsule' },
    waypoint: 1, wait: 0, interactTimer: 0, stunTimer: 0, cooldown: 0,
    state: 'idle', facingYaw: 0, workCycles: 0, deliveries: 0, lastTask: 'idle', lodAccumulator: 0, detail: 'distant'
  }));
  const groups = new Map();
  for (const actor of actors) {
    if (!groups.has(actor.district)) groups.set(actor.district, []);
    groups.get(actor.district).push(actor);
  }

  const stats = {
    districtCount: 5, definitions: NPC_DEFINITIONS.length, activeDistrict: null,
    loadedCharacters: 0, unloadedCharacters: 0, residentCharacters: 0, assetLoads: 0, failedLoads: 0, updates: 0, moved: 0,
    workActions: 0, interactions: 0, deliveries: 0, patrols: 0,
    capsuleActors: 0, nearActors: 0, distantActors: 0, nearPhysicsSteps: 0, distantSteps: 0, sparringHits: 0, sparringCooldown: 0
  };
  let worldSeconds = 0;
  let currentDistrictLoad = Promise.resolve();
  let activeGeneration = 0;
  let destroyed = false;

  async function defaultLoadCharacter(def) {
    const asset = await loadContainer(app, def.url, def.id);
    let root = null;
    try {
    root = asset.resource.instantiateRenderEntity({ castShadows: false });
    // Retain the source rig hierarchy and scale each imported render node as
    // in the working PlayCanvas path; root-level scaling breaks these skins'
    // bind-space relationship and over-expands the fitted clothing meshes.
    for (const component of root.findComponents('render')) {
      for (const instance of component.meshInstances || []) {
        const meshNode = instance.node;
        if (!meshNode?.getLocalScale || !meshNode?.setLocalScale) continue;
        const currentScale = meshNode.getLocalScale().clone();
        meshNode.setLocalScale(currentScale.mulScalar(10));
      }
    }
    root.name = 'district-npc-' + def.id;
    root.tags.add('district-ambient-npc');
    root.tags.add('npc-job-' + def.job);
    root.addComponent('anim', { activate: true });
    if (!root.anim) throw new Error('PlayCanvas animation component unavailable for ' + def.id);

    const animations = asset.resource.animations || [];
    const tracks = new Map();
    for (const animation of animations) {
      const track = animation?.resource || animation;
      const name = track?.name || animation?.name;
      if (name && track) tracks.set(name, track);
    }
    if (!tracks.size) throw new Error('No animation clips found in ' + def.url);
    const names = [...tracks.keys()];
    const idle = resolveClip(names, /^idle$/i, names[0]);
    const walk = resolveClip(names, /^walk$/i, resolveClip(names, /^run$/i, idle));
    const work = resolveClip(names, /special|work|calculate|greet|explain|command|bow|cheer|run/i, idle);
    const interact = resolveClip(names, /talk|speech|wave|salute|greet|bow|explain/i, work);
    const hit = resolveClip(names, /^hit$/i, resolveClip(names, /^attack$/i, work));
    for (const [name, track] of tracks) {
      const loop = [idle, walk, work, interact].includes(name);
      root.anim.assignAnimation(name, track, undefined, 1, loop);
    }
    root.anim.baseLayer.transition(idle, 0.12);
    return { root, asset, clips: { idle, walk, work, interact, hit }, clipNames: names };
    } catch (error) {
      root?.destroy?.();
      releaseAsset(asset);
      throw error;
    }
  }

  function releaseAsset(asset) {
    if (!asset) return;
    try { asset.unload?.(); } catch (error) { console.warn('NPC asset unload failed:', error); }
    if (app.assets?.remove) {
      try { app.assets.remove(asset); } catch (error) { console.warn('NPC asset registry removal failed:', error); }
    }
  }

  function unloadActor(actor) {
    if (actor.root) {
      actor.root.enabled = false;
      actor.root.destroy?.();
      actor.root = null;
    }
    if (actor.asset) {
      releaseAsset(actor.asset);
      actor.asset = null;
      stats.unloadedCharacters++;
    }
    if (actor.loaded) {
      actor.loaded = false;
      stats.residentCharacters = Math.max(0, stats.residentCharacters - 1);
      stats.capsuleActors = Math.max(0, stats.capsuleActors - 1);
    }
    actor.clips = {};
    actor.activeClip = null;
    actor.visualBounds = null;
  }

  async function ensureLoaded(actor, generation = activeGeneration) {
    if (actor.loaded) return true;
    if (actor.loading) {
      await actor.loading;
      if (actor.loaded) return true;
      if (destroyed || generation !== activeGeneration || !actor.active) return false;
    }
    const promise = (async () => {
      let loaded = null;
      try {
        loaded = await (loadCharacter || defaultLoadCharacter)(actor);
        if (destroyed || generation !== activeGeneration || !actor.active) {
          loaded.root?.destroy?.();
          releaseAsset(loaded.asset);
          return false;
        }
        actor.root = loaded.root;
        actor.asset = loaded.asset || null;
        actor.clips = loaded.clips || {};
        actor.root.setPosition(...actor.motion.position);
        districtRoots[actor.district]?.addChild(actor.root);
        actor.root.enabled = true;
        actor.loaded = true;
        stats.loadedCharacters++;
        stats.residentCharacters++;
        stats.capsuleActors++;
        stats.assetLoads++;
        return true;
      } catch (error) {
        if (loaded?.root) loaded.root.destroy?.();
        if (loaded?.asset) releaseAsset(loaded.asset);
        actor.loadError = String(error?.message || error);
        if (generation === activeGeneration) {
          stats.failedLoads++;
          onStatus('NPC model unavailable · ' + actor.role + ' · procedural fallback remains active');
          console.warn('District NPC load failed:', actor.id, error);
        }
        return false;
      }
    })();
    actor.loading = promise;
    try {
      return await promise;
    } finally {
      if (actor.loading === promise) actor.loading = null;
    }
  }

  async function loadDistrictActors(district, generation) {
    const pending = (groups.get(district) || []).slice();
    let cursor = 0;
    const worker = async () => {
      while (cursor < pending.length) {
        if (destroyed || generation !== activeGeneration) return;
        const actor = pending[cursor++];
        await ensureLoaded(actor, generation);
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, pending.length) }, worker));
    return getState();
  }

  function setActiveDistrict(district = null) {
    const next = groups.has(district) ? district : null;
    if (next === stats.activeDistrict) return getState();
    const generation = ++activeGeneration;
    const previous = stats.activeDistrict;
    stats.activeDistrict = next;
    for (const actor of actors) {
      const active = actor.district === next;
      actor.active = active;
      if (actor.root) actor.root.enabled = active;
      if (!active && (actor.loaded || actor.asset || actor.root)) unloadActor(actor);
    }
    if (previous && next) onStatus('Loading ' + (groups.get(next)?.length || 0) + ' local residents…');
    if (next) currentDistrictLoad = loadDistrictActors(next, generation);
    else currentDistrictLoad = Promise.resolve(getState());
    return getState();
  }

  function setAnimation(actor, state) {
    if (!actor.root?.anim) return;
    const clip = actor.clips[state] || actor.clips.idle;
    if (!clip || actor.activeClip === clip) return;
    try {
      actor.root.anim.baseLayer.transition(clip, state === 'hit' ? 0.06 : 0.16);
      actor.activeClip = clip;
    } catch (error) {
      console.warn('NPC animation transition failed:', actor.id, state, error);
    }
  }

  function chooseTask(actor, hour) {
    const profile = JOB_PROFILES[actor.job] || JOB_PROFILES.cleaner;
    if (!isNpcOnShift(hour, actor.schedule)) return { state: 'idle', speed: 0, profile };
    if (profile.mode === 'patrol' || profile.mode === 'walk') return { state: 'walking', speed: profile.speed, profile };
    return { state: 'working', speed: profile.speed, profile };
  }

  function updateActor(actor, dt, playerState, peers) {
    if (!actor.loaded || !actor.root || !actor.active) return;
    const motion = actor.motion;
    const [x, y, z] = motion.position;
    const playerPosition = playerState?.position;
    const nearPlayer = Array.isArray(playerPosition) && distance2D(playerPosition, motion.position) <= 24;
    actor.detail = nearPlayer ? 'near' : 'distant';
    if (nearPlayer) stats.nearActors++; else stats.distantActors++;
    actor.cooldown = Math.max(0, actor.cooldown - dt);
    actor.wait = Math.max(0, actor.wait - dt);
    actor.interactTimer = Math.max(0, actor.interactTimer - dt);
    actor.stunTimer = Math.max(0, actor.stunTimer - dt);

    const minuteOfDay = (8 * 60 + worldSeconds * 1.0) % 1440;
    const hour = Math.floor(minuteOfDay / 60);
    const task = chooseTask(actor, hour);
    let desired = [0, 0, 0];

    if (actor.stunTimer > 0) {
      actor.state = 'hit';
      motion.velocity[0] *= Math.exp(-5 * dt);
      motion.velocity[2] *= Math.exp(-5 * dt);
    } else if (actor.interactTimer > 0) {
      actor.state = 'interacting';
    } else if (actor.wait > 0) {
      actor.state = actor.job === 'security' ? 'idle' : 'working';
    } else if (task.state === 'idle') {
      actor.state = 'idle';
    } else {
      const target = actor.route[actor.waypoint] || actor.spawn;
      const dx = target[0] - x, dz = target[2] - z;
      const remaining = Math.hypot(dx, dz);
      if (remaining < 0.7) {
        actor.wait = task.profile.pause;
        actor.workCycles++;
        if (actor.job === 'delivery-rider') { actor.deliveries++; stats.deliveries++; }
        if (actor.job === 'security') stats.patrols++;
        stats.workActions++;
        actor.waypoint = (actor.waypoint + 1) % actor.route.length;
        actor.state = actor.job === 'security' ? 'idle' : 'working';
      } else {
        desired = [dx / remaining * task.speed, 0, dz / remaining * task.speed];
        actor.state = 'walking';
      }
    }

    if (nearPlayer) {
      physics.step(motion, desired, dt, peers);
      stats.nearPhysicsSteps++;
    } else {
      actor.lodAccumulator += dt;
      if (actor.lodAccumulator >= 0.25) {
        const coarseDt = Math.min(0.5, actor.lodAccumulator);
        motion.position[0] += desired[0] * coarseDt;
        motion.position[2] += desired[2] * coarseDt;
        motion.position[1] = 0;
        motion.grounded = true;
        actor.lodAccumulator = 0;
        stats.distantSteps++;
      }
    }
    actor.root.setPosition(...motion.position);
    const vx = motion.velocity[0], vz = motion.velocity[2];
    if (Math.hypot(vx, vz) > 0.1) {
      actor.facingYaw = Math.atan2(vx, -vz) * 180 / Math.PI;
      actor.root.setEulerAngles(0, actor.facingYaw, 0);
    }
    const animationState = actor.state === 'walking' ? 'walk'
      : actor.state === 'working' ? 'work'
      : actor.state === 'interacting' ? 'interact'
      : actor.state === 'hit' ? 'hit' : 'idle';
    setAnimation(actor, animationState);
    if (Math.hypot(motion.position[0] - x, motion.position[2] - z) > 0.002) stats.moved++;
  }

  function update(dt, playerState = getPlayerState()) {
    const step = clamp(Number(dt) || 0, 0, 0.05);
    if (destroyed || !stats.activeDistrict || step <= 0) return getState();
    worldSeconds += step;
    stats.sparringCooldown = Math.max(0, stats.sparringCooldown - step);
    stats.updates++;
    const active = groups.get(stats.activeDistrict) || [];
    const peers = active.filter(actor => actor.loaded && actor.root?.enabled).map(actor => actor.motion);
    for (const actor of active) updateActor(actor, step, playerState, peers.filter(peer => peer !== actor.motion));
    return getState();
  }

  function interact(id) {
    const actor = actors.find(item => item.id === id);
    if (!actor || !actor.active || !actor.loaded) return { ok: false, reason: 'npc-unavailable' };
    actor.interactTimer = 2.2;
    actor.state = 'interacting';
    stats.interactions++;
    setAnimation(actor, 'interact');
    const message = (JOB_PROFILES[actor.job] || JOB_PROFILES.cleaner).interaction;
    onStatus(message);
    return { ok: true, id, message };
  }

  function registerInteractions(interactionSystem) {
    if (!interactionSystem?.register) return [];
    return actors.map(actor => interactionSystem.register({
      id: 'npc-' + actor.id,
      name: actor.role,
      position: actor.interaction.slice(),
      range: 2.8,
      prompt: 'TALK · ' + actor.role.toUpperCase(),
      canInteract: () => actor.active && actor.loaded,
      onInteract: () => interact(actor.id)
    }));
  }

  function sparNearest(playerPosition) {
    if (!Array.isArray(playerPosition)) return { ok: false, reason: 'player-unavailable' };
    if (stats.sparringCooldown > 0) return { ok: false, reason: 'cooldown' };
    const nearby = actors.filter(actor => actor.active && actor.loaded)
      .map(actor => ({ actor, distance: distance2D(playerPosition, actor.motion.position) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearby || nearby.distance > 2.25) return { ok: false, reason: 'no-nearby-npc' };
    const actor = nearby.actor;
    const dx = actor.motion.position[0] - playerPosition[0];
    const dz = actor.motion.position[2] - playerPosition[2];
    const length = Math.hypot(dx, dz) || 1;
    actor.motion.velocity[0] += dx / length * 2.2;
    actor.motion.velocity[2] += dz / length * 2.2;
    actor.stunTimer = 0.58;
    actor.state = 'hit';
    actor.cooldown = 1.4;
    stats.sparringCooldown = 0.75;
    stats.sparringHits++;
    setAnimation(actor, 'hit');
    onStatus('Friendly sparring · ' + actor.role + ' recovers');
    return { ok: true, id: actor.id, distance: Number(nearby.distance.toFixed(2)), effect: 'brief-stun-and-knockback', lethal: false };
  }

  function updateSparringCooldown(dt) { stats.sparringCooldown = Math.max(0, stats.sparringCooldown - Math.max(0, dt)); }
  function getState() {
    return {
      ...stats,
      districtCount: Object.keys(NPC_DISTRICT_COUNTS).length,
      definitions: actors.length,
      activeCount: actors.filter(actor => actor.active && actor.loaded).length,
      characters: actors.map(actor => ({
        id: actor.id, district: actor.district, role: actor.role, job: actor.job, model: actor.model, pack: actor.pack,
        outfitStyle: actor.outfitStyle, outfitLabel: OUTFIT_LABELS[actor.outfitStyle] || actor.outfitStyle,
        loaded: actor.loaded, visible: actor.active && actor.loaded, state: actor.state,
        position: actor.motion.position.slice(), capsule: { shape: 'vertical-capsule', radius: actor.motion.radius, height: actor.motion.height }, detail: actor.detail,
        clips: { ...actor.clips }, workCycles: actor.workCycles, deliveries: actor.deliveries,
        schedule: actor.schedule, onShift: isNpcOnShift(Math.floor((8 * 60 + worldSeconds) % 1440 / 60), actor.schedule),
        visualBounds: actor.root ? getVisualBounds(actor.root) : null,
        outfitRenderParts: actor.root ? actor.root.findComponents('render').filter(component => component.entity?.name?.startsWith('NaijaCity Outfit')).length : 0,
        outfitRenderAudit: actor.root ? actor.root.findComponents('render').filter(component => component.entity?.name?.startsWith('NaijaCity Outfit')).map(component => ({
          name: component.entity?.name || '', enabled: component.enabled !== false,
          meshInstances: component.meshInstances?.length || 0,
          materials: (component.meshInstances || []).map(instance => instance.material?.name || ''),
          bounds: (component.meshInstances || []).map(instance => instance.aabb ? { center: instance.aabb.center.toArray(), halfExtents: instance.aabb.halfExtents.toArray() } : null),
          skinned: (component.meshInstances || []).some(instance => Boolean(instance.skinInstance))
        })) : [],
        loadError: actor.loadError || null
      }))
    };
  }
  function destroy() {
    destroyed = true;
    activeGeneration++;
    for (const actor of actors) unloadActor(actor);
    stats.residentCharacters = 0;
    groups.clear();
  }
  async function whenReady() { await currentDistrictLoad; return getState(); }

  return { setActiveDistrict, update, interact, registerInteractions, sparNearest, getState, whenReady, destroy, definitions: NPC_DEFINITIONS, jobProfiles: JOB_PROFILES };
}
