import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.cache', 'stage-08f');
const buildingDir = join(root, 'public', 'assets', 'buildings');
const manifestPath = join(root, 'public', 'assets', 'stage-08e-manifest.json');
const assetId = 'yaba-core-01';
const heroFile = assetId + '.glb';
const cacheVersion = 'computer-village-plaza-pbr-v3-architectural-articulation';
const outputCache = join(cacheDir, 'computer-village-plaza.ktx2.glb');
const markerPath = join(cacheDir, 'computer-village-plaza-cache.json');
const basisCacheDir = join(cacheDir, 'basis');
const basisPublicDir = join(root, 'public', 'assets', 'wasm', 'basis');
const basisRuntimeFiles = [
  {
    file: 'basis.wasm.js',
    url: 'https://raw.githubusercontent.com/playcanvas/engine/v2.24.0/examples/assets/wasm/basis/basis.wasm.js',
    minimumBytes: 50000
  },
  {
    file: 'basis.wasm.wasm',
    url: 'https://raw.githubusercontent.com/playcanvas/engine/v2.24.0/examples/assets/wasm/basis/basis.wasm.wasm',
    minimumBytes: 500000,
    wasm: true
  },
  {
    file: 'basis.js',
    url: 'https://raw.githubusercontent.com/playcanvas/engine/v2.24.0/examples/assets/wasm/basis/basis.js',
    minimumBytes: 1000000
  }
];

const sources = {
  plaster: {
    id: 'Concrete034',
    page: 'https://ambientcg.com/view?id=Concrete034',
    zip: 'https://ambientcg.com/get?file=Concrete034_2K-PNG.zip',
    license: 'CC0-1.0',
    attribution: 'Created using Concrete 034 from ambientCG.com, licensed under the Creative Commons CC0 1.0 Universal License.'
  },
  roofing: {
    id: 'CorrugatedSteel009',
    page: 'https://ambientcg.com/view?id=CorrugatedSteel009',
    zip: 'https://ambientcg.com/get?file=CorrugatedSteel009_2K-PNG.zip',
    license: 'CC0-1.0',
    attribution: 'Created using Corrugated Steel 009 from ambientCG.com, licensed under the Creative Commons CC0 1.0 Universal License.'
  },
  cladding: {
    id: 'PaintedPlaster017',
    page: 'https://ambientcg.com/view?id=PaintedPlaster017',
    zip: 'https://ambientcg.com/get?file=PaintedPlaster017_2K-PNG.zip',
    license: 'CC0-1.0',
    attribution: 'Created using Painted Plaster 017 from ambientCG.com, licensed under the Creative Commons CC0 1.0 Universal License.'
  }
};

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

function validateBasisRuntimeFile(file, bytes) {
  if (bytes.length < file.minimumBytes) {
    throw new Error('PlayCanvas Basis runtime file ' + file.file + ' is unexpectedly small (' + bytes.length + ' bytes).');
  }
  if (file.wasm && !Buffer.from(bytes.subarray(0, 4)).equals(Buffer.from([0x00, 0x61, 0x73, 0x6d]))) {
    throw new Error('PlayCanvas Basis WASM file has an invalid WebAssembly magic header.');
  }
}

async function ensureBasisRuntime() {
  await mkdir(basisCacheDir, { recursive: true });
  await mkdir(basisPublicDir, { recursive: true });
  for (const file of basisRuntimeFiles) {
    const cachePath = join(basisCacheDir, file.file);
    const publicPath = join(basisPublicDir, file.file);
    let bytes = null;

    if (await exists(cachePath)) {
      try {
        bytes = new Uint8Array(await readFile(cachePath));
        validateBasisRuntimeFile(file, bytes);
      } catch {
        bytes = null;
      }
    }

    if (!bytes) {
      const response = await fetch(file.url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(120000)
      });
      if (!response.ok) {
        throw new Error('Could not download the pinned PlayCanvas v2.24.0 Basis runtime file ' + file.file + ': HTTP ' + response.status);
      }
      bytes = new Uint8Array(await response.arrayBuffer());
      validateBasisRuntimeFile(file, bytes);
      await writeFile(cachePath, bytes);
    }

    await copyFile(cachePath, publicPath);
    console.log('PlayCanvas Basis runtime ready: ' + file.file + ' (' + bytes.length + ' bytes).');
  }
}

async function downloadZip(source, cacheName) {
  const path = join(cacheDir, cacheName);
  if (await exists(path)) return new Uint8Array(await readFile(path));
  const response = await fetch(source.zip, { signal: AbortSignal.timeout(180000), redirect: 'follow' });
  if (!response.ok) throw new Error('PBR source download failed for ' + source.id + ': HTTP ' + response.status);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 100000 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error('PBR source for ' + source.id + ' did not return a ZIP archive.');
  }
  await writeFile(path, bytes);
  return bytes;
}

