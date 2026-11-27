#!/usr/bin/env python3
"""Build a rights-tracked, district-tagged GLB library from the verified Kenney packs."""
from __future__ import annotations
import csv, json, struct, zipfile, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'asset-sources/fictional-lagos/originals'
OUT = ROOT / 'public/assets/fictional-lagos/library'
LICENSES = ROOT / 'public/assets/fictional-lagos/licenses'
DISTRICT_MANIFESTS = ROOT / 'public/assets/fictional-lagos/district-manifests'

SOURCES = {
    'commercial': {
        'zip': 'kenney-commercial.zip',
        'url': 'https://kenney.nl/assets/city-kit-commercial',
        'license': 'CC0-1.0', 'credit': 'Kenney (www.kenney.nl)',
        'subdir': 'Models/GLB format/',
        'districts': ['Lekki', 'Eko Atlantic', 'Victoria Island', 'Yaba', 'Alimosho'],
        'allow': None,
    },
    'roads': {
        'zip': 'kenney-roads.zip',
        'url': 'https://kenney.nl/assets/city-kit-roads',
        'license': 'CC0-1.0', 'credit': 'Kenney (www.kenney.nl)',
        'subdir': 'Models/GLB format/',
        'districts': ['Lekki', 'Eko Atlantic', 'Victoria Island', 'Yaba', 'Alimosho', 'Ekiti'],
        'allow': None,
    },
    'suburban': {
        'zip': 'kenney-suburban.zip',
        'url': 'https://kenney.nl/assets/city-kit-suburban',
        'license': 'CC0-1.0', 'credit': 'Kenney (www.kenney.nl)',
        'subdir': 'Models/GLB format/',
        'districts': ['Lekki', 'Alimosho', 'Ekiti'],
        'allow': None,
    },
    'industrial': {
        'zip': 'kenney-industrial.zip',
        'url': 'https://kenney.nl/assets/city-kit-industrial',
        'license': 'CC0-1.0', 'credit': 'Kenney (www.kenney.nl)',
        'subdir': 'Models/GLB format/',
        'districts': ['Lekki', 'Alimosho'],
        'allow': None,
    },
    'nature': {
        'zip': 'kenney-nature.zip',
        'url': 'https://kenney.nl/assets/nature-kit',
        'license': 'CC0-1.0', 'credit': 'Kenney (www.kenney.nl)',
        'subdir': 'Models/GLTF format/',
        'districts': ['Lekki', 'Eko Atlantic', 'Victoria Island', 'Yaba', 'Alimosho', 'Ekiti'],
        'allow': {
            'cliff_large_rock.glb', 'cliff_rock.glb',
            'rock_largeA.glb','rock_largeB.glb','rock_largeC.glb','rock_largeD.glb','rock_largeE.glb','rock_largeF.glb',
            'rock_smallA.glb','rock_smallB.glb','rock_smallC.glb','rock_smallD.glb','rock_smallE.glb','rock_smallF.glb',
            'rock_tallA.glb','rock_tallB.glb','rock_tallC.glb','rock_tallD.glb','rock_tallE.glb','rock_tallF.glb',
            'rock_tallG.glb','rock_tallH.glb','rock_tallI.glb','rock_tallJ.glb',
            'tree_default.glb','tree_detailed.glb','tree_oak.glb','tree_palm.glb','tree_palmBend.glb',
            'tree_palmDetailedShort.glb','tree_palmDetailedTall.glb','tree_palmShort.glb','tree_palmTall.glb',
            'tree_simple.glb','tree_tall.glb',
            'plant_bush.glb','plant_bushDetailed.glb','plant_bushLarge.glb','plant_bushSmall.glb','plant_bushTriangle.glb',
            'grass.glb','grass_large.glb','grass_leafs.glb','grass_leafsLarge.glb',
        },
    },
}

# Small, reusable classifications. These are recommendations, not hard runtime placement rules.
def classify(pack: str, name: str) -> str:
    n = name.lower()
    if pack == 'commercial' and any(k in n for k in ['detail-awning','detail-overhang','detail-parasol']):
        return 'shopfront-detail'
    if pack == 'commercial' or (pack == 'suburban' and n.startswith('building-type')) or (pack == 'industrial' and n.startswith('building-')):
        return 'building'
    if pack == 'roads' and n.startswith('road-'):
        return 'road-module'
    if pack == 'roads' and ('electricity' in n or 'wire' in n):
        return 'utility'
    if pack == 'industrial' and any(k in n for k in ['solar-panel','windmill','water-tower','tank','chimney']):
        return 'utility-or-industrial-prop'
    if pack == 'industrial' and 'shipping-container' in n:
        return 'industrial-prop'
    if pack == 'nature' and any(k in n for k in ['rock','cliff']):
        return 'terrain-rock'
    if pack == 'nature':
        return 'vegetation'
    if pack == 'suburban' and n.startswith('tree-'):
        return 'vegetation'
    if pack == 'suburban' and any(k in n for k in ['fence','path','driveway','planter']):
        return 'compound-and-path-prop'
    return 'street-prop'

