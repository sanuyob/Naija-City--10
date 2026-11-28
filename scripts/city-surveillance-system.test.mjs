import assert from 'node:assert/strict';
import {
  CITY_SURVEILLANCE_DISCOVERABLES,
  createCitySurveillanceSystem,
  findSurveillanceDetections
} from '../src/city-surveillance-system.js';

const targets = [
  { id: 'north', name: 'North Street', category: 'landmark', district: 'Yaba', position: [0, 0, -25], description: 'Street ahead.' },
  { id: 'behind', name: 'Rear Street', category: 'shop', district: 'Yaba', position: [0, 0, 25], description: 'Street behind.' },
  { id: 'far', name: 'Far Depot', category: 'service', district: 'Yaba', position: [0, 0, -120], description: 'Too far away.' },
  { id: 'blocked', name: 'Blocked Shop', category: 'shop', district: 'Yaba', position: [2, 0, -18], description: 'Behind an obstruction.' }
];

const forward = findSurveillanceDetections({ origin: [0, 5, 0], yawRadians: 0, targets });
assert.ok(forward.some(item => item.target.id === 'north'), 'the scanner detects a location in front of the camera');
assert.ok(!forward.some(item => item.target.id === 'behind'), 'the scanner does not reveal locations behind the camera');
assert.ok(!forward.some(item => item.target.id === 'far'), 'the scanner respects maximum range');
const obstructed = findSurveillanceDetections({
  origin: [0, 5, 0], yawRadians: 0, targets,
  hasLineOfSight: (_from, _to, target) => target.id !== 'north'
});
assert.ok(!obstructed.some(item => item.target.id === 'north'), 'line-of-sight occlusion prevents a discovery');
assert.equal(CITY_SURVEILLANCE_DISCOVERABLES.length, 7, 'the city includes seven authored scan discoveries');

const player = {
  controlEnabled: true,
  externalPose: null,
  cameraRestores: 0,
  setControlEnabled(value) { this.controlEnabled = Boolean(value); return this.controlEnabled; },
  setExternalCameraPose(position, target, fov) { this.externalPose = { position, target, fov }; return true; },
  clearExternalCameraPose() { this.externalPose = null; return true; },
  resetCameraAfterVehicle() { this.cameraRestores++; return true; }
};
const storageValues = new Map();
const storage = { getItem: key => storageValues.get(key) || null, setItem: (key, value) => storageValues.set(key, value) };
const pivot = { rotations: [], setLocalEulerAngles(x, y, z) { this.rotations.push([x, y, z]); } };
const mapRecords = [];
const feedChanges = [];
const remoteDistrictChanges = [];
const messages = [];
let effects = 0;
const system = createCitySurveillanceSystem({
  playerController: player,
  mapRecords,
  targets,
  storage,
  onMapRecordsChanged: records => assert.equal(records, mapRecords),
  onFeedChanged: state => feedChanges.push(state.activeFeed?.cameraId || null),
  onRemoteDistrictChanged: key => remoteDistrictChanges.push(key),
  onStatus: message => messages.push(message),
  onScanEffect: discoveries => { effects += discoveries.length; }
});

system.registerCamera({ id: 'cctv-a', name: 'Yaba North Camera', district: 'Yaba', viewPosition: [0, 5, 0], interactionPosition: [0, 0, 0], baseYawDegrees: 0, signalPercent: 96, pivot, districtKey: 'lekki' });
system.registerCamera({ id: 'cctv-b', name: 'Yaba East Camera', district: 'Yaba', viewPosition: [50, 5, 0], interactionPosition: [50, 0, 0], baseYawDegrees: 90, signalPercent: 88, districtKey: 'victoriaIsland' });
assert.equal(system.getState().cameraCount, 2);
assert.equal(system.openCamera('missing').ok, false, 'unknown cameras cannot be opened');
assert.equal(system.openCamera('cctv-a').ok, true);
assert.equal(remoteDistrictChanges.at(-1), 'lekki', 'opening CCTV activates its streamed district');
assert.equal(player.controlEnabled, false, 'remote feed locks player movement');
assert.equal(player.externalPose.fov, 70, 'CCTV opens using the live view camera');
assert.equal(system.getState().activeFeed.name, 'Yaba North Camera');