function unzipPngEntries(zipBytes) {
  const zip = Buffer.from(zipBytes);
  const minimum = Math.max(0, zip.length - 65557);
  let eocd = -1;
  for (let i = zip.length - 22; i >= minimum; i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ZIP central directory was not found.');
  const count = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid ZIP central directory entry.');
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    offset += 46 + nameLength + extraLength + commentLength;
    if (!/\.png$/i.test(name)) continue;
    if (zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('Invalid local ZIP header for ' + name);
    const localNameLength = zip.readUInt16LE(localOffset + 26);
    const localExtraLength = zip.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = zip.subarray(start, start + compressedSize);
    let data;
    if (method === 0) data = Buffer.from(compressed);
    else if (method === 8) data = inflateRawSync(compressed);
    else throw new Error('Unsupported ZIP compression method ' + method + ' for ' + name);
    entries.set(name, data);
  }
  if (!entries.size) throw new Error('PBR ZIP contained no PNG maps.');
  return entries;
}

function getMap(entries, assetIdValue, candidates, description) {
  const names = [...entries.keys()];
  const found = names.find(name => {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized.includes(assetIdValue.toLowerCase()) &&
      normalized.includes('2k') &&
      candidates.some(candidate => normalized.includes(candidate));
  });
  if (!found) {
    throw new Error('Could not find ' + description + ' 2K PNG for ' + assetIdValue +
      '. Archive entries: ' + names.slice(0, 24).join(', '));
  }
  return { name: found, bytes: entries.get(found) };
}

function readPng(map, label) {
  const png = PNG.sync.read(map.bytes);
  const longestSide = Math.max(png.width, png.height);
  const shortestSide = Math.min(png.width, png.height);
  if (longestSide !== 2048 || shortestSide < 512 || png.width % 4 !== 0 || png.height % 4 !== 0) {
    throw new Error(label + ' must be a 2K source map with dimensions divisible by four; received ' + png.width + 'x' + png.height);
  }
  return png;
}

function flipNormalGreen(png) {
  for (let i = 1; i < png.data.length; i += 4) png.data[i] = 255 - png.data[i];
  return png;
}

function packOrm(roughness, metalness, ao) {
  const width = roughness.width, height = roughness.height;
  for (const map of [metalness, ao].filter(Boolean)) {
    if (map.width !== width || map.height !== height) {
      throw new Error('PBR source maps must share dimensions before ORM packing.');
    }
  }
  const packed = new PNG({ width, height });
  for (let i = 0; i < packed.data.length; i += 4) {
    packed.data[i] = ao ? ao.data[i] : 255;
    packed.data[i + 1] = roughness.data[i];
    packed.data[i + 2] = metalness ? metalness.data[i] : 0;
    packed.data[i + 3] = 255;
  }
  return PNG.sync.write(packed);
}

function drawRect(png, x, y, width, height, color) {
  for (let py = Math.max(0, y); py < Math.min(png.height, y + height); py++) {
    for (let px = Math.max(0, x); px < Math.min(png.width, x + width); px++) {
      const i = (py * png.width + px) * 4;
      png.data[i] = color[0]; png.data[i + 1] = color[1];
      png.data[i + 2] = color[2]; png.data[i + 3] = color[3] ?? 255;
    }
  }
}

const font = {
  A:'01110/10001/10001/11111/10001/10001/10001',
  B:'11110/10001/10001/11110/10001/10001/11110',
  C:'01111/10000/10000/10000/10000/10000/01111',
  D:'11110/10001/10001/10001/10001/10001/11110',
  E:'11111/10000/10000/11110/10000/10000/11111',
  F:'11111/10000/10000/11110/10000/10000/10000',
  G:'01111/10000/10000/10111/10001/10001/01111',
  H:'10001/10001/10001/11111/10001/10001/10001',
  I:'111/010/010/010/010/010/111',
  J:'00111/00010/00010/00010/10010/10010/01100',
  K:'10001/10010/10100/11000/10100/10010/10001',
  L:'10000/10000/10000/10000/10000/10000/11111',
  M:'10001/11011/10101/10101/10001/10001/10001',
  N:'10001/11001/10101/10011/10001/10001/10001',
  O:'01110/10001/10001/10001/10001/10001/01110',
  P:'11110/10001/10001/11110/10000/10000/10000',
  Q:'01110/10001/10001/10001/10101/10010/01101',
  R:'11110/10001/10001/11110/10100/10010/10001',
  S:'01111/10000/10000/01110/00001/00001/11110',
  T:'11111/00100/00100/00100/00100/00100/00100',
  U:'10001/10001/10001/10001/10001/10001/01110',
  V:'10001/10001/10001/10001/10001/01010/00100',
  W:'10001/10001/10001/10101/10101/10101/01010',
  X:'10001/10001/01010/00100/01010/10001/10001',
  Y:'10001/10001/01010/00100/00100/00100/00100',
  Z:'11111/00001/00010/00100/01000/10000/11111',
  '0':'01110/10001/10011/10101/11001/10001/01110',
  '1':'00100/01100/00100/00100/00100/00100/01110',
  '2':'01110/10001/00001/00010/00100/01000/11111',
  '3':'11110/00001/00001/01110/00001/00001/11110',
  '4':'00010/00110/01010/10010/11111/00010/00010',
  '5':'11111/10000/10000/11110/00001/00001/11110',
  '6':'01110/10000/10000/11110/10001/10001/01110',
  '7':'11111/00001/00010/00100/01000/01000/01000',
  '8':'01110/10001/10001/01110/10001/10001/01110',
  '9':'01110/10001/10001/01111/00001/00001/01110',
  '|':'010/010/010/010/010/010/010',
  '-':'00000/00000/00000/11111/00000/00000/00000'
};

function textWidth(text, scale, spacing) {
  let width = 0;
  for (const ch of text) width += ((font[ch] || '').split('/')[0]?.length || 3) * scale + spacing;
  return Math.max(0, width - spacing);
}

function drawText(png, text, y, scale, color) {
  const gap = Math.max(2, Math.round(scale * 0.24));
  let x = Math.round((png.width - textWidth(text, scale, gap)) / 2);
  for (const ch of text) {
    if (ch === ' ') { x += Math.round(scale * 3.2); continue; }
    const rows = (font[ch] || font['-']).split('/');
    for (let py = 0; py < rows.length; py++) {
      for (let px = 0; px < rows[py].length; px++) {
        if (rows[py][px] === '1') drawRect(png, x + px * scale, y + py * scale, scale, scale, color);
      }
    }
    x += rows[0].length * scale + gap;
  }
}

function makeSignTexture() {
  const png = new PNG({ width: 1024, height: 256 });
  drawRect(png, 0, 0, 1024, 256, [11, 28, 40, 255]);
  drawRect(png, 12, 12, 1000, 8, [210, 151, 55, 255]);
  drawRect(png, 12, 236, 1000, 8, [210, 151, 55, 255]);
  drawText(png, 'COMPUTER VILLAGE', 55, 8, [247, 233, 199, 255]);
  drawText(png, 'MOBILE | LAPTOP | REPAIRS', 166, 4, [83, 205, 205, 255]);
  return PNG.sync.write(png);
}

const faceDefinitions = [
  { n:[0,0,1], p:[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]] },
  { n:[0,0,-1], p:[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]] },
  { n:[1,0,0], p:[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]] },
  { n:[-1,0,0], p:[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]] },
  { n:[0,1,0], p:[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]] },
  { n:[0,-1,0], p:[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]] }
];

