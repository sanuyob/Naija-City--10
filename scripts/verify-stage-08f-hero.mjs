import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import validator from 'gltf-validator';

const basisRoot=new URL('../public/assets/wasm/basis/',import.meta.url);
const basisFiles=[
  {name:'basis.wasm.js',minimumBytes:50000},
  {name:'basis.wasm.wasm',minimumBytes:500000,wasm:true},
  {name:'basis.js',minimumBytes:1000000}
];
for(const item of basisFiles) {
  const data=await readFile(new URL(item.name,basisRoot));
  assert.ok(data.length>=item.minimumBytes,'PlayCanvas Basis runtime asset is missing or truncated: '+item.name+' ('+data.length+' bytes).');
  if(item.wasm)assert.deepEqual([...data.subarray(0,4)],[0x00,0x61,0x73,0x6d],'PlayCanvas Basis WASM runtime asset has an invalid WebAssembly header.');
}
const manifest=JSON.parse(await readFile(new URL('../public/assets/stage-08e-manifest.json',import.meta.url),'utf8'));
const hero=manifest.models.find(item=>item.id==='yaba-core-01');
assert.ok(hero?.hero,'The Computer Village hero placement is missing from Stage 08E.');
assert.equal(hero.pbrResolution,2048,'Hero must use real 2K PBR source maps.');
assert.ok(hero.textureEncoding.includes('KHR_texture_basisu'),'Hero manifest must declare the KTX2 glTF extension.');
assert.equal(manifest.models.length,48,'The first hero upgrade must preserve all 48 building placements.');

const bytes=await readFile(new URL('../public/assets/buildings/yaba-core-01.glb',import.meta.url));
assert.equal(bytes.readUInt32LE(0),0x46546c67,'Hero output must be a GLB container.');
assert.equal(bytes.readUInt32LE(4),2,'Hero output must be GLB 2.0.');
const jsonLength=bytes.readUInt32LE(12);
const json=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8').trim());
assert.ok(json.extensionsUsed?.includes('KHR_texture_basisu'),'Compressed hero must declare KHR_texture_basisu.');
assert.ok(json.nodes.some(node=>node.name==='LOD0')&&json.nodes.some(node=>node.name==='LOD1')&&json.nodes.some(node=>node.name==='LOD2'),'Hero must retain all three LOD nodes.');
const heroRoot=json.nodes.find(node=>node.name==='COMPUTER_VILLAGE_ELECTRONICS_PLAZA');
assert.ok(heroRoot?.extras?.artistryPass?.includes('articulated pilasters'),'Hero architecture must include the Stage 08F articulation pass.');
assert.ok(heroRoot?.extras?.authoring?.includes('individually authored facade modules'),'Hero authoring metadata must remain accurate.');
const collision=json.nodes.find(node=>node.name==='COLLISION_PROXY');
assert.ok(collision?.extras?.collisionProxy,'Hero must contain a separate simplified collision proxy.');
assert.equal(collision.extras.physicsRuntimeIntegrated,false,'Do not claim the hero collision proxy is connected to live physics.');
assert.equal(json.materials.length,7,'Hero must keep the seven-material building contract.');
assert.ok(json.materials.some(material=>material.name.includes('Concrete034')),'Real concrete/plaster PBR material is missing.');
assert.ok(json.materials.some(material=>material.name.includes('CorrugatedSteel009')),'Real corrugated-steel PBR material is missing.');
const paintedFacadeIndex=json.materials.findIndex(material=>material.name==='painted-facade-PaintedPlaster017');
assert.equal(paintedFacadeIndex,6,'Photogrammetry-based facade must occupy the newly-added geometry material slot 6.');
const signageIndex=json.materials.findIndex(material=>material.name==='computer-village-emissive-signage');
assert.equal(signageIndex,5,'Existing Computer Village signage must retain its original material slot 5.');
assert.ok(json.meshes.flatMap(mesh=>mesh.primitives||[]).some(primitive=>primitive.material===paintedFacadeIndex),'Photogrammetry-based painted facade material must be assigned to actual hero geometry.');
assert.ok(json.meshes.flatMap(mesh=>mesh.primitives||[]).some(primitive=>primitive.material===signageIndex),'Computer Village signage material must remain assigned to its original geometry slot.');
assert.ok(hero.materialSources?.includes('PaintedPlaster017'),'Hero manifest must record PaintedPlaster017 source provenance.');
assert.ok(json.materials.every(material=>material.pbrMetallicRoughness),'Every hero material must use glTF metallic-roughness PBR.');

const ktxImages=json.images.filter(image=>image.mimeType==='image/ktx2');
assert.equal(ktxImages.length,10,'Expected ten embedded KTX2 maps across the three PBR material sets and signage.');
const jsonChunkPadded=jsonLength;
const binaryChunkStart=20+jsonChunkPadded+8;
const ktxMagic=Buffer.from([0xab,0x4b,0x54,0x58,0x20,0x32,0x30,0xbb,0x0d,0x0a,0x1a,0x0a]);
for(const image of ktxImages) {
  assert.ok(Number.isInteger(image.bufferView),'KTX2 image must be embedded in the GLB.');
  const view=json.bufferViews[image.bufferView];
  assert.ok(view&&view.buffer===0,'KTX2 image must reference the embedded GLB buffer.');
  const offset=binaryChunkStart+(view.byteOffset||0);
  assert.deepEqual(bytes.subarray(offset,offset+12),ktxMagic,'Embedded image must have a valid KTX2 identifier.');
  const width=bytes.readUInt32LE(offset+20),height=bytes.readUInt32LE(offset+24);
  assert.ok(width>0&&height>0&&width%4===0&&height%4===0,'KTX2 image dimensions must be valid and divisible by four.');
}
const surfaceMaterials=json.materials.filter(material=>[
  'weathered-plaster-Concrete034',
  'corrugated-roofing-CorrugatedSteel009',
  'painted-steel-frames-and-security-grilles',
  'cast-concrete-trim-and-water-tanks',
  'painted-facade-PaintedPlaster017'
].includes(material.name));
assert.equal(surfaceMaterials.length,5,'Expected five texture-driven PBR surface materials.');
for(const material of surfaceMaterials) {
  assert.ok(material.normalTexture,'Physical surface material must include its normal map: '+material.name);
  assert.ok(material.pbrMetallicRoughness.metallicRoughnessTexture,'Physical surface material must include packed ORM/metallic-roughness data: '+material.name);
}

const signage=json.materials.find(material=>material.name==='computer-village-emissive-signage');
assert.ok(signage?.emissiveTexture,'Computer Village signage must retain its emissive artwork.');
const report=await validator.validateBytes(new Uint8Array(bytes),{uri:'yaba-core-01.glb',format:'glb',writeTimestamp:false,maxIssues:100});
assert.equal(report.issues.numErrors,0,'Khronos validator errors: '+JSON.stringify(report.issues.messages));
console.log('Stage 08F hero validation passed: '+(bytes.length/1024/1024).toFixed(2)+' MiB GLB, '+ktxImages.length+' embedded KTX2 maps, seven PBR materials, three LODs and separate collision proxy.');