def folder_for(kind: str) -> str:
    if kind == 'building': return 'buildings'
    if kind == 'road-module': return 'roads'
    if kind == 'utility' or kind == 'utility-or-industrial-prop': return 'utilities'
    if kind == 'terrain-rock': return 'terrain'
    if kind == 'vegetation': return 'vegetation'
    if kind in ('compound-and-path-prop','shopfront-detail','industrial-prop'): return 'street-props'
    return 'street-props'

def glb_stats(data: bytes) -> dict:
    if len(data) < 20 or data[:4] != b'glTF':
        raise ValueError('Not a GLB file')
    json_len = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20+json_len].decode('utf-8'))
    vertices = triangles = meshes = primitives = 0
    for mesh in doc.get('meshes', []):
        meshes += 1
        for prim in mesh.get('primitives', []):
            primitives += 1
            if prim.get('mode', 4) != 4:
                continue
            pos = prim.get('attributes', {}).get('POSITION')
            if pos is not None:
                vertices += int(doc.get('accessors', [])[pos].get('count', 0))
            idx = prim.get('indices')
            if idx is not None:
                triangles += int(doc.get('accessors', [])[idx].get('count', 0)) // 3
            elif pos is not None:
                triangles += int(doc.get('accessors', [])[pos].get('count', 0)) // 3
    bounds = []
    for mesh in doc.get('meshes', []):
        for prim in mesh.get('primitives', []):
            pos = prim.get('attributes', {}).get('POSITION')
            if pos is not None:
                acc = doc['accessors'][pos]
                if 'min' in acc and 'max' in acc:
                    bounds.append((acc['min'], acc['max']))
    return {
        'vertices': vertices,
        'triangles': triangles,
        'meshes': meshes,
        'primitives': primitives,
        'materials': len(doc.get('materials', [])),
        'embeddedImages': len(doc.get('images', [])),
        'dimensionsBounds': bounds[:8],
    }

for p in OUT.glob('*'):
    if p.is_file(): p.unlink()
for p in OUT.glob('*'):
    if p.is_dir():
        import shutil; shutil.rmtree(p)
OUT.mkdir(parents=True, exist_ok=True)
LICENSES.mkdir(parents=True, exist_ok=True)
if DISTRICT_MANIFESTS.exists():
    import shutil; shutil.rmtree(DISTRICT_MANIFESTS)
DISTRICT_MANIFESTS.mkdir(parents=True, exist_ok=True)