function emptyGroups() {
  return Array.from({ length: 7 }, () => ({ p:[], n:[], uv:[], t:[], i:[] }));
}

function addBox(groups, material, center, size, stretchUv = false) {
  const g = groups[material];
  const [cx,cy,cz] = center, [sx,sy,sz] = size;
  for (const face of faceDefinitions) {
    const points = face.p.map(v => [cx + v[0] * sx / 2, cy + v[1] * sy / 2, cz + v[2] * sz / 2]);
    const a = points[0], b = points[1], d = points[3];
    const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2];
    const vx = d[0]-a[0], vy = d[1]-a[1], vz = d[2]-a[2];
    const uLength = Math.hypot(ux,uy,uz) || 1, vLength = Math.hypot(vx,vy,vz) || 1;
    const uScale = stretchUv ? 1 : uLength * 0.42;
    const vScale = stretchUv ? 1 : vLength * 0.42;
    const tangent = [ux/uLength, uy/uLength, uz/uLength, 1];
    const base = g.p.length / 3;
    for (let k = 0; k < 4; k++) {
      const v = points[k];
      g.p.push(v[0],v[1],v[2]);
      g.n.push(...face.n);
      g.t.push(...tangent);
      g.uv.push((k===1||k===2)?uScale:0,k>=2?vScale:0);
    }
    g.i.push(base,base+1,base+2,base,base+2,base+3);
  }
}

function addSignQuad(groups, x, y0, y1, z0, z1) {
  const g = groups[5], base = g.p.length / 3;
  const points = [[x,y0,z0],[x,y0,z1],[x,y1,z1],[x,y1,z0]];
  for (const p of points) {
    g.p.push(...p); g.n.push(-1,0,0); g.t.push(0,0,1,1);
  }
  g.uv.push(0,0,1,0,1,1,0,1);
  g.i.push(base,base+1,base+2,base,base+2,base+3);
}

