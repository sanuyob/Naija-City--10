import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildWorldIdentityRecords } from '../src/world-identity.js';

const manifest=JSON.parse(readFileSync(new URL('../public/assets/stage-08e-manifest.json',import.meta.url),'utf8'));
const records=buildWorldIdentityRecords({
  stage08EState:{buildings:manifest.models.map(item=>({...item,enterable:false}))}
});

assert.equal(records.filter(record=>record.source==='stage08E').length,48,
  'All 48 retained Yaba/Ikeja Stage 08E building placements must appear in the atlas.');
assert.equal(records.find(record=>record.id==='stage08E-yaba-core-01')?.name,'Computer Village Electronics Plaza');
assert.equal(records.find(record=>record.id==='stage08E-yaba-core-02')?.category,'shop');
assert.equal(records.find(record=>record.id==='stage08E-yaba-core-02')?.enterable,false);
assert.ok(records.some(record=>record.id==='yaba-street-kiosk'));
assert.ok(records.some(record=>record.id==='yaba-bus-stop'));
assert.equal(new Set(records.map(record=>record.id)).size,records.length,'POI ids must be unique.');
assert(records.every(record=>Array.isArray(record.position)&&record.position.length===3&&record.position.every(Number.isFinite)));
assert.ok(records.every(record=>record.district==='Yaba'),'Only retained Yaba Stage 08E buildings and Yaba roadside POIs should be registered.');
console.log(JSON.stringify({pass:true,recordCount:records.length,enterable:records.filter(record=>record.enterable).length,
  categories:[...new Set(records.map(record=>record.category))]},null,2));