assets = []
shared_textures = []
missing = []
for pack, meta in SOURCES.items():
    source_zip = SOURCE / meta['zip']
    if not source_zip.exists():
        raise FileNotFoundError(source_zip)
    with zipfile.ZipFile(source_zip) as z:
        license_text = z.read('License.txt').decode('utf-8', 'replace')
        if 'Creative Commons Zero' not in license_text and 'CC0' not in license_text:
            raise RuntimeError(f'Expected CC0 license text not found in {meta["zip"]}')
        license_path = LICENSES / f'{pack}-LICENSE.txt'
        license_path.write_text(license_text.strip() + '\n', encoding='utf-8')
        # Kenney glTF/GLB models in four of the kits reference the shared atlas
        # with a relative URI. Preserve the original sibling path exactly.
        atlas_member = meta['subdir'] + 'Textures/colormap.png'
        if atlas_member in z.namelist():
            atlas_path = OUT / pack / 'Textures' / 'colormap.png'
            atlas_path.parent.mkdir(parents=True, exist_ok=True)
            atlas_data = z.read(atlas_member)
            atlas_path.write_bytes(atlas_data)
            shared_textures.append({
                'id': f'{pack}-colormap-atlas',
                'sourcePack': pack,
                'file': f'assets/fictional-lagos/library/{pack}/Textures/colormap.png',
                'sourcePage': meta['url'],
                'license': meta['license'],
                'credit': meta['credit'],
                'bytes': len(atlas_data),
                'sha256': hashlib.sha256(atlas_data).hexdigest(),
                'verificationState': 'downloaded, shared GLB texture URI resolved, SHA-256 recorded'
            })
        for member in z.namelist():
            if not member.lower().endswith('.glb') or not member.startswith(meta['subdir']):
                continue
            filename = Path(member).name
            if meta['allow'] is not None and filename not in meta['allow']:
                continue
            data = z.read(member)
            stats = glb_stats(data)
            kind = classify(pack, filename)
            # Keep models grouped by source pack so relative GLB URIs such as
            # Textures/colormap.png resolve to that pack's own shared atlas.
            folder = pack
            target_dir = OUT / folder
            target_dir.mkdir(parents=True, exist_ok=True)
            target_name = f'{pack}__{filename}'
            target = target_dir / target_name
            target.write_bytes(data)
            asset_id = f'{pack}-{filename[:-4]}'.replace('_','-')
            district_list = list(meta['districts'])
            if pack == 'nature' and kind == 'terrain-rock':
                district_list = ['Ekiti', 'Eko Atlantic', 'Lekki']
            if pack == 'nature' and kind == 'vegetation':
                district_list = ['Ekiti', 'Alimosho', 'Lekki', 'Eko Atlantic', 'Victoria Island', 'Yaba']
            assets.append({
                'id': asset_id,
                'name': filename[:-4].replace('-', ' ').replace('_',' ').title(),
                'sourcePack': pack,
                'category': kind,
                'file': f'assets/fictional-lagos/library/{folder}/{target_name}',
                'sourceArchive': f'asset-sources/fictional-lagos/originals/{meta["zip"]}',
                'sourceAssetPath': member,
                'sourcePage': meta['url'],
                'license': meta['license'],
                'credit': meta['credit'],
                'recommendedDistricts': district_list,
                'bytes': len(data),
                'sha256': hashlib.sha256(data).hexdigest(),
                **stats,
            })