function addCylinder(groups, material, center, radius, height, segments = 16) {
  const g = groups[material], [cx,cy,cz] = center, base = g.p.length / 3;
  for (let s = 0; s < segments; s++) {
    const a0 = s / segments * Math.PI * 2, a1 = (s+1) / segments * Math.PI * 2;
    const p0 = [cx+Math.cos(a0)*radius,cy-height/2,cz+Math.sin(a0)*radius];
    const p1 = [cx+Math.cos(a1)*radius,cy-height/2,cz+Math.sin(a1)*radius];
    const p2 = [cx+Math.cos(a1)*radius,cy+height/2,cz+Math.sin(a1)*radius];
    const p3 = [cx+Math.cos(a0)*radius,cy+height/2,cz+Math.sin(a0)*radius];
    const mid = (a0+a1)/2, normal = [Math.cos(mid),0,Math.sin(mid)];
    const tangent = [-Math.sin(mid),0,Math.cos(mid),1];
    const start = g.p.length / 3;
    const points = [p0,p1,p2,p3];
    for (let k=0;k<4;k++) {
      g.p.push(...points[k]); g.n.push(...normal); g.t.push(...tangent);
      g.uv.push(k===1||k===2?(s+1)/segments:s/segments,k>=2?1:0);
    }
    g.i.push(start,start+1,start+2,start,start+2,start+3);
  }
  const capY = [cy-height/2,cy+height/2];
  for (let cap=0;cap<2;cap++) {
    const start=g.p.length/3, ny=cap===0?-1:1;
    g.p.push(cx,capY[cap],cz);g.n.push(0,ny,0);g.t.push(1,0,0,1);g.uv.push(.5,.5);
    for(let s=0;s<=segments;s++) {
      const angle=s/segments*Math.PI*2;
      g.p.push(cx+Math.cos(angle)*radius,capY[cap],cz+Math.sin(angle)*radius);
      g.n.push(0,ny,0);g.t.push(1,0,0,1);g.uv.push(.5+Math.cos(angle)*.5,.5+Math.sin(angle)*.5);
    }
    for(let s=0;s<segments;s++) {
      if(cap===0)g.i.push(start,start+s+2,start+s+1);
      else g.i.push(start,start+s+1,start+s+2);
    }
  }
}

