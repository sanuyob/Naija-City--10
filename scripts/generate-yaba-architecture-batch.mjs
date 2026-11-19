import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = join(root, 'public/assets/stage-08e-manifest.json');
const curatedDir = join(root, 'public/assets/curated-buildings');
const textureDir = join(curatedDir, 'textures');
const firstAsset = join(curatedDir, 'gidi-yaba-mixeduse-upgrade-01.glb');

const MATERIALS = [
  { name:'MAT_YABA_WARM_CONCRETE', base:1, mr:2, normal:0, metallic:0.00, normalScale:0.78 },
  { name:'MAT_YABA_CREAM_PLASTER', base:4, mr:5, normal:3, metallic:0.00, normalScale:0.72 },
  { name:'MAT_YABA_DARK_METAL', base:7, mr:8, normal:6, metallic:0.66, normalScale:0.42 },
  { name:'MAT_YABA_ROOF_COOL_GREY', base:10, mr:11, normal:9, metallic:0.03, normalScale:0.75 },
  { name:'MAT_YABA_SIGNBOARD', base:13, mr:14, normal:12, metallic:0.24, normalScale:0.24 },
  { name:'MAT_YABA_TERRACOTTA', base:16, mr:17, normal:15, metallic:0.00, normalScale:0.68 },
  { name:'MAT_YABA_TINTED_GLASS', base:19, mr:20, normal:18, metallic:0.02, normalScale:0.12 },
  { name:'MAT_YABA_WATER_TANK_BLUE', base:22, mr:23, normal:21, metallic:0.00, normalScale:0.34 }
];
const IMAGE_NAMES = [
  'GIDI_CAST_CONCRETE_NORMAL_GL_2048',
  'GIDI_CAST_CONCRETE_BASECOLOR_2048',
  'GIDI_CAST_CONCRETE_ROUGHNESS_2048',
  'GIDI_WEATHERED_PLASTER_NORMAL_GL_2048',
  'GIDI_WEATHERED_PLASTER_BASECOLOR_2048',
  'GIDI_WEATHERED_PLASTER_ROUGHNESS_2048',
  'GIDI_PAINTED_STEEL_NORMAL_GL_1024',
  'GIDI_PAINTED_STEEL_BASECOLOR_1024',
  'GIDI_PAINTED_STEEL_ROUGHNESS_1024',
  'GIDI_ROOF_MEMBRANE_NORMAL_GL_1024',
  'GIDI_ROOF_MEMBRANE_BASECOLOR_1024',
  'GIDI_ROOF_MEMBRANE_ROUGHNESS_1024',
  'GIDI_SIGN_ENAMEL_NORMAL_GL_1024',
  'GIDI_SIGN_ENAMEL_BASECOLOR_1024',
  'GIDI_SIGN_ENAMEL_ROUGHNESS_1024',
  'GIDI_TERRACOTTA_COATING_NORMAL_GL_1024',
  'GIDI_TERRACOTTA_COATING_BASECOLOR_1024',
  'GIDI_TERRACOTTA_COATING_ROUGHNESS_1024',
  'GIDI_TINTED_SHOP_GLASS_NORMAL_GL_1024',
  'GIDI_TINTED_SHOP_GLASS_BASECOLOR_1024',
  'GIDI_TINTED_SHOP_GLASS_ROUGHNESS_1024',
  'GIDI_WEATHERED_POLY_TANK_NORMAL_GL_1024',
  'GIDI_WEATHERED_POLY_TANK_BASECOLOR_1024',
  'GIDI_WEATHERED_POLY_TANK_ROUGHNESS_1024'
];
const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const KTX2_MAGIC = Buffer.from([0xab,0x4b,0x54,0x58,0x20,0x32,0x30,0xbb,0x0d,0x0a,0x1a,0x0a]);

function align4(n) { return (n + 3) & ~3; }
function u32(n) { const b=Buffer.alloc(4); b.writeUInt32LE(n>>>0); return b; }

function parseGlb(buffer) {
  if (buffer.readUInt32LE(0)!==GLB_MAGIC || buffer.readUInt32LE(4)!==2 || buffer.readUInt32LE(8)!==buffer.length) {
    throw new Error('Invalid GLB 2.0 file.');
  }
  let offset=12,json=null,bin=null;
  while(offset<buffer.length) {
    const length=buffer.readUInt32LE(offset),type=buffer.readUInt32LE(offset+4);
    const chunk=buffer.subarray(offset+8,offset+8+length);
    if(type===JSON_CHUNK) json=JSON.parse(chunk.toString('utf8').trim());
    else if(type===BIN_CHUNK) bin=chunk;
    offset+=8+length;
  }
  if(!json) throw new Error('GLB has no JSON chunk.');
  return {json,bin:bin||Buffer.alloc(0)};
}

