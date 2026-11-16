// Stage 08G: a distinct Ikeja commercial street-life prototype, south of the existing Yaba test area.
// Original low-poly props only; static environment dressing is not represented as live NPC/traffic simulation.
export function createStage08GIkejaStreetLife({ app, box, material }) {
  const mats = {
    asphalt: material([0.105,0.115,0.12]), asphaltPatch: material([0.16,0.165,0.16]),
    concrete: material([0.48,0.46,0.41]), curb: material([0.62,0.59,0.52]),
    gutter: material([0.075,0.085,0.08]), silt: material([0.25,0.22,0.16]),
    metal: material([0.22,0.25,0.25],0.42), rust: material([0.34,0.19,0.11],0.18),
    wood: material([0.34,0.22,0.13]), carton: material([0.48,0.34,0.2]),
    plastic: material([0.16,0.28,0.34]), bottle: material([0.12,0.34,0.25]),
    yellow: material([0.88,0.68,0.12]), blue: material([0.08,0.24,0.48]),
    danfo: material([0.9,0.72,0.08]), red: material([0.62,0.12,0.08]),
    green: material([0.08,0.34,0.2]), white: material([0.82,0.82,0.76]),
    dark: material([0.045,0.05,0.05]), skin: material([0.36,0.19,0.105]),
    shirtA: material([0.12,0.28,0.42]), shirtB: material([0.52,0.2,0.12]),
    shirtC: material([0.12,0.34,0.2]), trousers: material([0.08,0.09,0.1]),
    facadeA: material([0.66,0.54,0.39]), facadeB: material([0.48,0.55,0.54]),
    facadeC: material([0.62,0.62,0.53]), glass: material([0.08,0.18,0.22],0.25)
  };
  const group=app.batcher?.addGroup('stage08g-ikeja-static-street-life',false,96);
  let meshes=0;
  const detail=(name,pos,size,mat,rotation=null)=>{
    const e=box('stage08g-'+name,pos,size,mat);
    e.tags.add('stage08g-ikeja-street-life');
    if(group&&e.render)e.render.batchGroupId=group.id;
    if(rotation)e.setEulerAngles(...rotation);
    meshes++;
    return e;
  };
  const Z=310;
  // A short connecting approach leads from the existing district edge into the Ikeja test street.
  detail('approach-road',[0,-0.12,205],[11,0.22,82],mats.asphalt);
  detail('approach-left-walkway',[-6.7,0.02,205],[2.2,0.18,82],mats.concrete);
  detail('approach-right-walkway',[6.7,0.02,205],[2.2,0.18,82],mats.concrete);
  // Ikeja commercial corridor: broad carriageway, uneven sidewalks and mixed-use shop rows.
  detail('main-road',[0,-0.12,Z],[14,0.22,150],mats.asphalt);
  for(const side of [-1,1]){
    detail('sidewalk',[side*8.5,0.02,Z],[2.7,0.2,150],mats.concrete);
    detail('kerb',[side*7.05,0.14,Z],[0.22,0.28,150],mats.curb);
    detail('open-gutter',[side*10.05,0.02,Z],[0.42,0.12,150],mats.gutter);
    for(let z=244;z<382;z+=19){
      detail('drain-cover',[side*10.05,0.13,z],[0.72,0.08,1.45],mats.metal);
      detail('gutter-silt',[side*9.76,0.095,z+2.4],[0.18,0.035,1.9],mats.silt);
    }
    for(let i=0;i<7;i++){
      const z=250+i*20, h=5.2+(i%3)*1.1;
      detail('mixed-use-shop-shell',[side*17.4,h/2,z],[9.2,h,13.5],[mats.facadeA,mats.facadeB,mats.facadeC][i%3]);
      detail('shopfront-glazing',[side*17.4,1.65,z-6.82],[6.4,2.8,0.12],mats.glass);
      detail('shop-sign-fascia',[side*17.4,3.35,z-6.94],[7.5,0.62,0.18],i%2?mats.blue:mats.green);
      detail('security-grille',[side*17.4,1.55,z-7.05],[6.8,2.2,0.08],mats.metal);
      detail('upper-window',[side*17.4,4.45,z-6.9],[2.8,1.2,0.12],mats.glass);
      detail('awning',[side*12.25,2.65,z-6.2],[2.5,0.16,2.0],i%2?mats.red:mats.yellow);
    }
  }
  // Road wear is localized: resurfacing strips, patched cuts, a few shallow pothole impressions.
  for(const [x,z,w,d] of [[-3.8,267,2.2,7],[2.8,292,2.5,5],[-1.6,334,3.1,6],[4.2,365,2.4,4],[-5.1,386,1.6,3]]){
    detail('asphalt-repair-patch',[x,0.005,z],[w,0.025,d],mats.asphaltPatch);
  }
  for(const [x,z] of [[-2.2,281],[3.6,347],[-4.8,373]]){
    detail('shallow-road-depression',[x,0.012,z],[1.25,0.025,0.82],mats.dark);
  }
  // Commercial street clutter: umbrella food stalls, POS counter, tables, chairs and handcarts.
  const stalls=[[-9.0,260,mats.red], [9.0,286,mats.green],[-9.0,326,mats.blue],[9.0,358,mats.yellow]];
  for(const [x,z,canopy] of stalls){
    detail('vendor-table',[x,0.95,z],[1.9,0.16,1.25],mats.wood);
    for(const dx of [-0.78,0.78])for(const dz of [-0.48,0.48])detail('table-leg',[x+dx,0.48,z+dz],[0.09,0.9,0.09],mats.metal);
    detail('umbrella-pole',[x,1.85,z],[0.09,1.9,0.09],mats.metal);
    detail('umbrella-canopy',[x,2.85,z],[2.7,0.18,2.7],canopy);
    detail('goods-display',[x,1.12,z-0.3],[1.25,0.28,0.62],mats.carton);
    detail('plastic-chair',[x+1.45,0.48,z+0.9],[0.55,0.85,0.55],mats.plastic);
  }
  // POS booth, stacked cartons, beverage crates, jerrycans, generator and wheelbarrow.
  detail('pos-kiosk',[-10.8,1.15,300],[1.7,2.3,1.8],mats.green);
  detail('pos-sign',[-10.8,2.55,299.05],[1.2,0.42,0.08],mats.white);
  for(const [x,z] of [[-11.2,316],[10.8,342],[-10.7,374]]){
    for(let i=0;i<3;i++)detail('stacked-carton',[x+(i%2)*0.48,0.42+Math.floor(i/2)*0.62,z],[0.48,0.78,0.42],mats.carton);
    detail('beverage-crate',[x+0.9,0.35,z+0.3],[0.72,0.55,0.62],mats.blue);
    detail('jerrycan',[x-0.75,0.38,z+0.55],[0.42,0.72,0.38],mats.yellow);
  }
  detail('small-generator',[-9.9,0.55,344],[0.9,0.95,0.72],mats.dark);
  detail('generator-frame',[-9.9,1.05,344],[1.0,0.08,0.82],mats.rust);
  detail('wheelbarrow-tray',[10.2,0.82,314],[1.25,0.22,0.72],mats.metal,[0,0,-7]);
  detail('wheelbarrow-wheel',[10.2,0.38,314.5],[0.18,0.42,0.42],mats.dark,[0,0,90]);
  detail('handcart-platform',[-10.3,0.38,362],[1.45,0.18,0.9],mats.wood);
  for(const dx of [-0.55,0.55])detail('handcart-wheel',[-10.3+dx,0.25,362.35],[0.16,0.42,0.42],mats.dark,[0,0,90]);
  // Controlled litter hotspots beside activity and drainage, not a blanket layer across the road.
  for(const [x,z] of [[-9.55,264],[9.7,289],[-9.6,331],[10.0,371]]){
    detail('bottle-litter',[x,0.13,z],[0.18,0.28,0.18],mats.bottle,[0,0,28]);
    detail('carton-litter',[x+0.34,0.06,z+0.42],[0.32,0.12,0.24],mats.carton,[0,18,4]);
    detail('sachet-litter',[x-0.26,0.045,z+0.25],[0.24,0.025,0.18],mats.white,[0,0,12]);
  }
  // Utility poles and overhead lines, with a restrained number of signboards.
  for(const side of [-1,1]){
    for(const z of [248,292,336,380]){
      detail('utility-pole',[side*11.3,4.3,z],[0.24,8.6,0.24],mats.rust);
      detail('pole-crossarm',[side*11.3,7.9,z],[1.25,0.14,0.16],mats.metal);
    }
    for(const z of [270,314,358]){
      detail('streetlight-pole',[side*11.2,3.3,z],[0.14,6.6,0.14],mats.metal);
      detail('streetlight-head',[side*10.8,6.5,z],[0.65,0.16,0.3],mats.yellow);
    }
  }
  for(const [x,z] of [[-6.4,247],[6.4,382]]){
    detail('direction-sign-post',[x,1.8,z],[0.12,3.6,0.12],mats.metal);
    detail('direction-sign-board',[x,3.1,z],[1.8,0.78,0.12],mats.blue);
  }
  // Parked public transport and cars are static art props, not simulated traffic.
  function vehicle(name,x,z,length,width,height,body,roof){
    detail(name+'-body',[x,0.72,z],[width,1.0,length],body);
    detail(name+'-roof',[x,1.52,z-0.12],[width*0.86,0.72,length*0.56],roof);
    for(const side of [-1,1])for(const dz of [-length*0.32,length*0.32])
      detail(name+'-window',[x+side*(width/2+0.012),1.45,z+dz],[0.035,0.48,length*0.2],mats.glass);
    for(const side of [-1,1])for(const dz of [-length*0.34,length*0.34])
      detail(name+'-wheel',[x+side*(width/2),0.38,z+dz],[0.22,0.48,0.48],mats.dark,[0,0,90]);
  }
  vehicle('parked-danfo-minibus',-3.8,278,5.2,2.0,2.3,mats.danfo,mats.yellow);
  vehicle('parked-keke',4.7,350,2.4,1.35,1.9,mats.green,mats.yellow);
  vehicle('parked-sedan',3.8,390,4.0,1.8,1.8,mats.white,mats.blue);
  // Static human silhouettes add scale and a lived-in street read; no crowd AI is claimed.
  const people=[[-8.2,271,mats.shirtA], [8.1,300,mats.shirtB],[-8.2,340,mats.shirtC],[8.0,366,mats.shirtA]];
  for(const [x,z,shirt] of people){
    detail('pedestrian-torso',[x,1.15,z],[0.48,0.72,0.3],shirt);
    detail('pedestrian-head',[x,1.72,z],[0.34,0.38,0.32],mats.skin);
    for(const dx of [-0.14,0.14])detail('pedestrian-leg',[x+dx,0.43,z],[0.15,0.72,0.16],mats.trousers);
  }
  const solidName = /(?:mixed-use-shop-shell|pos-kiosk|parked-.*-body|vendor-table|umbrella-pole|utility-pole|streetlight-pole)/;
  const collisionProxies = (app.root.findByTag('stage08g-ikeja-street-life') || [])
    .filter(entity => solidName.test(entity.name))
    .map(entity => {
      const p = entity.getPosition(), size = entity.getLocalScale(), r = entity.getEulerAngles();
      return { id: entity.name + '-' + entity.getGuid(), position: [p.x,p.y,p.z],
        halfExtents: [Math.abs(size.x)/2,Math.abs(size.y)/2,Math.abs(size.z)/2],
        rotationY: r.y, source: 'stage08g-ikeja-street-life' };
    });
  return {
    stage:'08G',district:'Ikeja',prototypeBounds:{min:[-24,-1,164],max:[24,10,402]},
    collisionProxies,
    corridor:'Ikeja commercial street-life prototype',roadLengthMetres:150,
    staticPropMeshes:meshes,staticBatching:Boolean(group),batchGroupId:group?.id??null,
    vendorStalls:stalls.length,parkedVehicles:3,staticPedestrianSilhouettes:people.length,
    litterHotspots:4,openDrainageRuns:2,utilityPoleCount:8,
    liveNpcAI:false,liveTrafficSimulation:false,
    features:['Ikeja commercial shopfronts','vendor umbrellas and tables','POS kiosk','plastic chairs','cartons and beverage crates','jerrycans and generator','wheelbarrow and handcart','selective roadside litter','open gutters and drain covers','patched asphalt and shallow road defects','utility poles and streetlights','parked danfo minibus, keke and sedan','static pedestrian silhouettes'],
    note:'A focused static Ikeja street-life art prototype connected to the existing district by an approach road. Static silhouettes and vehicles are not animated NPCs or live traffic.'
  };
}
