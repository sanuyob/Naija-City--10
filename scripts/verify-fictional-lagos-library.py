#!/usr/bin/env python3
"""Independent integrity, license-presence and mobile-budget check for the district GLB library."""
from __future__ import annotations
import hashlib, json, struct
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/assets/fictional-lagos'
INDEX = BASE / 'library/asset-library.json'
manifest = json.loads(INDEX.read_text(encoding='utf-8'))
errors=[]
seen=set()
actual_glb_bytes=0
actual_texture_bytes=0
actual_triangles=0
for a in manifest.get('assets',[]):
    file=ROOT/'public'/a['file']
    if not file.exists():
        errors.append(f"missing file: {a['file']}")
        continue
    data=file.read_bytes()
    actual_glb_bytes += len(data)
    if data[:4] != b'glTF': errors.append(f"bad GLB header: {a['file']}")
    if len(data) != a['bytes']: errors.append(f"file-size mismatch: {a['file']}")
    digest=hashlib.sha256(data).hexdigest()
    if digest != a['sha256']: errors.append(f"SHA-256 mismatch: {a['file']}")
    jlen=struct.unpack_from('<I',data,12)[0]
    doc=json.loads(data[20:20+jlen].decode('utf-8'))
    tris=0
    for mesh in doc.get('meshes',[]):
        for p in mesh.get('primitives',[]):
            if p.get('mode',4)!=4: continue
            pos=p.get('attributes',{}).get('POSITION')
            idx=p.get('indices')
            if idx is not None: tris += doc['accessors'][idx].get('count',0)//3
            elif pos is not None: tris += doc['accessors'][pos].get('count',0)//3
    if tris != a['triangles']: errors.append(f"triangle-count mismatch: {a['file']} ({tris} != {a['triangles']})")
    actual_triangles += tris
    if a['bytes'] > 1024*1024: errors.append(f"per-model file budget exceeded: {a['file']} ({a['bytes']})")
    if a['triangles'] > 10000: errors.append(f"per-model triangle budget exceeded: {a['file']} ({a['triangles']})")
    if not a.get('license') or not a.get('sourcePage') or not a.get('credit'):
        errors.append(f"rights metadata incomplete: {a['id']}")
    if a['id'] in seen: errors.append(f"duplicate ID: {a['id']}")
    seen.add(a['id'])

for texture in manifest.get('sharedTextureAtlases', []):
    file = ROOT / 'public' / texture['file']
    if not file.exists():
        errors.append(f"missing shared texture: {texture['file']}")
        continue
    data = file.read_bytes()
    actual_texture_bytes += len(data)
    if len(data) != texture['bytes']:
        errors.append(f"shared texture size mismatch: {texture['file']}")
    if hashlib.sha256(data).hexdigest() != texture['sha256']:
        errors.append(f"shared texture hash mismatch: {texture['file']}")

if actual_glb_bytes != manifest.get('totalGLBBytes'):
    errors.append('total GLB byte summary mismatch')
if actual_texture_bytes != manifest.get('totalSharedTextureBytes'):
    errors.append('shared texture byte summary mismatch')
if actual_glb_bytes + actual_texture_bytes != manifest.get('totalBytes'):
    errors.append('total library byte summary mismatch')

for f in ['commercial-LICENSE.txt','roads-LICENSE.txt','suburban-LICENSE.txt','industrial-LICENSE.txt','nature-LICENSE.txt','innerscene-LICENSE.txt']:
    if not (BASE/'licenses'/f).exists(): errors.append(f'missing license file: {f}')
for district,path in manifest.get('districtManifestPaths',{}).items():
    file=ROOT/'public'/path
    if not file.exists(): errors.append(f'missing district manifest: {district} -> {path}')
    else:
        body=json.loads(file.read_text(encoding='utf-8'))
        if body.get('district') != district: errors.append(f'district manifest identity mismatch: {district}')
        expected={a['id'] for a in manifest.get('assetsByDistrict',{}).get(district,[])}
        actual={a['id'] for a in body.get('assets',[])}
        if expected != actual: errors.append(f'district manifest assets differ: {district}')

summary={
 'assets':len(manifest.get('assets',[])),
 'districts':len(manifest.get('districts',{})),
 'glbBytes':actual_glb_bytes,
 'sharedTextureBytes':actual_texture_bytes,
 'bytes':actual_glb_bytes + actual_texture_bytes,
 'MiB':round((actual_glb_bytes + actual_texture_bytes)/1024/1024,2),
 'triangles':actual_triangles,
 'allAssetHashesMatch':not any('SHA-256 mismatch' in e for e in errors),
 'allDistrictManifestsMatch':not any('district manifest' in e for e in errors),
 'errors':errors,
}
print(json.dumps(summary,indent=2))
if errors: raise SystemExit(1)