function packGlb(json, binary) {
  const jsonBytes=Buffer.from(JSON.stringify(json));
  const jsonChunk=Buffer.concat([jsonBytes,Buffer.alloc(align4(jsonBytes.length)-jsonBytes.length,0x20)]);
  const binChunk=Buffer.concat([binary,Buffer.alloc(align4(binary.length)-binary.length)]);
  const total=12+8+jsonChunk.length+(binChunk.length?8+binChunk.length:0);
  const parts=[u32(GLB_MAGIC),u32(2),u32(total),u32(jsonChunk.length),u32(JSON_CHUNK),jsonChunk];
  if(binChunk.length) parts.push(u32(binChunk.length),u32(BIN_CHUNK),binChunk);
  return Buffer.concat(parts);
}

async function externalizeFirstUpgrade() {
  const input=await readFile(firstAsset);
  const {json,bin}=parseGlb(input);
  if(!Array.isArray(json.images)||json.images.length!==24) throw new Error('The first Yaba upgrade must contain the 24-map PBR library.');
  const imageViews=new Set();
  for(const image of json.images) {
    if(image.uri) continue;
    if(!Number.isInteger(image.bufferView)) throw new Error('A Yaba PBR image has no bufferView or URI.');
    const viewIndex=image.bufferView;
    const view=json.bufferViews[viewIndex];
    const start=view.byteOffset||0;
    const bytes=bin.subarray(start,start+view.byteLength);
    if(bytes.length!==view.byteLength||!bytes.subarray(0,12).equals(KTX2_MAGIC)) throw new Error('Invalid embedded KTX2 map: '+image.name);
    const filename=(image.name||'shared-map').replace(/[^A-Za-z0-9_.-]/g,'_')+'.ktx2';
    await writeFile(join(textureDir,filename),bytes);
    image.uri='textures/'+filename;
    delete image.bufferView;
    delete image.mimeType;
    imageViews.add(viewIndex);
  }
  if(imageViews.size===0) {
    for(const image of json.images) {
      const filename=image.uri?.split('/').pop();
      if(!filename) throw new Error('Existing external Yaba texture URI is invalid.');
      const bytes=await readFile(join(textureDir,filename));
      if(!bytes.subarray(0,12).equals(KTX2_MAGIC)) throw new Error('Shared Yaba texture is not KTX2: '+filename);
    }
    return {externalized:false,bytes:input.length};
  }

  // The authored Blender export stores the 24 image views after all geometry views.
  // Repack only referenced geometry bufferViews so no duplicate image payload remains.
  const oldViews=json.bufferViews||[];
  const kept=[];
  const remap=new Map();
  const chunks=[];
  let cursor=0;
  for(let i=0;i<oldViews.length;i++) {
    if(imageViews.has(i)) continue;
    const view=oldViews[i];
    const start=view.byteOffset||0;
    const data=bin.subarray(start,start+view.byteLength);
    if(data.length!==view.byteLength) throw new Error('Truncated geometry bufferView '+i);
    const newOffset=cursor;
    const pad=align4(cursor)-cursor;
    if(pad) chunks.push(Buffer.alloc(pad));
    cursor+=pad;
    chunks.push(Buffer.from(data));
    cursor+=data.length;
    const next={...view,buffer:0,byteOffset:newOffset};
    remap.set(i,kept.length);
    kept.push(next);
  }
  for(const accessor of json.accessors||[]) {
    if(accessor.bufferView!==undefined) {
      if(!remap.has(accessor.bufferView)) throw new Error('An accessor unexpectedly points into an image bufferView.');
      accessor.bufferView=remap.get(accessor.bufferView);
    }
    if(accessor.sparse) {
      if(accessor.sparse.indices?.bufferView!==undefined) accessor.sparse.indices.bufferView=remap.get(accessor.sparse.indices.bufferView);
      if(accessor.sparse.values?.bufferView!==undefined) accessor.sparse.values.bufferView=remap.get(accessor.sparse.values.bufferView);
    }
  }
  json.bufferViews=kept;
  const newBinary=Buffer.concat(chunks);
  if(json.buffers?.[0]) json.buffers[0].byteLength=newBinary.length;
  const output=packGlb(json,newBinary);
  await writeFile(firstAsset,output);
  return {externalized:true,bytes:output.length,removedImageBytes:input.length-output.length};
}

