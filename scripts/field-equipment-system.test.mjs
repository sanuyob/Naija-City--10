import assert from 'node:assert/strict';
import {
  FIELD_EQUIPMENT_DEFINITIONS,
  FIELD_EQUIPMENT_DEFAULT_INVENTORY,
  FIELD_EQUIPMENT_DEFAULT_SLOTS,
  normalizeFieldEquipmentInventory,
  stepDroppedFieldProp
} from '../src/field-equipment-system.js';

assert.equal(FIELD_EQUIPMENT_DEFINITIONS.length, 3);
assert.equal(new Set(FIELD_EQUIPMENT_DEFINITIONS.map(item => item.id)).size, 4);
assert.deepEqual(FIELD_EQUIPMENT_DEFAULT_SLOTS, ['field-radio', 'survey-beacon', 'repair-kit']);

const inventory = normalizeFieldEquipmentInventory({ 'field-radio': 5, 'survey-beacon': -2, 'repair-kit': 'bad' });
assert.equal(inventory['field-radio'], 1, 'radio count is capped');
assert.equal(inventory['survey-beacon'], 0, 'negative counts are clamped');
assert.equal(inventory['repair-kit'], 0, 'invalid counts become zero');
assert.equal(inventory['survey-beacon'], FIELD_EQUIPMENT_DEFAULT_INVENTORY['survey-beacon'], 'missing counts use starter inventory');

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

console.log('Field equipment tests passed: definitions, inventory caps, quick slots, drop gravity, bounce, settling and frame-step cap.');
