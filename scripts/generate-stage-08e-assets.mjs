import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = join(root, 'public/assets/buildings');
const materialNames = ['weathered-plaster', 'cast-concrete', 'tinted-glass', 'painted-metal', 'roofing', 'timber'];
const materialConfig = [
  { color:[0.78,0.70,0.57,1], roughness:0.92, metal:0 },
  { color:[0.57,0.57,0.53,1], roughness:0.96, metal:0 },
  { color:[0.24,0.39,0.44,1], roughness:0.24, metal:0.12 },
  { color:[0.19,0.23,0.24,1], roughness:0.58, metal:0.52 },
  { color:[0.27,0.30,0.28,1], roughness:0.84, metal:0.08 },
  { color:[0.35,0.20,0.11,1], roughness:0.78, metal:0 }
];
const palette = [
  [0.78,0.67,0.52], [0.70,0.76,0.70], [0.76,0.72,0.62],
  [0.63,0.70,0.75], [0.83,0.78,0.66], [0.69,0.62,0.54]
];
const u32 = n => { const b=Buffer.alloc(4); b.writeUInt32LE(n>>>0); return b; };
function crc32(buffer) {
  let c=0xffffffff;
  for (const byte of buffer) { c^=byte; for(let k=0;k<8;k++) c=(c>>>1)^((c&1)?0xedb88320:0); }
  return (c^0xffffffff)>>>0;
}
function pngChunk(type,data) {
  const name=Buffer.from(type), body=Buffer.concat([name,data]);
  return Buffer.concat([u32(data.length).reverse(),body,u32(crc32(body)).reverse()]);
}
function texturePng(index, normal=false) {
  const size=64, raw=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++) {
    const row=y*(size*4+1); raw[row]=0;
    for(let x=0;x<size;x++) {
      const i=row+1+x*4, wave=Math.sin((x+index*7)*0.19)*4+Math.sin((y+index*11)*0.13)*3;
      const noise=((x*17+y*29+index*31)%13)-6;
      if(normal) { raw[i]=128+noise; raw[i+1]=128+Math.round(wave); raw[i+2]=252; raw[i+3]=255; }
      else {
        const c=materialConfig[index]?.color||[0.7,0.7,0.7,1];
        raw[i]=Math.max(0,Math.min(255,Math.round(c[0]*255+wave+noise)));
        raw[i+1]=Math.max(0,Math.min(255,Math.round(c[1]*255+wave+noise)));
        raw[i+2]=Math.max(0,Math.min(255,Math.round(c[2]*255+wave+noise)));
        raw[i+3]=255;
      }
    }
  }
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(size,0); ihdr.writeUInt32BE(size,4); ihdr[8]=8; ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',ihdr),pngChunk('IDAT',deflateSync(raw)),pngChunk('IEND',Buffer.alloc(0))]);
}
function box(groups, x,y,z, sx,sy,sz, mat) {
  const faces=[
    {n:[0,0,1],p:[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]},
    {n:[0,0,-1],p:[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]},
    {n:[1,0,0],p:[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]},
    {n:[-1,0,0],p:[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]},
    {n:[0,1,0],p:[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]},
    {n:[0,-1,0],p:[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]}
  ];
  const g=groups[mat] ||= {p:[],n:[],uv:[],i:[]};
  for(const f of faces) {
    const base=g.p.length/3;
    for(let k=0;k<4;k++) {
      const v=f.p[k]; g.p.push(x+v[0]*sx/2,y+v[1]*sy/2,z+v[2]*sz/2);
      g.n.push(...f.n); g.uv.push(k===1||k===2?1:0,k>=2?1:0);
    }
    g.i.push(base,base+1,base+2,base,base+2,base+3);
  }
}
function design(kind,w,h,d,seed,lod) {
  const groups={}, wall=seed%palette.length, trim=(seed+1)%palette.length;
  const full=lod===0, mid=lod===1;
  box(groups,0,h/2,0,w,h,d,0);
  box(groups,0,h+0.12,0,w+0.28,0.24,d+0.28,1);
  if(full) {
    // Roof parapets and rainwater edge details.
    for(const z of [-d/2,d/2]) box(groups,0,h+0.42,z,w+0.24,0.42,0.16,1);
    for(const x of [-w/2,w/2]) box(groups,x,h+0.42,0,0.16,0.42,d,1);
    box(groups,-w*0.12,h+0.72,d*0.12,Math.min(1.2,w*0.24),0.18,Math.min(1.2,d*0.2),4);
  }
  const floors=kind==='mixed-use'?3:kind==='residential'?2:Math.max(1,Math.round(h/4.2));
  const front=-w/2-0.055;
  const floorHeight=h/floors;
  // Ground-floor shopfront, security shutter, entrance and fascia.
  if(kind!=='residential') {
    box(groups,front,1.48,-d*0.12,0.12,1.65,d*0.52,2);
    box(groups,front-0.08,1.48,d*0.25,0.12,2.25,d*0.19,3);
    box(groups,front-0.14,2.72,0,0.78,0.16,d*0.92,3);
    box(groups,front-0.10,3.45,0,0.18,0.78,d*0.92,3);
    if(full) {
      for(const z of [-d*0.36,d*0.36]) {
        box(groups,front-0.16,1.55,z,0.10,1.9,0.10,1);
        box(groups,front-0.16,1.55,z,0.10,1.55,0.045,3);
      }
      box(groups,front-0.2,1.25,-d*0.12,0.08,1.9,Math.min(1.2,d*0.22),5);
    }
  }
  const upperStart=kind==='commercial'?3.9:3.2;
  const upperFloors=kind==='commercial'?Math.max(0,floors-1):floors-1;
  for(let floor=0;floor<upperFloors;floor++) {
    const y=upperStart+floor*floorHeight;
    const windowCount=full?3:2;
    for(let j=0;j<windowCount;j++) {
      const z=-d*0.32+j*(d*0.32);
      box(groups,front-0.07,y,z,0.10,Math.min(1.2,floorHeight*0.42),Math.min(1.55,d*0.18),2);
      if(full) {
        box(groups,front-0.14,y,z,0.07,Math.min(1.35,floorHeight*0.48),0.07,3);
        box(groups,front-0.14,y,z,0.07,0.07,Math.min(1.6,d*0.2),3);
      }
    }
    if(kind!=='commercial') {
      box(groups,front-0.58,y-0.55,0,1.05,0.16,d*0.68,1);
      box(groups,front-1.08,y-0.08,0,0.09,0.92,d*0.68,3);
      if(full) for(let j=-2;j<=2;j++) box(groups,front-1.08,y-0.08,j*d*0.12,0.07,0.88,0.045,3);
    }
  }
  if(full) {
    // AC condensers, external service pipes, entrance timber and rooftop tanks.
    for(const z of [-d*0.34,d*0.34]) box(groups,front-0.42,Math.min(h-0.4,3.9),z,0.55,0.48,0.62,3);
    box(groups,front-0.18,1.1,kind==='residential'?d*0.32:0,0.12,2.1,0.9,5);
    box(groups,w*0.31,h+0.65,d*0.25,0.95,1.2,0.95,3);
    box(groups,w*0.31,h+1.29,d*0.25,0.72,0.12,0.72,4);
    if(kind==='mixed-use') {
      box(groups,front-0.72,4.05,0,1.2,0.14,d*0.82,4);
      box(groups,front-1.1,4.55,0,0.08,0.85,d*0.82,3);
    }
  }
  // Small individual colour/finish variation, while retaining shared material slots.
  if(lod===0) {
    box(groups,front-0.12,0.28,0,0.16,0.48,d*0.96,1);
    box(groups,front-0.16,Math.min(h-0.25,3.45),0,0.14,0.62,d*0.86,wall);
    if(seed%3===0) box(groups,front-0.28,2.85,0,0.9,0.12,d*0.96,trim);
  }
  return groups;
}
function appendAligned(chunks, bytes) {
  const length=chunks.reduce((n,b)=>n+b.length,0), pad=(4-length%4)%4;
  if(pad) chunks.push(Buffer.alloc(pad));
  const offset=chunks.reduce((n,b)=>n+b.length,0);
  chunks.push(Buffer.from(bytes));
  return {byteOffset:offset,byteLength:bytes.length};
}
function makeGlb(kind,w,h,d,seed) {
  const chunks=[],views=[],accessors=[],meshes=[],nodes=[];
  const images=[];
  for(let i=0;i<materialNames.length;i++) {
    const png=texturePng(i);
    const view=appendAligned(chunks,png); view.target=undefined; views.push(view);
    images.push({bufferView:views.length-1,mimeType:'image/png',name:materialNames[i]+'-embedded'});
  }
  const normalPng=texturePng(1,true), normalView=appendAligned(chunks,normalPng);
  views.push(normalView); images.push({bufferView:views.length-1,mimeType:'image/png',name:'subtle-normal-embedded'});
  const materials=materialConfig.map((m,i)=>({name:materialNames[i],pbrMetallicRoughness:{baseColorFactor:m.color,baseColorTexture:{index:i},metallicFactor:m.metal,roughnessFactor:m.roughness},normalTexture:{index:6,scale:0.18}}));
  const textures=materialNames.map((name,i)=>({sampler:0,source:i,name:name+'-texture'}));
  textures.push({sampler:0,source:6,name:'shared-normal'});
  const addMesh=(groups,name)=>{
    const primitives=[];
    for(const [mat,g] of Object.entries(groups)) {
      if(!g.i.length) continue;
      const position=Float32Array.from(g.p), normal=Float32Array.from(g.n), uv=Float32Array.from(g.uv), indices=Uint16Array.from(g.i);
      const posView=appendAligned(chunks,Buffer.from(position.buffer)); views.push({...posView,target:34962});
      const posIndex=accessors.push({bufferView:views.length-1,componentType:5126,count:position.length/3,type:'VEC3',min:[Math.min(...g.p.filter((_,i)=>i%3===0)),Math.min(...g.p.filter((_,i)=>i%3===1)),Math.min(...g.p.filter((_,i)=>i%3===2))],max:[Math.max(...g.p.filter((_,i)=>i%3===0)),Math.max(...g.p.filter((_,i)=>i%3===1)),Math.max(...g.p.filter((_,i)=>i%3===2))]})-1;
      const normView=appendAligned(chunks,Buffer.from(normal.buffer)); views.push({...normView,target:34962});
      const normIndex=accessors.push({bufferView:views.length-1,componentType:5126,count:normal.length/3,type:'VEC3'})-1;
      const uvView=appendAligned(chunks,Buffer.from(uv.buffer)); views.push({...uvView,target:34962});
      const uvIndex=accessors.push({bufferView:views.length-1,componentType:5126,count:uv.length/2,type:'VEC2'})-1;
      const idxView=appendAligned(chunks,Buffer.from(indices.buffer)); views.push({...idxView,target:34963});
      const idxIndex=accessors.push({bufferView:views.length-1,componentType:5123,count:indices.length,type:'SCALAR',min:[0],max:[indices.length?Math.max(...g.i):0]})-1;
      primitives.push({attributes:{POSITION:posIndex,NORMAL:normIndex,TEXCOORD_0:uvIndex},indices:idxIndex,material:Number(mat),mode:4});
    }
    const meshIndex=meshes.push({name,primitives})-1;
    return meshIndex;
  };
  const lodNodes=[];
  for(let lod=0;lod<3;lod++) {
    const mesh=addMesh(design(kind,w,h,d,seed,lod),'building-'+kind+'-lod'+lod);
    const nodeIndex=nodes.push({name:'LOD'+lod,mesh,extras:{screenDistanceMeters:[0,75,145][lod]}})-1;
    lodNodes.push(nodeIndex);
  }
  const collisionGroups={}; box(collisionGroups,0,h/2,0,w*0.94,h,d*0.94,0);
  const collisionMesh=addMesh(collisionGroups,'collision-proxy');
  const collisionNode=nodes.push({name:'COLLISION_PROXY',mesh:collisionMesh,extras:{collisionProxy:true,render:false}})-1;
  nodes.push({name:'BuildingRoot',children:[...lodNodes,collisionNode],extras:{kind,units:'meters',frontAxis:'-X',lods:3}});
  const json={asset:{version:'2.0',generator:'Naija City Stage 08E curated building asset pipeline'},scene:0,scenes:[{nodes:[nodes.length-1]}],nodes,meshes,materials,images,textures,samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],buffers:[{byteLength:chunks.reduce((n,b)=>n+b.length,0)}],bufferViews:views,accessors};
  const jsonBytes=Buffer.from(JSON.stringify(json));
  const jsonPad=(4-jsonBytes.length%4)%4, bin=Buffer.concat(chunks), binPad=(4-bin.length%4)%4;
  const jp=Buffer.concat([jsonBytes,Buffer.alloc(jsonPad,0x20)]), bp=Buffer.concat([bin,Buffer.alloc(binPad)]);
  const total=12+8+jp.length+8+bp.length;
  return Buffer.concat([u32(0x46546c67),u32(2),u32(total),u32(jp.length),u32(0x4e4f534a),jp,u32(bp.length),u32(0x004e4942),bp]);
}
const placements=[];
let index=0;
for(let i=0;i<16;i++) {
  const z=-82+i*9.5, hL=4+(i%3)*1.3, hR=4.5+((i+1)%3)*1.1;
  for(const [side,x,bz,h] of [[-1,-9.2,z,hL],[1,9.2,z-2,hR]]) {
    const mixed=(i%4===0 && side===-1);
    placements.push({id:'yaba-core-'+String(index+1).padStart(2,'0'),kind:mixed?'mixed-use':'commercial',position:[x,0,bz],rotationY:side<0?180:0,size:[5.2,Math.max(h,mixed?7.4:h),6.8],seed:index++});
  }
}
const shopZ=[-160,-65,62,153];
for(const side of [-1,1]) shopZ.forEach((z,i)=>placements.push({id:'expansion-shop-'+String(index+1).padStart(2,'0'),kind:i===1?'mixed-use':'commercial',position:[side*20.5,0,z],rotationY:side<0?180:0,size:[8.4,Math.max(5.2+(i%2)*1.1,i===1?7.4:0),13.5],seed:index++}));
const homeZ=[-155,-72,65,150];
for(const side of [-1,1]) homeZ.forEach((z,i)=>placements.push({id:'neighbourhood-home-'+String(index+1).padStart(2,'0'),kind:'residential',position:[side*42.5,0,z],rotationY:side<0?180:0,size:[9.5,4.1+(i%3)*0.45,14.5],seed:index++}));
await mkdir(outDir,{recursive:true});
const models=[];
for(const item of placements) {
  const [w,h,d]=item.size, filename=item.id+'.glb';
  const bytes=makeGlb(item.kind,w,h,d,item.seed);
  await writeFile(join(outDir,filename),bytes);
  models.push({...item,district:(item.position[0]<0?'west':'east')+'-'+(item.position[2]<0?'north':'south'),url:'/assets/buildings/'+filename,bytes:bytes.length,lodDistances:[75,145],collision:'COLLISION_PROXY'});
}
const manifest={stage:'08E',format:'glTF 2.0 binary',units:'meters',frontAxis:'-X',textureEncoding:'embedded PNG; Basis/KTX2 compression is a remaining optimization task',lods:['LOD0','LOD1','LOD2'],streaming:{loadRadius:150,unloadRadius:210,maxConcurrentLoads:2},sharedMaterials:materialNames,models};
await writeFile(join(root,'public/assets/stage-08e-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Stage 08E asset generation complete:',models.length,'individual GLB buildings;',models.reduce((n,m)=>n+m.bytes,0),'bytes total.');