const MAT = { CONCRETE:0, PLASTER:1, METAL:2, ROOF:3, SIGN:4, TERRACOTTA:5, GLASS:6, TANK:7 };
const FACE_DEFS = [
  {n:[0,0,1],p:[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],u:'w',v:'h'},
  {n:[0,0,-1],p:[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]],u:'w',v:'h'},
  {n:[1,0,0],p:[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]],u:'d',v:'h'},
  {n:[-1,0,0],p:[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]],u:'d',v:'h'},
  {n:[0,1,0],p:[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]],u:'w',v:'d'},
  {n:[0,-1,0],p:[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]],u:'w',v:'d'}
];

function groups() { return Array.from({length:8},()=>({p:[],n:[],uv:[],t:[],i:[]})); }

function addBox(g, material, x, y, z, sx, sy, sz, tile=1.5) {
  if(sx<=0||sy<=0||sz<=0) return;
  const group=g[material];
  const values={w:sx/ tile,h:sy/tile,d:sz/tile};
  for(const face of FACE_DEFS) {
    const base=group.p.length/3;
    const t0=face.p[0],t1=face.p[1];
    let tx=(t1[0]-t0[0])*sx,ty=(t1[1]-t0[1])*sy,tz=(t1[2]-t0[2])*sz;
    const tl=Math.hypot(tx,ty,tz)||1;
    const tangent=[tx/tl,ty/tl,tz/tl,1];
    const u=values[face.u],v=values[face.v];
    const uv=[[0,0],[u,0],[u,v],[0,v]];
    for(let k=0;k<4;k++) {
      const p=face.p[k];
      group.p.push(x+p[0]*sx/2,y+p[1]*sy/2,z+p[2]*sz/2);
      group.n.push(face.n[0],face.n[1],face.n[2]);
      group.uv.push(uv[k][0],uv[k][1]);
      group.t.push(...tangent);
    }
    group.i.push(base,base+1,base+2,base,base+2,base+3);
  }
}

function addCylinder(g,material,x,y,z,radius,height,segments=14) {
  const group=g[material];
  const bottom=y-height/2,top=y+height/2;
  for(let i=0;i<segments;i++) {
    const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
    const p0=[x+Math.cos(a)*radius,bottom,z+Math.sin(a)*radius];
    const p1=[x+Math.cos(b)*radius,bottom,z+Math.sin(b)*radius];
    const p2=[x+Math.cos(b)*radius,top,z+Math.sin(b)*radius];
    const p3=[x+Math.cos(a)*radius,top,z+Math.sin(a)*radius];
    const mid=(a+b)/2,normal=[Math.cos(mid),0,Math.sin(mid)];
    const base=group.p.length/3;
    const tangent=[-Math.sin(mid),0,Math.cos(mid),1];
    for(const [k,p] of [p0,p1,p2,p3].entries()) {
      group.p.push(...p);group.n.push(...normal);
      group.uv.push(k===1||k===2?(2*Math.PI*radius/segments)/1.2:0,k>=2?height/1.2:0);
      group.t.push(...tangent);
    }
    group.i.push(base,base+1,base+2,base,base+2,base+3);
  }
  for(const topFace of [false,true]) {
    const base=group.p.length/3;
    group.p.push(x,topFace?top:bottom,z);
    group.n.push(0,topFace?1:-1,0);group.uv.push(0.5,0.5);group.t.push(1,0,0,1);
    for(let i=0;i<=segments;i++) {
      const a=i/segments*Math.PI*2;
      group.p.push(x+Math.cos(a)*radius,topFace?top:bottom,z+Math.sin(a)*radius);
      group.n.push(0,topFace?1:-1,0);
      group.uv.push(0.5+Math.cos(a)*0.5,0.5+Math.sin(a)*0.5);
      group.t.push(1,0,0,1);
    }
    for(let i=0;i<segments;i++) {
      if(topFace) group.i.push(base,base+i+1,base+i+2);
      else group.i.push(base,base+i+2,base+i+1);
    }
  }
}

