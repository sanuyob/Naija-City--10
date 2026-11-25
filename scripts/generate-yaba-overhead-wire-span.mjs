import { Document, NodeIO } from '@gltf-transform/core';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const output = resolve('public/assets/yaba-street-library/grab3d/custom/overhead-wire-span.glb');
const document = new Document();
const buffer = document.createBuffer('Yaba overhead wire geometry');
const material = document.createMaterial('Dark insulated cable')
  .setBaseColorFactor([0.035, 0.041, 0.047, 1])
  .setMetallicFactor(0.08)
  .setRoughnessFactor(0.82);

const positions = [];
const normals = [];
const indices = [];
const sides = 7;
const segments = 28;
const radius = 0.014;
const span = 12.0;
const sag = 0.52;
const cableOffsets = [-0.18, 0, 0.18];

for (const offset of cableOffsets) {
  const base = positions.length / 3;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = -span / 2 + span * t;
    const y = -4 * sag * t * (1 - t);
    const dydx = (-4 * sag * (1 - 2 * t)) / span;
    const tangentLength = Math.hypot(1, dydx);
    const normalXY = [-dydx / tangentLength, 1 / tangentLength, 0];
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const nx = normalXY[0] * c;
      const ny = normalXY[1] * c;
      const nz = s;
      positions.push(x + radius * nx, y + radius * ny, offset + radius * nz);
      normals.push(nx, ny, nz);
    }
  }
  const ring = sides + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < sides; j++) {
      const a = base + i * ring + j;
      const b = a + ring;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
}

const mesh = document.createMesh('Three sagging overhead service cables');
const primitive = document.createPrimitive()
  .setAttribute('POSITION', document.createAccessor('positions').setType('VEC3').setArray(new Float32Array(positions)).setBuffer(buffer))
  .setAttribute('NORMAL', document.createAccessor('normals').setType('VEC3').setArray(new Float32Array(normals)).setBuffer(buffer))
  .setIndices(document.createAccessor('indices').setType('SCALAR').setArray(new Uint16Array(indices)).setBuffer(buffer))
  .setMaterial(material);
mesh.addPrimitive(primitive);
const node = document.createNode('Yaba overhead wire span').setMesh(mesh);
document.createScene('Yaba overhead utilities').addChild(node);

await mkdir(dirname(output), { recursive: true });
await new NodeIO().write(output, document);
console.log(`Created ${output}`);
console.log(`Span ${span}m, sag ${sag}m, ${cableOffsets.length} cables, ${segments * sides * cableOffsets.length * 2} triangles`);