function buildLod(level) {
  const groups = emptyGroups();
  const box = (material,c,s) => addBox(groups,material,c,s);
  const detailed = level === 0;
  const medium = level <= 1;

  // Four-storey structural shell: rear and side masonry, front piers and floor bands.
  box(4,[0,0.25,0],[5.2,0.5,6.8]);
  box(0,[2.47,7.0,0],[0.26,13.5,6.6]);
  box(0,[0,7.0,-3.27],[4.9,13.5,0.26]);
  box(0,[0,7.0,3.27],[4.9,13.5,0.26]);
  for(const z of [-3.08,-1.04,1.04,3.08]) box(4,[-2.42,6.9,z],[0.36,13.4,0.36]);
  for(const y of [3.85,6.95,9.95,13.0]) {
    box(4,[-2.47,y,0],[0.34,0.34,6.8]);
    box(4,[0,y,0],[5.15,0.3,6.7]);
  }
  box(4,[0,13.55,0],[5.25,0.3,6.8]);

  // Ground-floor electronics shops, recessed-looking glazing, roller shutters and canopy.
  box(6,[-2.52,1.75,0],[0.22,2.75,6.25]);
  for(const z of [-1.55,1.55]) {
    box(2,[-2.67,1.75,z],[0.07,2.38,2.48]);
    for(const side of [-1,1]) box(3,[-2.73,1.75,z+side*1.25],[0.12,2.65,0.12]);
    box(3,[-2.73,0.48,z],[0.12,0.12,2.58]);
    box(3,[-2.73,2.98,z],[0.12,0.12,2.58]);
  }
  box(1,[-2.72,1.72,2.8],[0.16,2.35,0.8]);
  box(3,[-2.83,3.34,0],[0.82,0.16,6.55]);
  box(3,[-2.87,3.72,0],[0.16,0.58,6.1]);
  box(3,[-2.86,4.13,0],[0.18,0.13,6.0]);
  addSignQuad(groups,-2.965,3.82,4.34,-2.82,2.82);

  // Upper office floors: paired glazed bays, deep reveals, concrete sills and shading.
  for(let floor=0;floor<3;floor++) {
    const baseY=4.0+floor*3.0, centerY=baseY+1.65;
    // Photogrammetry-based painted-plaster pier between the two glazed office bays.
    box(6,[-2.58,centerY,0],[0.1,1.82,0.54]);
    for(const z of [-1.55,1.55]) {
      box(2,[-2.68,centerY,z],[0.07,1.7,1.55]);
      for(const side of [-1,1]) box(3,[-2.75,centerY,z+side*0.82],[0.12,1.92,0.12]);
      box(3,[-2.75,centerY-0.91,z],[0.12,0.12,1.78]);
      box(3,[-2.75,centerY+0.91,z],[0.12,0.12,1.78]);
      box(4,[-2.74,baseY+0.55,z],[0.38,0.18,1.9]);
      if(medium) box(3,[-2.98,baseY+2.62,z],[0.68,0.14,1.9]);
      if(detailed) {
        for(let bar=-2;bar<=2;bar++) box(3,[-2.79,centerY,z+bar*0.26],[0.08,1.55,0.045]);
        // Small balcony slab, front rail and vertical balusters.
        box(4,[-3.05,baseY+0.25,z],[0.95,0.18,2.12]);
        box(3,[-3.52,baseY+0.79,z],[0.09,0.94,2.12]);
        box(3,[-3.52,baseY+1.25,z],[0.09,0.08,2.12]);
        for(let bar=-4;bar<=4;bar++) box(3,[-3.52,baseY+0.76,z+bar*0.235],[0.08,0.86,0.045]);
      }
    }
    // Stair-core slit window and ventilation louvre on the opposite bay.
    box(2,[-2.67,centerY,2.75],[0.07,1.75,0.38]);
    if(detailed) for(let l=0;l<6;l++) box(3,[-2.77,centerY-0.65+l*0.25,2.75],[0.09,0.035,0.48]);
  }

  // Roof parapet, service core and clearly Nigerian rooftop utilities.
  for(const z of [-3.26,3.26]) box(4,[0,14.25,z],[5.2,1.1,0.22]);
  for(const x of [-2.48,2.48]) box(4,[x,14.25,0],[0.22,1.1,6.5]);
  box(0,[1.15,14.1,0.5],[1.8,0.9,1.6]);
  addCylinder(groups,4,[0.75,15.25,-1.7],0.72,1.45,16);
  addCylinder(groups,4,[1.8,15.08,1.65],0.58,1.1,16);
  box(3,[-2.45,14.0,-2.2],[0.12,0.15,1.35]);

  // External AC condensers, cable trunking, drain pipes and roof equipment.
  for(const y of [5.1,8.1,11.1]) {
    box(3,[2.62,y,2.45],[0.52,0.78,0.72]);
    if(detailed) for(let l=0;l<5;l++) box(3,[2.91,y-0.28+l*0.14,2.45],[0.035,0.035,0.62]);
  }
  for(const x of [1.8,2.0]) box(3,[x,7.0,3.44],[0.06,13.4,0.06]);
  box(3,[2.4,7.0,-3.43],[0.08,13.4,0.08]);
  if(detailed) {
    for(let y=4.7;y<13;y+=1.05) {
      box(1,[2.64,y,-2.35],[0.18,0.08,0.55]);
      box(1,[2.64,y,2.35],[0.18,0.08,0.55]);
    }
    // Rooftop condenser banks, exhaust louvres, solar/service frames and tank guard rails.
    for(const z of [-0.55,0.45]) box(3,[1.7,14.85,z],[0.9,0.72,0.8]);
    for(let bar=0;bar<7;bar++) box(3,[-2.52,14.25,-1.15+bar*0.24],[0.05,0.9,0.04]);
    box(3,[0.8,16.05,-1.7],[1.65,0.08,1.65]);
    box(3,[1.8,15.72,1.65],[1.35,0.08,1.35]);
    // Rainwater downpipe, conduit clips and shop-front security grille.
    box(3,[-2.87,1.8,-3.15],[0.11,3.4,0.11]);
    for(let bar=-4;bar<=4;bar++) box(3,[-2.86,1.75,-1.55+bar*0.3],[0.07,2.45,0.045]);

    // Stage 08F artistry pass: articulated pilasters, service louvres and canopy hardware.
    for(const z of [-2.95,0,2.95]) {
      box(4,[-2.91,8.55,z],[0.16,8.15,0.22]);
      for(const y of [4.2,7.2,10.2]) box(4,[-3.0,y,z],[0.34,0.12,0.3]);
    }
    // Layered storefront shutter ribs and visible awning brackets.
    for(let y=0.62;y<=2.82;y+=0.18) box(3,[-2.82,y,2.8],[0.07,0.035,0.68]);
    for(const z of [-2.7,2.7]) {
      box(3,[-3.12,3.12,z],[0.08,0.56,0.08]);
      box(3,[-3.28,3.28,z],[0.34,0.08,0.08]);
    }
    // Rear service louvre bank, roof plant screening and maintenance access.
    box(3,[2.63,8.0,-2.25],[0.09,2.4,1.2]);
    for(let slat=0;slat<10;slat++) box(3,[2.70,6.95+slat*0.22,-2.25],[0.08,0.045,1.12]);
    for(const z of [-2.8,2.8]) box(4,[1.85,14.35,z],[1.0,0.18,0.18]);
    box(3,[1.45,14.8,-2.5],[1.1,0.08,0.08]);
  }
  return groups;
}

function u32(value) {
  const b=Buffer.alloc(4);b.writeUInt32LE(value>>>0);return b;
}
function crc32(buffer) {
  let c=0xffffffff;
  for(const byte of buffer) { c^=byte;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0); }
  return (c^0xffffffff)>>>0;
}
function pngChunk(type,data) {
  const name=Buffer.from(type),body=Buffer.concat([name,data]);
  return Buffer.concat([u32(data.length).reverse(),body,u32(crc32(body)).reverse()]);
}
function makePngSolid(width,height,color) {
  const png=new PNG({width,height});
  for(let i=0;i<png.data.length;i+=4){png.data[i]=color[0];png.data[i+1]=color[1];png.data[i+2]=color[2];png.data[i+3]=255;}
  return PNG.sync.write(png);
}