function addWindow(g,front,y,z,width,height,seed,withGrille=true) {
  const frame=MAT.METAL;
  const x=front-0.09;
  addBox(g,frame,x+0.035,y,z,0.08,height+0.20,width+0.20);
  addBox(g,frame,x-0.012,y,z-width/2,0.045,height+0.14,0.065);
  addBox(g,frame,x-0.012,y,z+width/2,0.045,height+0.14,0.065);
  addBox(g,frame,x-0.012,y-height/2,z,0.045,0.065,width);
  addBox(g,frame,x-0.012,y+height/2,z,0.045,0.065,width);
  addBox(g,MAT.GLASS,x-0.025,y,z,0.025,height-0.08,width-0.08);
  if(withGrille) {
    const bars=seed%2===0?3:2;
    for(let i=1;i<=bars;i++) addBox(g,frame,x-0.055,y,z-width/2+(width/(bars+1))*i,0.028,height-0.08,0.035);
    addBox(g,frame,x-0.055,y,z,0.028,0.035,width-0.08);
  }
  addBox(g,MAT.CONCRETE,x-0.18,y+height/2+0.12,z,width?0.32:0.24,0.16,width+0.34);
}

function addRailing(g,front,y,z,width) {
  addBox(g,MAT.METAL,front-0.85,y+0.38,z,0.065,0.07,width,1);
  addBox(g,MAT.METAL,front-0.85,y-0.38,z,0.065,0.07,width,1);
  const count=Math.max(4,Math.round(width/0.32));
  for(let i=0;i<=count;i++) {
    const zz=z-width/2+width*i/count;
    addBox(g,MAT.METAL,front-0.85,y,zz,0.055,0.82,0.055,1);
  }
}