# This map describes visual kit intent. It does not claim that generic models are finished Nigerian architecture.
districts = {
 'Lekki': {
   'visualIdentity': 'Coastal barrier-peninsula growth: expressway spine, planned gated estates, apartment clusters and a changing edge of informal roadside commerce and service yards.',
   'buildingMix': ['suburban estate houses', 'mid-rise apartments', 'commercial blocks', 'small workshop / service buildings'],
   'streetAndEnvironment': ['multi-lane expressway and service roads', 'estate entrance gates and boundary walls', 'side drains and utility runs', 'roadside stalls / repair yards', 'palms, wetland-edge shrubs and scattered trees'],
   'assetIds': ['suburban', 'commercial', 'industrial', 'roads', 'nature'],
   'needsCustom': ['Lekki-specific gated estate entrance and security lodge', 'Nigerian roadside kiosk and repair-yard kit', 'lagoon / wetland edge and drainage detail', 'distinctive Lagos signboards and frontage graphics'],
 },
 'Ekiti': {
   'visualIdentity': 'Green upland towns with undulating slopes, isolated or clustered steep-sided dome rocks and ridges; compact compounds sit within a lush, hilly landscape.',
   'buildingMix': ['low-rise family compounds', 'bungalows and rooming houses', 'newer cement-block homes', 'small town-centre shops'],
   'streetAndEnvironment': ['sloped local roads and collectors', 'laterite shoulders and stone edges', 'compound walls and gates', 'rock outcrops / ridgelines', 'broadleaf trees, palms, bushes and dense green cover'],
   'assetIds': ['suburban', 'roads', 'nature'],
   'needsCustom': ['Ekiti / Yoruba courtyard-compound house modules', 'laterite and earth-block facade material set', 'stone retaining edge and slope-road segments', 'Efon-Alaaye-inspired large dome-rock formations'],
 },
 'Eko Atlantic': {
   'visualIdentity': 'Planned reclaimed coastal city: flat graded ground, clear street hierarchy, broad boulevards, mixed-use towers, marina / canal edges and a major rock-armoured sea defence.',
   'buildingMix': ['financial-district towers', 'office and hotel blocks', 'mid-rise mixed-use buildings', 'residential towers'],
   'streetAndEnvironment': ['primary / secondary / local road hierarchy', 'roundabouts and signalized junctions', 'canal bridges and marina edges', 'wide sidewalks and planted boulevards', 'sea wall promenade and rock revetment'],
   'assetIds': ['commercial', 'roads', 'industrial', 'nature'],
   'needsCustom': ['rock revetment / sea-wall segment kit', 'canal quay walls and pedestrian bridge set', 'glass / stone curtain-wall materials', 'marina furniture and waterfront promenade props'],
 },
 'Victoria Island': {
   'visualIdentity': 'Dense commercial and hospitality centre mixed with serviced-apartment towers, older family compounds, leafy side streets, plazas and high-residential corridors.',
   'buildingMix': ['office towers', 'hotel towers', 'serviced apartment blocks', 'older detached homes and mixed-use conversions'],
   'streetAndEnvironment': ['busy avenue corridors', 'smaller leafy side streets', 'commercial plazas and covered retail frontages', 'streetlights, signs, sidewalks and planted public spaces'],
   'assetIds': ['commercial', 'suburban', 'roads', 'nature'],
   'needsCustom': ['recognizable Lagos hotel / office facade variants without copying protected logos', 'VI-style entrance plazas and retail canopies', 'distinctive glass curtain-wall and stone-cladding materials'],
 },
 'Yaba': {
   'visualIdentity': 'Layered mainland streets: older Afro-Brazilian / colonial-era bungalows alongside 3–4-storey tenements, shopfronts, newer offices, schools and compact backstreets.',
   'buildingMix': ['older bungalow shells', 'face-me-I-face-you style low-rise tenements', 'ground-floor shops', 'small technology / education offices'],
   'streetAndEnvironment': ['compact streets and dusty arterials', 'shop awnings and signboards', 'mixed building setbacks and compound gates', 'utility poles / overhead lines', 'courtyard greens and occasional market spaces'],
   'assetIds': ['commercial', 'suburban', 'roads', 'nature'],
   'needsCustom': ['Afro-Brazilian / colonial bungalow facade kit', 'Lagos tenement balcony / corridor facade kit', 'Yaba market stall and signage family', 'roadside drainage and patched asphalt detailing'],
 },
 'Alimosho': {
   'visualIdentity': 'Large residential district with low- and medium-density neighbourhoods, local commercial nodes, busy roundabouts, markets, transport terminals and expressway-front mixed use.',
   'buildingMix': ['detached / semi-detached low-rise houses', 'walled compounds', 'small apartment blocks', 'lock-up shops and market buildings'],
   'streetAndEnvironment': ['residential access streets and collectors', 'roundabout / market junctions', 'roadside shops and stalls', 'bus stop / terminal spaces', 'overhead utility infrastructure and street trees'],
   'assetIds': ['suburban', 'commercial', 'industrial', 'roads', 'nature'],
   'needsCustom': ['busy open-market stall rows and lock-up shop modules', 'Lagos bus stop / BRT terminal scenery', 'Nigerian compound gate and wall variants', 'local shop signs and roadside vending props'],
 },
}

# Add one separate, individually verified CC0 palm model from Innerscene.
inner_source = SOURCE / 'innerscene__low-poly-nature-palm-tree.glb'
if inner_source.exists():
    data = inner_source.read_bytes()
    stats = glb_stats(data)
    target = OUT / 'vegetation' / 'innerscene__low-poly-nature-palm-tree.glb'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    assets.append({
        'id': 'innerscene-low-poly-nature-palm-tree',
        'name': 'Low Poly Nature Palm Tree',
        'sourcePack': 'innerscene-individual',
        'category': 'vegetation',
        'file': 'assets/fictional-lagos/library/vegetation/innerscene__low-poly-nature-palm-tree.glb',
        'sourceArchive': 'asset-sources/fictional-lagos/originals/innerscene__low-poly-nature-palm-tree.glb',
        'sourceAssetPath': 'Original standalone GLB download',
        'sourcePage': 'https://www.innerscene.com/tools/library/3d-parts/low-poly-nature-palm-tree-5e953f37',
        'license': 'CC0-1.0',
        'credit': 'Innerscene (original model; CC0 dedication)',
        'recommendedDistricts': ['Lekki', 'Eko Atlantic', 'Victoria Island', 'Yaba', 'Alimosho', 'Ekiti'],
        'bytes': len(data),
        'sha256': hashlib.sha256(data).hexdigest(),
        **stats,
    })
    (LICENSES / 'innerscene-LICENSE.txt').write_text(
        'Innerscene Low-poly Nature — Palm tree\n'
        'Source: https://www.innerscene.com/tools/library/3d-parts/low-poly-nature-palm-tree-5e953f37\n'
        'License: Public domain dedication (CC0).\n'
        'The source page states the original model is CC0 and may be used, modified and redistributed, including commercially.\n',
        encoding='utf-8')