function makeGlb(images) {
  const chunks=[],bufferViews=[],accessors=[],meshes=[],nodes=[];
  function append(data,target) {
    const current=chunks.reduce((n,b)=>n+b.length,0),padding=(4-current%4)%4;
    if(padding)chunks.push(Buffer.alloc(padding));
    const byteOffset=chunks.reduce((n,b)=>n+b.length,0);
    chunks.push(Buffer.from(data));
    const view={buffer:0,byteOffset,byteLength:data.length};
    if(target)view.target=target;
    bufferViews.push(view);
    return bufferViews.length-1;
  }
  images.forEach((bytes,index)=>append(bytes));
  const imageDefs=images.map((_,i)=>({bufferView:i,mimeType:'image/png',name:[
    'plaster-base-color','plaster-normal-gl','plaster-orm',
    'corrugated-steel-base-color','corrugated-steel-normal-gl','corrugated-steel-orm',
    'painted-plaster-base-color','painted-plaster-normal-gl','painted-plaster-orm',
    'computer-village-signage'
  ][i]}));
  const textures=images.map((_,i)=>({sampler:0,source:i,name:imageDefs[i].name}));
  function range(values,component) {
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<values.length;i+=component)for(let c=0;c<component;c++){min[c]=Math.min(min[c],values[i+c]);max[c]=Math.max(max[c],values[i+c]);}
    return {min,max};
  }
  function addAccessor(values,type,componentType,target,components) {
    const view=append(Buffer.from(values.buffer,values.byteOffset,values.byteLength),target);
    const accessor={bufferView:view,componentType,count:values.length/components,type};
    if(type==='VEC3'&&components===3){const r=range(values,3);accessor.min=r.min;accessor.max=r.max;}
    if(type==='SCALAR'&&values.length){let max=0;for(const v of values)max=Math.max(max,v);accessor.min=[0];accessor.max=[max];}
    accessors.push(accessor);
    return accessors.length-1;
  }
  function addMesh(groups,name) {
    const primitives=[];
    for(let material=0;material<groups.length;material++) {
      const g=groups[material];if(!g.i.length)continue;
      const p=Float32Array.from(g.p),n=Float32Array.from(g.n),uv=Float32Array.from(g.uv),t=Float32Array.from(g.t);
      const maxIndex=g.i.reduce((a,b)=>Math.max(a,b),0);
      const use32=maxIndex>65535;
      const indices=use32?Uint32Array.from(g.i):Uint16Array.from(g.i);
      const position=addAccessor(p,'VEC3',5126,34962,3);
      const normal=addAccessor(n,'VEC3',5126,34962,3);
      const texcoord=addAccessor(uv,'VEC2',5126,34962,2);
      const tangent=addAccessor(t,'VEC4',5126,34962,4);
      const index=addAccessor(indices,'SCALAR',use32?5125:5123,34963,1);
      primitives.push({attributes:{POSITION:position,NORMAL:normal,TEXCOORD_0:texcoord,TANGENT:tangent},indices:index,material,mode:4});
    }
    const meshIndex=meshes.push({name,primitives})-1;
    return meshIndex;
  }

  const lodIndices=[];
  for(let level=0;level<3;level++) {
    const groups=buildLod(level),children=[];
    for(let material=0;material<groups.length;material++) {
      if(!groups[material].i.length)continue;
      const paddedGroups=Array.from({length:7},(_,index)=>index===material?groups[material]:({p:[],n:[],uv:[],t:[],i:[]}));
      const mesh=addMesh(paddedGroups,'lod'+level+'-'+material);
      children.push(nodes.push({name:'LOD'+level+'-material-'+material,mesh})-1);
    }
    lodIndices.push(nodes.push({name:'LOD'+level,children,extras:{screenDistanceMeters:[0,75,145][level]}})-1);
  }
  const collisionGroups=emptyGroups();
  addBox(collisionGroups,0,[0,8,0],[5.2,16,6.8]);
  const collisionMesh=addMesh(collisionGroups,'computer-village-static-collision-proxy');
  const collisionNode=nodes.push({name:'COLLISION_PROXY',mesh:collisionMesh,extras:{collisionProxy:true,static:true,physicsRuntimeIntegrated:false}})-1;
  const rootNode=nodes.push({
    name:'COMPUTER_VILLAGE_ELECTRONICS_PLAZA',
    children:[...lodIndices,collisionNode],
    extras:{
      archetype:'Computer Village electronics and repair plaza',
      authoring:'procedurally assembled architectural asset with individually authored facade modules and a dedicated articulation pass',
      units:'meters',
      frontAxis:'-X',
      floorCount:4,
      artistryPass:'08F-v3 articulated pilasters, layered shop shutter, canopy brackets, rear service louvres and rooftop plant screening',
      collision:'separate simplified envelope; not yet connected to live physics'
    }
  })-1;

  const materials=[
    {name:'weathered-plaster-Concrete034',pbrMetallicRoughness:{baseColorTexture:{index:0},metallicRoughnessTexture:{index:2},metallicFactor:1,roughnessFactor:1},normalTexture:{index:1,scale:0.72},occlusionTexture:{index:2,strength:1}},
    {name:'corrugated-roofing-CorrugatedSteel009',pbrMetallicRoughness:{baseColorTexture:{index:3},metallicRoughnessTexture:{index:5},metallicFactor:1,roughnessFactor:1},normalTexture:{index:4,scale:0.78},occlusionTexture:{index:5,strength:1}},
    {name:'tinted-shopfront-glass',pbrMetallicRoughness:{baseColorFactor:[0.25,0.43,0.48,1],metallicFactor:0.12,roughnessFactor:0.18},doubleSided:true},
    {name:'painted-steel-frames-and-security-grilles',pbrMetallicRoughness:{baseColorTexture:{index:3},metallicRoughnessTexture:{index:5},metallicFactor:0.72,roughnessFactor:0.58},normalTexture:{index:4,scale:0.55},occlusionTexture:{index:5,strength:0.65}},
    {name:'cast-concrete-trim-and-water-tanks',pbrMetallicRoughness:{baseColorTexture:{index:0},metallicRoughnessTexture:{index:2},baseColorFactor:[0.74,0.72,0.66,1],metallicFactor:0,roughnessFactor:1},normalTexture:{index:1,scale:0.42},occlusionTexture:{index:2,strength:0.85}},
    {name:'computer-village-emissive-signage',pbrMetallicRoughness:{baseColorTexture:{index:9},metallicFactor:0.08,roughnessFactor:0.56},emissiveTexture:{index:9},emissiveFactor:[0.08,0.1,0.1],doubleSided:true},
    {name:'painted-facade-PaintedPlaster017',pbrMetallicRoughness:{baseColorTexture:{index:6},metallicRoughnessTexture:{index:8},metallicFactor:0,roughnessFactor:1},normalTexture:{index:7,scale:0.78},occlusionTexture:{index:8,strength:0.5}}
  ];
  const json={
    asset:{version:'2.0',generator:'Naija City Stage 08F hero architecture and ambientCG PBR pipeline'},
    scene:0,scenes:[{nodes:[rootNode]}],nodes,meshes,materials,images:imageDefs,textures,
    samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],
    buffers:[{byteLength:chunks.reduce((n,b)=>n+b.length,0)}],
    bufferViews,accessors,
    extras:{stage:'08F',hero:true,materialResolution:2048,sourceMaterials:['Concrete034','CorrugatedSteel009','PaintedPlaster017']}
  };
  const jsonBytes=Buffer.from(JSON.stringify(json));
  const jsonPad=(4-jsonBytes.length%4)%4;
  const binary=Buffer.concat(chunks),binaryPad=(4-binary.length%4)%4;
  const jsonChunk=Buffer.concat([jsonBytes,Buffer.alloc(jsonPad,0x20)]);
  const binChunk=Buffer.concat([binary,Buffer.alloc(binaryPad)]);
  const total=12+8+jsonChunk.length+8+binChunk.length;
  return Buffer.concat([u32(0x46546c67),u32(2),u32(total),u32(jsonChunk.length),u32(0x4e4f534a),jsonChunk,u32(binChunk.length),u32(0x004e4942),binChunk]);
}