function makeBuildingLOD(entry,level,seed) {
  const [w,h,d]=entry.size;
  const kind=entry.kind;
  const g=groups();
  const front=-w/2;
  const mixed=kind==='mixed-use';
  const expansion=entry.id.startsWith('expansion-shop-');
  const variant=seed%4;
  const groundH=Math.min(h*0.60, expansion?3.25:2.95);
  const hasUpper=(mixed||h>=6.25)&&h-groundH>=1.65;
  const upperBase=groundH;
  const upperH=Math.max(0,h-upperBase);
  const isDetailed=level===0;
  const isMid=level===1;

  addBox(g,MAT.PLASTER,0,h/2,0,w,h,d,1.8);
  addBox(g,MAT.CONCRETE,0,h+0.10,0,w+0.18,0.20,d+0.18,1.4);

  // Shopfronts: a dark recessed opening, tinted glazing, steel framing and a real shutter layer.
  const shopWidth=w*(expansion?0.78:0.76);
  const shopHeight=Math.max(1.65,groundH*0.70);
  const openingZ=(variant===2?d*0.07:0);
  addBox(g,MAT.METAL,front-0.08,shopHeight/2+0.12,openingZ,0.09,shopHeight,shopWidth+0.12,1);
  if(level===0||level===1) {
    const glassWidth=shopWidth*(variant===1?0.70:0.55);
    const shutterWidth=shopWidth-glassWidth;
    const glassZ=openingZ-shopWidth*0.5+glassWidth*0.5;
    const shutterZ=openingZ+shopWidth*0.5-shutterWidth*0.5;
    addBox(g,MAT.GLASS,front-0.15,shopHeight/2+0.12,glassZ,0.035,shopHeight-0.12,glassWidth-0.06,1.1);
    addBox(g,MAT.METAL,front-0.17,shopHeight/2+0.12,shutterZ,0.045,shopHeight-0.08,shutterWidth-0.04,1);
    if(level===0) {
      const slats=variant===3?10:8;
      for(let i=0;i<slats;i++) {
        const y=0.18+i*(shopHeight-0.23)/slats;
        addBox(g,MAT.METAL,front-0.205,y,shutterZ,0.035,0.045,shutterWidth-0.08,1);
      }
      addBox(g,MAT.METAL,front-0.22,shopHeight/2+0.12,glassZ,0.035,shopHeight-0.18,0.05,1);
      addBox(g,MAT.METAL,front-0.22,shopHeight/2+0.12,glassZ-glassWidth*0.18,0.035,shopHeight-0.18,0.035,1);
      addBox(g,MAT.METAL,front-0.22,shopHeight/2+0.12,glassZ+glassWidth*0.18,0.035,shopHeight-0.18,0.035,1);
      if(variant%2===0) {
        for(let i=0;i<5;i++) addBox(g,MAT.METAL,front-0.25,shopHeight/2+0.12,glassZ-glassWidth*0.46+i*glassWidth*0.23,0.025,shopHeight-0.22,0.025,1);
      }
    }
  } else {
    addBox(g,MAT.METAL,front-0.18,shopHeight/2+0.12,openingZ,0.035,shopHeight-0.08,shopWidth-0.04,1);
  }
  // Ground-floor entrance pier and side jambs.
  addBox(g,MAT.CONCRETE,front-0.12,groundH*0.51,openingZ-shopWidth/2-0.16,0.22,groundH,0.24,1);
  addBox(g,MAT.CONCRETE,front-0.12,groundH*0.51,openingZ+shopWidth/2+0.16,0.22,groundH,0.24,1);
  // Fascia, local business signboard, canopy and supports.
  const fasciaY=Math.min(groundH-0.05,shopHeight+0.38);
  addBox(g,MAT.SIGN,front-0.20,fasciaY,0,0.13,0.38,d*0.82,1.2);
  addBox(g,variant===1?MAT.CONCRETE:MAT.TERRACOTTA,front-0.42,fasciaY-0.29,0,0.44,0.10,d*0.90,1.2);
  addBox(g,MAT.METAL,front-0.40,fasciaY-0.55,-d*0.34,0.07,0.55,0.07,1);
  addBox(g,MAT.METAL,front-0.40,fasciaY-0.55,d*0.34,0.07,0.55,0.07,1);

  // Upper office/residential floor: recessed-looking windows and security features.
  if(hasUpper && (level===0||level===1)) {
    const bayCount=variant===1?3:2;
    const winY=upperBase+Math.max(0.95,upperH*0.56);
    const winH=Math.min(1.18,Math.max(0.75,upperH*0.42));
    for(let i=0;i<bayCount;i++) {
      const z=-d*0.30+i*(d*0.60/Math.max(1,bayCount-1));
      addWindow(g,front,winY,z,Math.min(1.45,d*0.21),winH,seed+i,true);
    }
    // Mixed-use gets a projecting balcony; selected commercial offices get a narrow service balcony.
    if(mixed||variant===0||variant===3) {
      const balconyY=upperBase+0.38;
      const balconyWidth=Math.min(d*0.76,w*1.18);
      addBox(g,MAT.CONCRETE,front-0.55,balconyY,0,0.95,0.16,balconyWidth,1);
      addRailing(g,front,balconyY+0.50,0,balconyWidth);
      addBox(g,MAT.TERRACOTTA,front-0.30,upperBase+upperH-0.24,0,0.28,0.12,balconyWidth+0.18,1.4);
    }
  }

  if(level===0) {
    // Front vertical pilasters, base trim, rainwater system and exposed utility fittings.
    addBox(g,MAT.CONCRETE,front-0.18,groundH/2,-d*0.43,0.18,groundH,d*0.055,1);
    addBox(g,MAT.CONCRETE,front-0.18,groundH/2,d*0.43,0.18,groundH,d*0.055,1);
    addBox(g,MAT.CONCRETE,front-0.20,0.12,0,0.22,0.24,d*0.94,1.2);
    // AC condensers mounted to a side facade, plus cable conduit and meter box.
    const sideX=w/2+0.05;
    for(let i=0;i<(hasUpper?2:1);i++) {
      const yy=Math.min(h-0.55,groundH+0.55+i*1.25);
      addBox(g,MAT.METAL,sideX,yy,-d*0.20,0.28,0.46,0.76,1);
      addBox(g,MAT.METAL,sideX+0.16,yy,-d*0.20,0.10,0.07,0.62,1);
    }
    addBox(g,MAT.METAL,sideX*0.98,1.1,d*0.28,0.12,0.72,0.08,1);
    addBox(g,MAT.CONCRETE,sideX,0.72,d*0.30,0.13,0.46,0.30,1);
    // Rainwater downpipe, elbows and lower inspection shoe.
    const pipeX=w/2+0.07, pipeZ=-d/2+0.22;
    addBox(g,MAT.METAL,pipeX,h/2,pipeZ,0.075,h,0.075,1);
    addBox(g,MAT.METAL,pipeX,0.20,pipeZ+0.12,0.075,0.075,0.30,1);
    // Small service louvres on the side/rear.
    for(let i=0;i<3;i++) addBox(g,MAT.METAL,w/2+0.045,groundH+0.24,(-0.2+i*0.15)*d,0.07,0.055,d*0.27,1);

    // Parapet coping, rooftop service plinth and polyethylene tank.
    const parapetY=h+0.31;
    addBox(g,MAT.CONCRETE,0,parapetY,-d/2,w+0.20,0.52,0.18,1);
    addBox(g,MAT.CONCRETE,0,parapetY,d/2,w+0.20,0.52,0.18,1);
    addBox(g,MAT.CONCRETE,-w/2,parapetY,0,0.18,0.52,d,1);
    addBox(g,MAT.CONCRETE,w/2,parapetY,0,0.18,0.52,d,1);
    const tankX=w*0.25,tankZ=d*0.20;
    addBox(g,MAT.METAL,tankX,h+0.55,tankZ,1.10,0.18,1.10,1);
    addCylinder(g,MAT.TANK,tankX,h+1.14,tankZ,Math.min(0.52,w*0.095),1.05,14);
    addBox(g,MAT.METAL,tankX,h+1.69,tankZ,0.64,0.08,0.64,1);
    addBox(g,MAT.METAL,tankX+0.42,h+0.95,tankZ,0.055,0.95,0.055,1);
    // Small rooftop ventilation/service hatch.
    addBox(g,MAT.ROOF,-w*0.22,h+0.20,-d*0.18,Math.min(1.2,w*0.23),0.12,Math.min(1.0,d*0.18),1.4);
  }

  if(level===1) {
    // Mid-distance retains shop identity, balcony silhouette, parapet and tank only.
    if(hasUpper && mixed) {
      addBox(g,MAT.CONCRETE,front-0.50,upperBase+0.36,0,0.84,0.14,d*0.62,1);
      addBox(g,MAT.METAL,front-0.91,upperBase+0.77,0,0.055,0.72,d*0.62,1);
    }
    addBox(g,MAT.CONCRETE,0,h+0.31,0,w+0.20,0.52,d+0.20,1.8);
    addCylinder(g,MAT.TANK,w*0.25,h+1.10,d*0.20,Math.min(0.50,w*0.09),0.95,10);
  }

  return g;
}

