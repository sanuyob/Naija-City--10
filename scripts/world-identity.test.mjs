import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildWorldIdentityRecords } from '../src/world-identity.js';
import { getGidiAuthoredInteriorDefinitions } from '../src/gidi-authored-interiors.js';

const manifest=JSON.parse(readFileSync(new URL('../public/assets/stage-08e-manifest.json',import.meta.url),'utf8'));
const records=buildWorldIdentityRecords({
  stage08EState:{buildings:manifest.models.map(item=>({...item,enterable:false}))},
  stage08NState:{buildings:[
    {id:'eko-shop',name:'Obalende Print & Parcel',role:'shop',kind:'commercial',enterable:true,position:[1131,-3.9,-980],district:'Eko CBD'},
    {id:'eko-office',name:'Finance House Annex',role:'shell',kind:'office',enterable:false,position:[1185,-3.9,-944],district:'Eko CBD'},
    {id:'eko-home',name:'Broad Street Courtyard Flat',role:'home',kind:'residential',enterable:true,position:[1149,-3.9,-980],district:'Eko CBD'}
  ]},
  stage08LState:{activities:[{id:'eko-parcel-depot',title:'Eko Parcel Depot',name:'Parcel Dispatch',center:[1140,-3.9,-935],district:'Eko CBD'}]},
  interiors:getGidiAuthoredInteriorDefinitions()
});
assert.equal(records.filter(r=>r.source==='GIDI 02 REBUILD r106').length,4,'Guest Room 01 must not create a duplicate street POI');
assert.equal(records.find(r=>r.id==='interior-fresh-cut')?.category,'barber');
assert.equal(records.find(r=>r.id==='interior-grand-hotel-lobby')?.category,'hotel');
assert.equal(records.find(r=>r.id==='interior-player-home')?.category,'home');
assert.equal(records.filter(r=>r.source==='stage08E').length,48,'All 48 Yaba building placements must appear in the city atlas');
assert.equal(records.find(r=>r.id==='stage08E-yaba-core-01')?.name,'Computer Village Electronics Plaza');
assert.equal(records.find(r=>r.id==='stage08E-yaba-core-02')?.category,'shop');
assert.equal(records.find(r=>r.id==='stage08E-yaba-core-02')?.enterable,false);
assert.equal(records.find(r=>r.id==='building-eko-shop')?.enterable,true);
assert.equal(records.find(r=>r.id==='building-eko-office')?.enterable,false);
assert.equal(records.find(r=>r.id==='activity-eko-parcel-depot')?.category,'activity');
assert.equal(new Set(records.map(r=>r.id)).size,records.length,'POI ids must be unique');
assert(records.every(r=>Array.isArray(r.position)&&r.position.length===3&&r.position.every(Number.isFinite)));
console.log(JSON.stringify({pass:true,recordCount:records.length,enterable:records.filter(r=>r.enterable).length,categories:[...new Set(records.map(r=>r.category))]},null,2));
