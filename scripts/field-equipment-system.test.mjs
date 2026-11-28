import assert from 'node:assert/strict';
import {
  FIELD_EQUIPMENT_DEFINITIONS,
  FIELD_EQUIPMENT_DEFAULT_INVENTORY,
  FIELD_EQUIPMENT_DEFAULT_SLOTS,
  normalizeFieldEquipmentInventory,
  stepDroppedFieldProp,
  stepScoutDrone
} from '../src/field-equipment-system.js';

assert.equal(FIELD_EQUIPMENT_DEFINITIONS.length, 4);
assert.equal(new Set(FIELD_EQUIPMENT_DEFINITIONS.map(item => item.id)).size, 4);
assert.deepEqual(FIELD_EQUIPMENT_DEFAULT_SLOTS, ['field-radio', 'survey-beacon', 'repair-kit', 'scout-drone']);

const inventory = normalizeFieldEquipmentInventory({ 'field-radio': 5, 'survey-beacon': -2, 'repair-kit': 'bad' });
assert.equal(inventory['field-radio'], 1, 'radio count is capped');
assert.equal(inventory['survey-beacon'], 0, 'negative counts are clamped');
assert.equal(inventory['repair-kit'], 0, 'invalid counts become zero');
assert.equal(normalizeFieldEquipmentInventory()['survey-beacon'], FIELD_EQUIPMENT_DEFAULT_INVENTORY['survey-beacon'], 'missing counts use starter inventory');
assert.equal(normalizeFieldEquipmentInventory()['scout-drone'], 1, 'new game starts with one reusable scout drone');

const airborne = stepDroppedFieldProp({
  position: [0, 1, 0], velocity: [1, 2, 0], rotationY: 0, spin: 60, radius: 0.16
}, 1 / 30);
assert.ok(airborne.position[0] > 0, 'dropped props move horizontally');
assert.ok(airborne.velocity[1] < 2, 'gravity reduces upward velocity');
assert.ok(airborne.rotationY > 0, 'dropped props rotate during flight');

const bounced = stepDroppedFieldProp({
  position: [0, 0.12, 0], velocity: [0.2, -3, 0], rotationY: 0, spin: 0, radius: 0.16
}, 0.05, { point: [0, 0, 0] });
assert.equal(bounced.position[1], 0.16, 'ground contact keeps the prop above the floor');
assert.equal(bounced.bounceCount, 1, 'the first impact has one damped bounce');
assert.ok(bounced.velocity[1] > 0, 'the damped bounce moves upward');

const settled = stepDroppedFieldProp({
  ...bounced, velocity: [0.01, -0.1, 0.01], settled: false
}, 0.05, { point: [0, 0, 0] });
assert.equal(settled.velocity[1], 0, 'small impacts settle without repeated bouncing');
assert.equal(settled.settled, true, 'resting props stop consuming update work');

const capped = stepDroppedFieldProp({
  position: [0, 1, 0], velocity: [0, 0, 0], rotationY: 0, spin: 0, radius: 0.16
}, 1);
const singleStep = stepDroppedFieldProp({
  position: [0, 1, 0], velocity: [0, 0, 0], rotationY: 0, spin: 0, radius: 0.16
}, 0.05);
assert.deepEqual(capped.position, singleStep.position, 'large frame deltas are capped for mobile stability');

const droneStart = {
  position: [0, 8, 0], homePosition: [0, 0, 0], headingRadians: 0, battery: 100
};
const droneForward = stepScoutDrone(droneStart, 0.05, { x: 0, y: 1, vertical: 1 });
assert.ok(droneForward.position[2] < 0, 'forward input moves the drone along its heading');
assert.ok(droneForward.position[1] > droneStart.position[1], 'vertical input raises the drone');
assert.ok(droneForward.battery < 100, 'flight consumes battery');
const droneBack = stepScoutDrone(droneStart, 0.05, { x: 0, y: -1, vertical: -1 });
assert.ok(droneBack.position[2] > 0, 'reverse input moves the drone back');
assert.ok(droneBack.position[1] < droneStart.position[1], 'down input lowers the drone');
const droneFrameCap = stepScoutDrone(droneStart, 1, { x: 1, y: 0, vertical: 0 });
const droneSingleStep = stepScoutDrone(droneStart, 0.05, { x: 1, y: 0, vertical: 0 });
assert.deepEqual(droneFrameCap.position, droneSingleStep.position, 'drone movement caps unusually large frame deltas');
const boundedDrone = stepScoutDrone({ ...droneStart, position: [54.9, 8, 0] }, 0.05, { x: 1, y: 0 });
assert.ok(Math.hypot(boundedDrone.position[0], boundedDrone.position[2]) <= 55.0001, 'drone remains inside its maximum horizontal range');
const lowBatteryDrone = stepScoutDrone({ ...droneStart, battery: 0.001 }, 0.05, { y: 1 });
assert.equal(lowBatteryDrone.battery, 0, 'battery never falls below zero');

console.log('Field equipment tests passed: inventory, four quick slots, drops, frame caps and bounded scout-drone flight.');