function buildGeometry(asset,entry,level) {
  const seed=Number(entry.seed)||Number(String(entry.id).match(/(\d+)$/)?.[1])||1;
  const levelGroups=makeBuildingLOD(entry,level,seed);
  return levelGroups;
}

function addBinary(chunks,data) {
  const current=chunks.reduce((n,b)=>n+b.length,0);
  const padding=align4(current)-current;
  if(padding) chunks.push(Buffer.alloc(padding));
  const byteOffset=current+padding;
  chunks.push(Buffer.from(data));
  return byteOffset;
}

function createAccessor(values,type,componentType,target,components,chunks,views,accessors) {
  const offset=addBinary(chunks,Buffer.from(values.buffer,values.byteOffset,values.byteLength));
  const length=values.byteLength;
  const view={buffer:0,byteOffset:offset,byteLength:length};
  if(target) view.target=target;
  views.push(view);
  const accessor={bufferView:views.length-1,componentType,count:values.length/components,type};
  if(type==='VEC3'&&components===3) {
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<values.length;i+=3) for(let k=0;k<3;k++){min[k]=Math.min(min[k],values[i+k]);max[k]=Math.max(max[k],values[i+k]);}
    accessor.min=min;accessor.max=max;
  }
  if(type==='SCALAR'&&values.length) {
    let max=0;for(const v of values)max=Math.max(max,v);
    accessor.min=[0];accessor.max=[max];
  }
  accessors.push(accessor);
  return accessors.length-1;
}

function createMesh(groupsForLevel,name,chunks,views,accessors) {
  const primitives=[];
  for(let material=0;material<groupsForLevel.length;material++) {
    const g=groupsForLevel[material];
    if(!g.i.length) continue;
    const p=Float32Array.from(g.p),n=Float32Array.from(g.n),uv=Float32Array.from(g.uv),t=Float32Array.from(g.t);
    const maxIndex=g.i.reduce((a,b)=>Math.max(a,b),0);
    const indexData=maxIndex>65535?Uint32Array.from(g.i):Uint16Array.from(g.i);
    const position=createAccessor(p,'VEC3',5126,34962,3,chunks,views,accessors);
    const normal=createAccessor(n,'VEC3',5126,34962,3,chunks,views,accessors);
    const texcoord=createAccessor(uv,'VEC2',5126,34962,2,chunks,views,accessors);
    const tangent=createAccessor(t,'VEC4',5126,34962,4,chunks,views,accessors);
    const indices=createAccessor(indexData,'SCALAR',maxIndex>65535?5125:5123,34963,1,chunks,views,accessors);
    primitives.push({attributes:{POSITION:position,NORMAL:normal,TEXCOORD_0:texcoord,TANGENT:tangent},indices,material,mode:4});
  }
  return {name,primitives};
}