system.setPanInput(1, 1);
for (let i = 0; i < 20; i++) system.update(0.05);
assert.ok(system.getState().activeFeed.panDegrees > 30, 'held pan control moves the camera head');
assert.ok(system.getState().activeFeed.tiltDegrees > 20, 'held tilt control moves the camera head');
assert.ok(pivot.rotations.length > 1, 'the physical CCTV head follows PTZ movement');
system.setPanInput(0, 0);
assert.equal(system.setZoom(1).fov, 62, 'zoom tightens the view frustum');
for (let i = 0; i < 8; i++) system.setZoom(1);
assert.equal(system.getState().activeFeed.zoomLevel, 5, 'zoom is capped at the optical zoom limit');
assert.equal(system.cycleCamera(1).feed.cameraId, 'cctv-b', 'operators can switch to another connected camera');
assert.equal(remoteDistrictChanges.at(-1), 'victoriaIsland', 'switching cameras changes the active streamed district');
assert.equal(system.cycleCamera(-1).feed.cameraId, 'cctv-a', 'camera selection wraps across the network');

const scan = system.scanActiveCamera();
assert.equal(scan.ok, true);
assert.ok(scan.discoveries.some(item => item.id === 'surveillance-north'), 'the camera scan adds a newly identified map record');
assert.ok(mapRecords.some(item => item.id === 'surveillance-north' && item.source === 'surveillance' && item.signage === false));
assert.equal(effects, scan.discoveries.length, 'each new discovery produces a scan effect');
assert.equal(system.scanActiveCamera().ok, false, 'scanner cooldown prevents immediate repeated scans');
assert.ok(JSON.parse(storageValues.values().next().value).includes('north'), 'discoveries persist locally');
assert.equal(system.closeFeed().ok, true);
assert.equal(remoteDistrictChanges.at(-1), null, 'closing CCTV deactivates the remote district simulation');
assert.equal(player.controlEnabled, true, 'closing the feed restores player movement');
assert.equal(player.externalPose, null, 'closing the feed releases the remote camera');
assert.equal(player.cameraRestores, 1);
assert.equal(feedChanges[0], 'cctv-a');
assert.ok(feedChanges.includes('cctv-b'));
assert.equal(feedChanges.at(-1), null, 'closing the feed notifies the HUD to restore its normal state');

const restoredMapRecords = [];
let restoredMapCallbackCount = 0;
const restoredSystem = createCitySurveillanceSystem({
  playerController: player,
  mapRecords: restoredMapRecords,
  targets,
  storage,
  onMapRecordsChanged: records => { assert.equal(records, restoredMapRecords); restoredMapCallbackCount++; }
});
assert.equal(restoredSystem.getState().discoveryCount, scan.discoveries.length, 'all discovery IDs survive a new game session');
assert.ok(restoredMapRecords.some(item => item.id === 'surveillance-north'), 'saved discoveries are rehydrated into the city map on the next session');
assert.equal(restoredMapCallbackCount, 1, 'the map refreshes when saved discoveries are restored');
assert.equal(restoredMapRecords.length, scan.discoveries.length, 'every saved discovery is rehydrated onto the map');

assert.equal(system.openCamera('cctv-a').ok, true);
const offline = system.setDistrictOnline('Yaba', false);
assert.equal(offline.affected, 2, 'the telecom network switch controls all CCTV devices in its district');
assert.equal(system.getState().onlineCameraCount, 0, 'the district CCTV network is offline during maintenance');
assert.equal(system.getState().activeFeed, null, 'disconnecting the active camera closes its live feed');
assert.equal(player.controlEnabled, true, 'a network outage returns the player to normal controls');
assert.equal(remoteDistrictChanges.at(-1), null, 'network failure deactivates the remote district simulation');
assert.equal(system.openCamera('cctv-a').ok, false, 'offline CCTV cameras cannot be opened');
assert.equal(system.setDistrictOnline('Yaba', true).affected, 2);
assert.equal(system.getState().onlineCameraCount, 2, 'restoring the local network brings its CCTV stations back online');
assert.equal(system.openCamera('cctv-a').ok, true, 'restored CCTV feeds can be opened again');
system.closeFeed();

const droneSystem = createCitySurveillanceSystem({
  playerController: player,
  mapRecords: [],
  targets: [targets[0]],
  storage: { getItem: () => null, setItem: () => {} },
  onStatus: message => messages.push(message)
});
const droneScan = droneSystem.scanFromDrone({ active: true, position: [0, 3.2, 0], headingRadians: 0, maximumRangeMetres: 55 });
assert.equal(droneScan.ok, true, 'the same discovery scanner works from a deployed drone');
assert.equal(droneScan.discoveries.length, 1);
assert.equal(droneSystem.getState().activeFeed, null, 'drone scanning does not open or steal the fixed CCTV feed');
assert.equal(droneSystem.scanFromDrone({ active: false, position: [0, 0, 0] }).ok, false, 'an undeployed drone cannot scan');

console.log('City surveillance tests passed: camera network, PTZ, optical zoom, line-of-sight cone scans, persistent map discoveries, player lock/restore and drone scanning.');