async function buildHeroSource() {
  const [plasterZip,steelZip,claddingZip]=await Promise.all([
    downloadZip(sources.plaster,'Concrete034_2K-PNG.zip'),
    downloadZip(sources.roofing,'CorrugatedSteel009_2K-PNG.zip'),
    downloadZip(sources.cladding,'PaintedPlaster017_2K-PNG.zip')
  ]);
  const plasterEntries=unzipPngEntries(plasterZip),steelEntries=unzipPngEntries(steelZip),claddingEntries=unzipPngEntries(claddingZip);
  const plasterColor=readPng(getMap(plasterEntries,'Concrete034',['color'],'base color'),'Concrete034 color');
  const plasterNormalMap=getMap(plasterEntries,'Concrete034',['normalgl','normal'],'normal');
  const plasterNormal=readPng(plasterNormalMap,'Concrete034 normal');
  if(plasterNormalMap.name.toLowerCase().includes('normaldx'))flipNormalGreen(plasterNormal);
  const plasterRough=readPng(getMap(plasterEntries,'Concrete034',['roughness'],'roughness'),'Concrete034 roughness');
  for(const map of [plasterNormal,plasterRough])if(map.width!==plasterColor.width||map.height!==plasterColor.height)throw new Error('Concrete034 PBR maps do not share matching dimensions.');
  const plasterOrm=packOrm(plasterRough,null,null);

  const steelColor=readPng(getMap(steelEntries,'CorrugatedSteel009',['color'],'base color'),'CorrugatedSteel009 color');
  const steelNormalMap=getMap(steelEntries,'CorrugatedSteel009',['normalgl','normal'],'normal');
  const steelNormal=readPng(steelNormalMap,'CorrugatedSteel009 normal');
  if(steelNormalMap.name.toLowerCase().includes('normaldx'))flipNormalGreen(steelNormal);
  const steelRough=readPng(getMap(steelEntries,'CorrugatedSteel009',['roughness'],'roughness'),'CorrugatedSteel009 roughness');
  const steelMetal=readPng(getMap(steelEntries,'CorrugatedSteel009',['metalness','metallic'],'metalness'),'CorrugatedSteel009 metalness');
  const steelAo=readPng(getMap(steelEntries,'CorrugatedSteel009',['ambientocclusion','occlusion','_ao'],'ambient occlusion'),'CorrugatedSteel009 ambient occlusion');
  for(const map of [steelNormal,steelRough,steelMetal,steelAo])if(map.width!==steelColor.width||map.height!==steelColor.height)throw new Error('CorrugatedSteel009 PBR maps do not share matching dimensions.');
  const steelOrm=packOrm(steelRough,steelMetal,steelAo);

  const claddingColor=readPng(getMap(claddingEntries,'PaintedPlaster017',['color'],'base color'),'PaintedPlaster017 color');
  const claddingNormalMap=getMap(claddingEntries,'PaintedPlaster017',['normalgl','normal'],'normal');
  const claddingNormal=readPng(claddingNormalMap,'PaintedPlaster017 normal');
  if(claddingNormalMap.name.toLowerCase().includes('normaldx'))flipNormalGreen(claddingNormal);
  const claddingRough=readPng(getMap(claddingEntries,'PaintedPlaster017',['roughness'],'roughness'),'PaintedPlaster017 roughness');
  for(const map of [claddingNormal,claddingRough])if(map.width!==claddingColor.width||map.height!==claddingColor.height)throw new Error('PaintedPlaster017 PBR maps do not share matching dimensions.');
  // This source has no AO or metalness map: pack neutral AO and zero metalness with its real roughness map.
  const claddingOrm=packOrm(claddingRough,null,null);

  const images=[
    PNG.sync.write(plasterColor),PNG.sync.write(plasterNormal),plasterOrm,
    PNG.sync.write(steelColor),PNG.sync.write(steelNormal),steelOrm,
    PNG.sync.write(claddingColor),PNG.sync.write(claddingNormal),claddingOrm,
    makeSignTexture()
  ];
  return makeGlb(images);
}