function makePbrMaterials() {
  return MATERIALS.map(m=>({
    name:m.name,
    doubleSided:true,
    pbrMetallicRoughness:{
      baseColorTexture:{index:m.base},
      metallicRoughnessTexture:{index:m.mr},
      metallicFactor:m.metallic,
      roughnessFactor:1
    },
    normalTexture:{index:m.normal,scale:m.normalScale}
  }));
}

function makeExternalImages() {
  return IMAGE_NAMES.map(name=>({uri:'textures/'+name+'.ktx2',name}));
}

function makeExternalTextures() {
  return IMAGE_NAMES.map((name,index)=>({
    name:name,
    sampler:0,
    extensions:{KHR_texture_basisu:{source:index}}
  }));
}

function generateBuildingGlb(entry) {
  const chunks=[],views=[],accessors=[],meshes=[],nodes=[];
  const lodNodeIndices=[];
  const orientationIndex=nodes.push({name:'ASSET_ORIENTATION'})-1;

  for(let level=0;level<3;level++) {
    const groupsForLevel=buildGeometry(null,entry,level);
    const mesh=createMesh(groupsForLevel,'Yaba-'+entry.id+'-LOD'+level,chunks,views,accessors);
    const meshIndex=meshes.push(mesh)-1;
    const surfaceIndex=nodes.push({name:'LOD'+level+'_SURFACE',mesh:meshIndex})-1;
    const lodIndex=nodes.push({name:'LOD'+level,children:[surfaceIndex],extras:{screenDistanceMeters:[0,75,145][level]}})-1;
    lodNodeIndices.push(lodIndex);
  }

  const collision=groups();
  const [w,h,d]=entry.size;
  addBox(collision,MAT.CONCRETE,0,h/2,0,w*0.94,h,d*0.94,2);
  const collisionMesh=createMesh(collision,'Yaba-'+entry.id+'-COLLISION',chunks,views,accessors);
  const collisionMeshIndex=meshes.push(collisionMesh)-1;
  const collisionNode=nodes.push({name:'COLLISION_PROXY',mesh:collisionMeshIndex,extras:{collisionProxy:true,static:true}})-1;

  nodes[orientationIndex].children=[...lodNodeIndices,collisionNode];
  const rootIndex=nodes.push({name:'BuildingRoot',children:[orientationIndex],extras:{
    archetype:entry.kind==='mixed-use'?'Yaba mixed-use commercial block':'Yaba street-facing commercial shop',
    authoring:'GIDI Yaba Architecture Standard v1; shared weathered PBR surface library',
    units:'meters',frontAxis:'-X',placementId:entry.id,variantSeed:Number(entry.seed)||Number(String(entry.id).match(/(\d+)$/)?.[1])||1
  }})-1;

  const binary=Buffer.concat(chunks);
  const json={
    asset:{version:'2.0',generator:'Naija City Yaba Architecture Standard v1; shared KTX2 Basis texture library'},
    scene:0,scenes:[{nodes:[rootIndex]}],
    nodes,meshes,materials:makePbrMaterials(),
    images:makeExternalImages(),textures:makeExternalTextures(),
    samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],
    buffers:[{byteLength:binary.length}],bufferViews:views,accessors,
    extensionsUsed:['KHR_texture_basisu'],
    extensionsRequired:['KHR_texture_basisu'],
    extras:{architectureStandard:'GIDI-YABA-ARCHITECTURE-STANDARD-V1',sharedTextureLibrary:'textures/',textureMapCount:24,textureCompression:'KTX2 Basis UASTC + ETC1S',textureMipmaps:true}
  };
  return packGlb(json,binary);
}

function isYabaCommercialEntry(entry) {
  if(!['commercial','mixed-use'].includes(entry.kind)) return false;
  if(/^yaba-core-(0[2-9]|[12][0-9]|3[0-2])$/.test(entry.id)) return true;
  return ['expansion-shop-33','expansion-shop-34','expansion-shop-35','expansion-shop-36','expansion-shop-37','expansion-shop-39','expansion-shop-40'].includes(entry.id);
}

