import assert from 'node:assert/strict';
import { DISTRICT_VEHICLE_PROFILES, DISTRICT_VEHICLE_ROSTERS } from '../src/district-vehicle-traffic.js';

const districts = Object.keys(DISTRICT_VEHICLE_ROSTERS);
assert.deepEqual(districts.sort(), ['alimosho', 'ekoAtlantic', 'ekiti', 'lekki', 'victoriaIsland'].sort());
const types = new Set();
let total = 0;
let carCount = 0;
for (const [district, roster] of Object.entries(DISTRICT_VEHICLE_ROSTERS)) {
  assert.equal(roster.length, 10, `${district} should have ten representative traffic vehicles`);
  for (const [type, paint] of roster) {
    assert.ok(DISTRICT_VEHICLE_PROFILES[type], `${district} references unknown vehicle type ${type}`);
    assert.ok(DISTRICT_VEHICLE_PROFILES[type].speed > 0, `${type} needs a positive cruising speed`);
    assert.ok(typeof paint === 'string' && paint.length > 0, `${type} needs a paint variant`);
    types.add(type);
    total++;
    if (DISTRICT_VEHICLE_PROFILES[type].car) carCount++;
  }
}
assert.equal(total, 50);
assert.ok(types.has('saloon') && types.has('suv') && types.has('hatchback') && types.has('taxi'));
assert.ok(types.has('danfo') && types.has('minibus') && types.has('coaster'));
assert.ok(types.has('keke') && types.has('okada') && types.has('tractor'));
assert.ok(types.has('pickup') && types.has('light-truck') && types.has('delivery-van'));
assert.ok(types.has('ambulance') && types.has('police-suv'));
assert.ok(carCount / total >= 0.60, `Private/road cars should remain the majority: ${carCount}/${total}`);
assert.ok(DISTRICT_VEHICLE_ROSTERS.ekoAtlantic.filter(([type]) => DISTRICT_VEHICLE_PROFILES[type].car).length >= 7);
assert.ok(DISTRICT_VEHICLE_ROSTERS.ekiti.some(([type]) => type === 'tractor'));
assert.ok(DISTRICT_VEHICLE_ROSTERS.alimosho.some(([type]) => type === 'danfo'));
console.log(JSON.stringify({ result: 'PASS', districts: districts.length, vehicles: total, uniqueTypes: types.size, carCount, carShare: `${(carCount / total * 100).toFixed(1)}%`, byDistrict: Object.fromEntries(Object.entries(DISTRICT_VEHICLE_ROSTERS).map(([key, items]) => [key, items.map(([type]) => type)])) }, null, 2));