function compressHero(input, interim, output) {
  const executable=join(root,'node_modules','.bin',process.platform==='win32'?'gltf-transform.cmd':'gltf-transform');
  const commands=[
    ['uastc',input,interim,'--slots','{normalTexture,occlusionTexture,metallicRoughnessTexture}','--level','3','--rdo','--rdo-lambda','0.5','--zstd','18','--mipmaps','--jobs','1'],
    ['etc1s',interim,output,'--quality','255','--mipmaps','--jobs','1']
  ];
  for(const args of commands) {
    const result=spawnSync(executable,args,{cwd:root,encoding:'utf8',stdio:'inherit',maxBuffer:24*1024*1024});
    if(result.error)throw result.error;
    if(result.status!==0)throw new Error('glTF Transform failed: ' + args[0] + ' exited with code ' + result.status);
  }
}

await mkdir(cacheDir,{recursive:true});
await mkdir(buildingDir,{recursive:true});
await ensureBasisRuntime();
let cached=false;
if(await exists(outputCache)&&await exists(markerPath)) {
  try {
    const marker=JSON.parse(await readFile(markerPath,'utf8'));
    cached=marker.version===cacheVersion;
  } catch { cached=false; }
}
if(!cached) {
  const sourceGlb=join(cacheDir,'computer-village-plaza.source.glb');
  const interim=join(cacheDir,'computer-village-plaza.uastc.glb');
  await writeFile(sourceGlb,await buildHeroSource());
  compressHero(sourceGlb,interim,outputCache);
  await writeFile(markerPath,JSON.stringify({version:cacheVersion,sourceIds:[sources.plaster.id,sources.roofing.id,sources.cladding.id],output:'computer-village-plaza.ktx2.glb'})+'\n');
}
await copyFile(outputCache,join(buildingDir,heroFile));

const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const hero=manifest.models.find(item=>item.id===assetId);
if(!hero)throw new Error('Stage 08E manifest is missing required hero placement ' + assetId);
hero.hero=true;
hero.name='Computer Village Electronics Plaza';
hero.size=[6.5,16.1,6.8];
hero.textureEncoding='KTX2 Basis Universal (KHR_texture_basisu)';
hero.pbrMaterials=['weathered-plaster','corrugated-roofing','tinted-shopfront-glass','painted-steel','cast-concrete','painted-facade','signage'];
hero.pbrResolution=2048;
hero.materialSources=[sources.plaster.id,sources.roofing.id,sources.cladding.id];
hero.collision='COLLISION_PROXY';
manifest.textureEncoding='hero pilot KTX2 Basis Universal; remaining 47 GLBs retain Stage 08E embedded PNG maps';
manifest.heroPilot={id:assetId,name:hero.name,textureEncoding:hero.textureEncoding,resolution:2048,materials:hero.pbrMaterials,sourceIds:hero.materialSources,license:'CC0-1.0',collisionProxy:'separate simplified envelope; physics runtime integration pending'};
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
const bytes=(await readFile(join(buildingDir,heroFile))).length;
console.log('Stage 08F hero pilot ready: ' + hero.name + '; 2K CC0 PBR sources; KTX2/Basis GLB; ' + (bytes/1024/1024).toFixed(2) + ' MiB; 48-building manifest preserved.');