async function main() {
  await mkdir(curatedDir,{recursive:true});
  await mkdir(textureDir,{recursive:true});
  const first=await externalizeFirstUpgrade();
  const mapFiles=await Promise.all(IMAGE_NAMES.map(async name=>{
    const filename=name+'.ktx2';
    const bytes=await readFile(join(textureDir,filename));
    if(!bytes.subarray(0,12).equals(KTX2_MAGIC)) throw new Error('Missing shared KTX2 surface map: '+filename);
    return {filename,bytes:bytes.length};
  }));
  if(mapFiles.length!==24) throw new Error('Shared Yaba PBR library must contain exactly 24 maps.');

  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  const batch=manifest.models.filter(isYabaCommercialEntry);
  if(batch.length!==38) throw new Error('Expected exactly 38 existing Yaba commercial/mixed-use placements; found '+batch.length);

  const commonMetadata={
    architectureStandard:'GIDI-YABA-ARCHITECTURE-STANDARD-V1',
    authoring:'Naija City curated Yaba architecture batch 02',
    textureCompression:'KHR_texture_basisu',
    textureLibrary:'/assets/curated-buildings/textures/',
    textureMipmaps:true,
    materialResolution:{hero:2048,trim:1024},
    normalEncoding:'OpenGL tangent-space normals with MikkTSpace tangents',
    sourceMaterials:['ambientCG PaintedPlaster017 (CC0-1.0)','ambientCG Concrete034 (CC0-1.0)','ambientCG CorrugatedSteel009 (CC0-1.0)'],
    materialFamilies:MATERIALS.map(m=>m.name)
  };

  let totalGeometryBytes=0;
  for(const entry of batch) {
    const filename=entry.id+'.glb';
    const bytes=generateBuildingGlb(entry);
    await writeFile(join(curatedDir,filename),bytes);
    totalGeometryBytes+=bytes.length;
    entry.url='/assets/curated-buildings/'+filename;
    entry.bytes=bytes.length;
    Object.assign(entry,commonMetadata,{
      name:entry.kind==='mixed-use'?'Yaba '+entry.id+' mixed-use retail and office block':'Yaba '+entry.id+' street commercial building',
      materialEncoding:'Eight shared PBR material families; 24 external KTX2 maps referenced once by the shared library',
      pbrMapCount:24,
      materialResolution:{hero:2048,trim:1024}
    });
  }

  // The first upgraded building uses the exact same shared texture URI set.
  const heroEntry=manifest.models.find(entry=>entry.id==='expansion-shop-38');
  if(!heroEntry) throw new Error('The first upgraded Yaba anchor placement is missing.');
  heroEntry.url='/assets/curated-buildings/gidi-yaba-mixeduse-upgrade-01.glb';
  const heroBytes=await readFile(firstAsset);
  heroEntry.bytes=heroBytes.length;
  Object.assign(heroEntry,commonMetadata,{
    name:'Yaba Two-Storey Mixed-Use Electronics & Services Building',
    materialEncoding:'Eight shared PBR material families; 24 external KTX2 maps referenced once by the shared library',
    pbrMapCount:24
  });

  manifest.textureEncoding='Shared KTX2 Basis library for 39 curated Yaba commercial/mixed-use assets; Computer Village hero retains its own 08F KTX2 materials; 8 neighbourhood homes remain unchanged';
  manifest.yabaArchitectureStandard={
    id:'GIDI-YABA-ARCHITECTURE-STANDARD-V1',
    curatedPlacementCount:39,
    newlyUpgradedPlacementCount:38,
    anchorPlacement:'expansion-shop-38',
    textureMapCount:24,
    uniqueSharedTexturePayloadBytes:mapFiles.reduce((sum,item)=>sum+item.bytes,0),
    mapDirectory:'/assets/curated-buildings/textures/',
    compression:'KTX2 Basis; UASTC normal/roughness, ETC1S base colour; mipmaps'
  };
  await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');

  console.log('Yaba architecture batch 02 complete:',batch.length,'existing placements upgraded; no new placements.');
  console.log('Shared PBR library:',mapFiles.length,'KTX2 maps;',mapFiles.reduce((sum,item)=>sum+item.bytes,0),'bytes total; one shared copy.');
  console.log('First anchor externalized:',first.externalized,'; GLB bytes:',heroBytes.length,'; saved from original embedded payload:',first.removedImageBytes||0);
  console.log('New geometry-only GLBs:',totalGeometryBytes,'bytes across',batch.length,'placements.');
}

main().catch(error=>{console.error(error);process.exitCode=1;});
