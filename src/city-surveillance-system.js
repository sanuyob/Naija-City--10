const DISCOVERY_STORAGE_KEY = 'naija-city-surveillance-discoveries-v1';

export const CITY_SURVEILLANCE_DISCOVERABLES = Object.freeze([
  { id: 'poi-yaba-junction', name: 'Yaba Junction', category: 'landmark', district: 'Yaba', position: [13, 0, -8], description: 'A busy Yaba street junction with local shops and pedestrian crossings.' },
  { id: 'poi-yaba-service-row', name: 'Yaba Workshop Row', category: 'service', district: 'Yaba', position: [-13, 0, -88], description: 'A row of neighbourhood repair and service workshops.' },
  { id: 'poi-alimosho-terminal', name: 'Alimosho Community Terminal', category: 'transport', district: 'Alimosho', position: [-336, 0, 454], description: 'A local bus and shared-transport interchange.' },
  { id: 'poi-lekki-estate-park', name: 'Lekki Estate Green', category: 'public', district: 'Lekki', position: [319, 0, 332], description: 'A landscaped shared green space inside the Lekki estate district.' },
  { id: 'poi-vi-plaza', name: 'Victoria Island Plaza', category: 'office', district: 'Victoria Island', position: [280, 0, 73], description: 'A commercial plaza surrounded by offices and modern street services.' },
  { id: 'poi-eko-waterfront', name: 'Eko Atlantic Waterfront Promenade', category: 'landmark', district: 'Eko Atlantic', position: [535, 0, 78], description: 'A public waterfront promenade overlooking the Atlantic edge.' },
  { id: 'poi-ekiti-ridge-view', name: 'Ekiti Ridge Viewpoint', category: 'landmark', district: 'Ekiti Uplands', position: [-312, 0, 676], description: 'A hilltop viewpoint looking across the green Ekiti uplands.' }
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const validVector = value => Array.isArray(value) && value.length >= 3 && value.slice(0, 3).every(number => Number.isFinite(Number(number)));

export function findSurveillanceDetections({
  origin,
  yawRadians = 0,
  pitchRadians = 0,
  rangeMetres = 80,
  fieldOfViewDegrees = 68,
  targets = CITY_SURVEILLANCE_DISCOVERABLES,
  hasLineOfSight = null
} = {}) {
  if (!validVector(origin)) return [];
  const yaw = Number(yawRadians) || 0;
  const pitch = clamp(Number(pitchRadians) || 0, -Math.PI * 0.45, Math.PI * 0.45);
  const direction = [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
  const cosineLimit = Math.cos(clamp(Number(fieldOfViewDegrees) || 68, 10, 150) * Math.PI / 360);
  const maxRange = clamp(Number(rangeMetres) || 80, 1, 200);
  const matches = [];

  for (const target of targets) {
    if (!target?.id || !validVector(target.position)) continue;
    const dx = target.position[0] - origin[0];
    const dy = (target.position[1] + 1.1) - origin[1];
    const dz = target.position[2] - origin[2];
    const distance = Math.hypot(dx, dy, dz);
    if (distance < 1 || distance > maxRange) continue;
    const dot = (dx * direction[0] + dy * direction[1] + dz * direction[2]) / distance;
    if (dot < cosineLimit) continue;
    const destination = [target.position[0], target.position[1] + 1.1, target.position[2]];
    if (typeof hasLineOfSight === 'function' && !hasLineOfSight(origin.slice(0, 3), destination, target)) continue;
    matches.push({ target, distance, angleDegrees: Math.acos(clamp(dot, -1, 1)) * 180 / Math.PI });
  }
  return matches.sort((a, b) => a.distance - b.distance);
}

/** Fixed CCTV network, remote pan/tilt/zoom and fictional discoverable POIs. */
export function createCitySurveillanceSystem({
  playerController,
  mapRecords = [],
  targets = CITY_SURVEILLANCE_DISCOVERABLES,
  hasLineOfSight = null,
  onMapRecordsChanged = () => {},
  onStatus = () => {},
  onFeedChanged = () => {},
  onScanEffect = () => {},
  onRemoteDistrictChanged = () => {},
  storage = globalThis.localStorage
} = {}) {
  if (!playerController || typeof playerController.setExternalCameraPose !== 'function') {
    throw new Error('City surveillance requires the player camera controller.');
  }

  const cameras = new Map();
  const targetRecords = targets.map(target => ({ ...target, position: target.position.slice() }));
  const discovered = new Set();
  let activeFeed = null;
  const scanCooldowns = { cctv: 0, drone: 0 };
  let panInput = 0;
  let tiltInput = 0;
  const records = Array.isArray(mapRecords) ? mapRecords : [];

  function createDiscoveryRecord(target, metadata = {}) {
    return {
      id: 'surveillance-' + target.id,
      name: target.name,
      category: target.category || 'landmark',
      position: target.position.slice(),
      district: target.district || 'Naija City',
      enterable: false,
      description: target.description || 'Location identified by the Naija City remote surveillance network.',
      source: 'surveillance',
      signage: false,
      discoveredBy: metadata.discoveredBy || 'Previously discovered',
      ...(Number.isFinite(Number(metadata.discoveryDistanceMetres))
        ? { discoveryDistanceMetres: Number(metadata.discoveryDistanceMetres) } : {})
    };
  }

  try {
    const saved = JSON.parse(storage?.getItem?.(DISCOVERY_STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) for (const id of saved) if (typeof id === 'string') discovered.add(id);
  } catch {}
  const existingMapIds = new Set(records.map(record => record?.id).filter(Boolean));
  let restoredCount = 0;
  for (const target of targetRecords) {
    if (!discovered.has(target.id)) continue;
    const mapRecord = createDiscoveryRecord(target);
    if (existingMapIds.has(mapRecord.id)) continue;
    records.push(mapRecord);
    existingMapIds.add(mapRecord.id);
    restoredCount++;
  }
  if (restoredCount) onMapRecordsChanged(records);

  function status(message, ok = true, extra = {}) {
    const result = { ok, message, ...extra };
    onStatus(message, result);
    return result;
  }

  function registerCamera(camera) {
    if (!camera?.id || !camera.name || !validVector(camera.viewPosition) || !validVector(camera.interactionPosition)) {
      throw new TypeError('CCTV camera requires an id, name, view position and interaction position.');
    }
    if (cameras.has(camera.id)) throw new Error('Duplicate CCTV camera id: ' + camera.id);
    const record = {
      id: String(camera.id),
      name: String(camera.name),
      district: String(camera.district || 'Naija City'),
      districtKey: String(camera.districtKey || ''),
      viewPosition: camera.viewPosition.slice(0, 3).map(Number),
      interactionPosition: camera.interactionPosition.slice(0, 3).map(Number),
      baseYawRadians: (Number(camera.baseYawDegrees) || 0) * Math.PI / 180,
      pivot: camera.pivot || null,
      signalPercent: clamp(Number(camera.signalPercent) || 90, 25, 100),
      online: camera.online !== false
    };
    cameras.set(record.id, record);
    return { ...record, pivot: undefined };
  }

  function getCameraPose(feed = activeFeed) {
    if (!feed || feed.type !== 'cctv') return null;
    const camera = cameras.get(feed.cameraId);
    if (!camera) return null;
    const yaw = camera.baseYawRadians + feed.panRadians;
    const pitch = feed.tiltRadians;
    const direction = [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
    const position = camera.viewPosition.slice();
    const target = [position[0] + direction[0] * 48, position[1] + direction[1] * 48, position[2] + direction[2] * 48];
    const fov = clamp(70 - feed.zoomLevel * 8, 30, 70);
    return { position, target, fov, yawRadians: yaw, pitchRadians: pitch };
  }

  function applyCameraPose() {
    if (!activeFeed || activeFeed.type !== 'cctv') return false;
    const camera = cameras.get(activeFeed.cameraId);
    if (!camera) return false;
    const pose = getCameraPose(activeFeed);
    if (camera.pivot?.setLocalEulerAngles) {
      camera.pivot.setLocalEulerAngles(activeFeed.tiltRadians * 180 / Math.PI, pose.yawRadians * 180 / Math.PI, 0);
    }
    return playerController.setExternalCameraPose(pose.position, pose.target, pose.fov);
  }

  function cameraList() {
    return [...cameras.values()].map((camera, index) => ({
      id: camera.id,
      name: camera.name,
      district: camera.district,
      online: camera.online,
      signalPercent: camera.signalPercent,
      number: index + 1
    }));
  }

  function feedSnapshot() {
    if (!activeFeed) return null;
    if (activeFeed.type === 'drone') return { ...activeFeed };
    const camera = cameras.get(activeFeed.cameraId);
    if (!camera) return null;
    return {
      type: 'cctv', cameraId: camera.id, name: camera.name, district: camera.district,
      signalPercent: camera.signalPercent, cameraNumber: [...cameras.keys()].indexOf(camera.id) + 1,
      cameraCount: cameras.size, panDegrees: Number((activeFeed.panRadians * 180 / Math.PI).toFixed(1)),
      tiltDegrees: Number((activeFeed.tiltRadians * 180 / Math.PI).toFixed(1)), zoomLevel: activeFeed.zoomLevel,
      scanCooldown: Number(scanCooldowns.cctv.toFixed(1))
    };
  }

  function setDistrictOnline(district, online) {
    const normalized = String(district || '').toLowerCase();
    let affected = 0;
    for (const camera of cameras.values()) {
      if (camera.district.toLowerCase() !== normalized && camera.id.toLowerCase().split('-')[1] !== normalized) continue;
      camera.online = Boolean(online);
      affected++;
    }
    if (activeFeed?.type === 'cctv') {
      const activeCamera = cameras.get(activeFeed.cameraId);
      if (activeCamera && !activeCamera.online) {
        activeFeed = null; panInput = 0; tiltInput = 0;
        playerController.clearExternalCameraPose?.();
        playerController.setControlEnabled(true);
        playerController.resetCameraAfterVehicle?.();
        onRemoteDistrictChanged(null);
        onFeedChanged(getState());
        status('CCTV LINK LOST · ' + normalized.toUpperCase() + ' NETWORK OFFLINE.', false);
      }
    }
    return { affected, online: Boolean(online) };
  }

  function openCamera(cameraId) {
    const camera = cameras.get(String(cameraId));
    if (!camera) return status('CCTV camera not found.', false);
    if (!camera.online) return status(camera.name + ' · camera offline.', false);
    if (activeFeed?.type === 'drone') return status('Recall the scout drone before switching to a fixed CCTV feed.', false);
    if (!activeFeed) playerController.setControlEnabled(false);
    activeFeed = { type: 'cctv', cameraId: camera.id, panRadians: 0, tiltRadians: 0, zoomLevel: 0 };
    onRemoteDistrictChanged(camera.districtKey || null);
    panInput = 0;
    tiltInput = 0;
    applyCameraPose();
    onFeedChanged(getState());
    status('CCTV LINK ESTABLISHED · ' + camera.name.toUpperCase() + ' · LIVE VIEW', true);
    return { ok: true, feed: feedSnapshot() };
  }

  function closeFeed() {
    if (!activeFeed) return status('No remote camera feed is active.', false);
    const previous = activeFeed;
    activeFeed = null;
    panInput = 0;
    tiltInput = 0;
    playerController.clearExternalCameraPose?.();
    playerController.setControlEnabled(true);
    playerController.resetCameraAfterVehicle?.();
    onRemoteDistrictChanged(null);
    onFeedChanged(getState());
    status('REMOTE FEED CLOSED · returning to player camera.', true);
    return { ok: true, previous };
  }

  function cycleCamera(direction = 1) {
    const online = [...cameras.values()].filter(camera => camera.online);
    if (!online.length) return status('No online CCTV cameras are available.', false);
    const currentIndex = Math.max(0, online.findIndex(camera => camera.id === activeFeed?.cameraId));
    const nextIndex = (currentIndex + (direction < 0 ? -1 : 1) + online.length) % online.length;
    return openCamera(online[nextIndex].id);
  }

  function setPanInput(value = 0, vertical = tiltInput) {
    panInput = clamp(Number(value) || 0, -1, 1);
    tiltInput = clamp(Number(vertical) || 0, -1, 1);
    return Boolean(activeFeed?.type === 'cctv');
  }

  function setZoom(direction = 1) {
    if (activeFeed?.type !== 'cctv') return status('Fixed CCTV zoom is not active.', false);
    activeFeed.zoomLevel = clamp(activeFeed.zoomLevel + (direction < 0 ? -1 : 1), 0, 5);
    applyCameraPose();
    onFeedChanged(getState());
    return { ok: true, zoomLevel: activeFeed.zoomLevel, fov: getCameraPose().fov };
  }

  function storeDiscoveries(detections, sourceName, sourceType) {
    const newDiscoveries = [];
    const known = [];
    for (const detection of detections) {
      const target = detection.target;
      if (discovered.has(target.id)) { known.push(target.id); continue; }
      discovered.add(target.id);
      const record = createDiscoveryRecord(target, {
        discoveredBy: sourceName,
        discoveryDistanceMetres: Number(detection.distance.toFixed(1))
      });
      records.push(record);
      newDiscoveries.push(record);
    }
    if (newDiscoveries.length) {
      try { storage?.setItem?.(DISCOVERY_STORAGE_KEY, JSON.stringify([...discovered])); } catch {}
      onMapRecordsChanged(records);
      onScanEffect?.(newDiscoveries, sourceType);
      status('SCAN COMPLETE · ' + newDiscoveries.length + ' NEW LOCATION' + (newDiscoveries.length === 1 ? '' : 'S') + ' DISCOVERED.', true, { discoveries: newDiscoveries, alreadyKnown: known.length });
    } else {
      status(detections.length ? 'SCAN COMPLETE · all visible locations are already catalogued.' : 'SCAN COMPLETE · no new locations detected in this camera view.', true, { discoveries: [], alreadyKnown: known.length });
    }
    return { ok: true, discoveries: newDiscoveries, alreadyKnown: known.length, detections: detections.length };
  }

  function scanActiveCamera() {
    if (activeFeed?.type !== 'cctv') return status('Open a fixed CCTV feed before scanning.', false);
    if (scanCooldowns.cctv > 0) return status('CCTV SCANNER RECHARGING · ' + scanCooldowns.cctv.toFixed(1) + 's.', false);
    const pose = getCameraPose();
    const detections = findSurveillanceDetections({
      origin: pose.position,
      yawRadians: pose.yawRadians,
      pitchRadians: pose.pitchRadians,
      rangeMetres: 82,
      fieldOfViewDegrees: pose.fov,
      targets: targetRecords,
      hasLineOfSight
    });
    scanCooldowns.cctv = 3.0;
    return storeDiscoveries(detections, cameras.get(activeFeed.cameraId).name, 'cctv');
  }

  function scanFromDrone(droneState) {
    if (!droneState?.active || !validVector(droneState.position)) return status('Deploy the scout drone before scanning.', false);
    if (scanCooldowns.drone > 0) return status('DRONE SCANNER RECHARGING · ' + scanCooldowns.drone.toFixed(1) + 's.', false);
    const detections = findSurveillanceDetections({
      origin: droneState.position,
      yawRadians: Number(droneState.headingRadians) || 0,
      pitchRadians: -0.22,
      rangeMetres: Math.min(55, Number(droneState.maximumRangeMetres) || 55),
      fieldOfViewDegrees: 76,
      targets: targetRecords,
      hasLineOfSight
    });
    scanCooldowns.drone = 3.0;
    return storeDiscoveries(detections, 'Scout Drone', 'drone');
  }

  function update(deltaSeconds) {
    const dt = clamp(Number(deltaSeconds) || 0, 0, 0.05);
    scanCooldowns.cctv = Math.max(0, scanCooldowns.cctv - dt);
    scanCooldowns.drone = Math.max(0, scanCooldowns.drone - dt);
    if (activeFeed?.type !== 'cctv') return;
    const previousPan = activeFeed.panRadians;
    const previousTilt = activeFeed.tiltRadians;
    activeFeed.panRadians = clamp(activeFeed.panRadians + panInput * dt * 0.72, -1.08, 1.08);
    activeFeed.tiltRadians = clamp(activeFeed.tiltRadians + tiltInput * dt * 0.48, -0.38, 0.52);
    if (Math.abs(previousPan - activeFeed.panRadians) > 0.0001 || Math.abs(previousTilt - activeFeed.tiltRadians) > 0.0001) applyCameraPose();
  }

  function getState() {
    return {
      active: Boolean(activeFeed),
      activeFeed: feedSnapshot(),
      cameras: cameraList(),
      cameraCount: cameras.size,
      onlineCameraCount: [...cameras.values()].filter(camera => camera.online).length,
      discoveryCount: discovered.size,
      discoveredIds: [...discovered],
      scanCooldown: Number(scanCooldowns.cctv.toFixed(2)),
      scanCooldowns: { cctv: Number(scanCooldowns.cctv.toFixed(2)), drone: Number(scanCooldowns.drone.toFixed(2)) },
      targetCount: targetRecords.length
    };
  }

  return {
    registerCamera, setDistrictOnline, openCamera, closeFeed, cycleCamera, setPanInput, setZoom,
    scanActiveCamera, scanFromDrone, update, getState
  };
}