# Verify each output model and build a compact rights register.
assets.sort(key=lambda a: (a['category'], a['sourcePack'], a['name']))
for asset in assets:
    if asset['triangles'] > 15000:
        asset['performanceFlag'] = 'REVIEW_HIGH_TRIANGLE_COUNT'
    elif asset['bytes'] > 1024 * 1024:
        asset['performanceFlag'] = 'REVIEW_LARGE_FILE'
    else:
        asset['performanceFlag'] = 'LOW_WEIGHT_SOURCE_MODEL'

assets_by_district = {
    district: [
        {'id': a['id'], 'name': a['name'], 'category': a['category'], 'file': a['file'],
         'bytes': a['bytes'], 'triangles': a['triangles'], 'license': a['license'],
         'sourcePage': a['sourcePage']}
        for a in assets if district in a['recommendedDistricts']
    ]
    for district in districts
}
for district, district_assets in assets_by_district.items():
    slug = district.lower().replace(' ', '-')
    manifest = {
        'district': district,
        'visualIdentity': districts[district]['visualIdentity'],
        'buildingMix': districts[district]['buildingMix'],
        'streetAndEnvironment': districts[district]['streetAndEnvironment'],
        'assets': district_assets,
        'needsCustom': districts[district]['needsCustom'],
        'runtimeNote': 'This is a sourcing and review list. Place selected assets as shared instances and stream them by distance; do not instantiate the full list at once.'
    }
    (DISTRICT_MANIFESTS / f'{slug}.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

index = {
  'name': 'Naija City Fictional Lagos — district asset library',
  'version': 1,
  'styleTarget': 'low-poly semi-realism: restrained stylization, realistic scale, PBR-compatible lighting/material treatment, authentic district composition',
  'runtimePolicy': 'Library-only. Models are not automatically loaded or placed into the live world. Stream only assets required by a nearby district and reuse shared models as instances.',
  'sourcePacks': [{
    'id': k,
    'page': v['url'],
    'license': v['license'],
    'credit': v['credit'],
    'archive': v['zip'],
  } for k,v in SOURCES.items()],
  'districts': districts,
  'assetsByDistrict': assets_by_district,
  'districtManifestPaths': {d: f'assets/fictional-lagos/district-manifests/{d.lower().replace(" ", "-")}.json' for d in districts},
  'assetCount': len(assets),
  'totalGLBBytes': sum(a['bytes'] for a in assets),
  'sharedTextureAtlases': shared_textures,
  'totalSharedTextureBytes': sum(t['bytes'] for t in shared_textures),
  'totalBytes': sum(a['bytes'] for a in assets) + sum(t['bytes'] for t in shared_textures),
  'totalTriangles': sum(a['triangles'] for a in assets),
  'assets': assets,
}
(OUT / 'asset-library.json').write_text(json.dumps(index, indent=2) + '\n', encoding='utf-8')

with (OUT / 'asset-register.csv').open('w', newline='', encoding='utf-8') as f:
    fields = ['id','name','sourcePack','sourcePage','sourceAssetPath','license','credit','file','bytes','triangles','vertices','materials','sha256','performanceFlag','modifications','verificationState']
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    for a in assets:
        row = {k:a.get(k,'') for k in fields}
        row['modifications'] = 'Extracted unchanged from the downloaded source archive; no mesh or texture edits.'
        row['verificationState'] = 'downloaded, GLB structure parsed, license verified from source archive'
        w.writerow(row)

with (OUT / 'texture-register.csv').open('w', newline='', encoding='utf-8') as f:
    fields = ['id','sourcePack','sourcePage','license','credit','file','bytes','sha256','verificationState']
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    for texture in shared_textures:
        w.writerow({k:texture.get(k,'') for k in fields})

print(json.dumps({
    'assetCount':len(assets),
    'totalGLBBytes':sum(a['bytes'] for a in assets),
    'totalSharedTextureBytes':sum(t['bytes'] for t in shared_textures),
    'totalLibraryBytes':sum(a['bytes'] for a in assets) + sum(t['bytes'] for t in shared_textures),
    'totalMiB':round((sum(a['bytes'] for a in assets) + sum(t['bytes'] for t in shared_textures))/1024/1024,2),
    'totalTriangles':sum(a['triangles'] for a in assets),
    'categories':{c:sum(1 for a in assets if a['category']==c) for c in sorted({a['category'] for a in assets})},
    'flags':{flag:sum(1 for a in assets if a['performanceFlag']==flag) for flag in sorted({a['performanceFlag'] for a in assets})},
    'missing':missing,
}, indent=2))
