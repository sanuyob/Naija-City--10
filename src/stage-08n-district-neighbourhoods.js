import * as pc from 'playcanvas';

const DISTRICTS = [
  { id:'eko-cbd', district:'Eko CBD', region:'Lagos', hub:[1140,-3.9379220462,-935], lots:[
    {x:1131,z:-980,y:-3.9379,role:'shop',name:'Obalende Print & Parcel',kind:'commercial',service:'Print, copy and parcel supplies',product:'print-pack',price:650},
    {x:1149,z:-980,y:-3.9379,role:'home',name:'Broad Street Courtyard Flat',kind:'residential'},
    {x:1185,z:-944,y:-3.9379,role:'shell',name:'Finance House Annex',kind:'office'},
    {x:1185,z:-926,y:-3.9379,role:'shell',name:'Court View Apartments',kind:'residential'}
  ], colours:{wall:[.64,.54,.42],trim:[.11,.22,.3],accent:[.78,.43,.16],roof:[.15,.19,.21]}, people:['Shopkeeper','Office Courier','Resident']},
  { id:'victoria-island', district:'Victoria Island', region:'Lagos', hub:[1615,-4.0511898676,-1395], lots:[
    {x:1624,z:-1350,y:-4.0512,role:'shop',name:'Victoria Tailors & Textiles',kind:'commercial',service:'Tailoring, fabrics and repairs',product:'fabric-kit',price:1200},
    {x:1660,z:-1386,y:-4.0512,role:'home',name:'Oniru Garden Apartment',kind:'residential'},
    {x:1576,z:-1371,y:-4.068,role:'shell',name:'Island Creative Offices',kind:'office'},
    {x:1591,z:-1356,y:-4.068,role:'shell',name:'Atlantic Court Residences',kind:'residential'}
  ], colours:{wall:[.76,.72,.62],trim:[.13,.2,.27],accent:[.57,.29,.22],roof:[.16,.2,.23]}, people:['Tailor','Office Worker','Resident']},
  { id:'ikoyi', district:'Ikoyi', region:'Lagos', hub:[2175,-4.7379935332,-925], lots:[
    {x:2130,z:-934,y:-4.738,role:'shop',name:'Ikoyi Marina Grocers',kind:'commercial',service:'Groceries and cold drinks',product:'market-basket',price:900},
    {x:2108,z:-922,y:-4.738,role:'home',name:'Park View Duplex',kind:'residential'},
    {x:2166,z:-970,y:-4.738,role:'shell',name:'Awolowo Business Suites',kind:'office'},
    {x:2166,z:-880,y:-4.1532,role:'shell',name:'Ikoyi Palm Court',kind:'residential'}
  ], colours:{wall:[.7,.68,.59],trim:[.12,.24,.25],accent:[.2,.38,.34],roof:[.18,.21,.2]}, people:['Grocer','Delivery Rider','Resident']},
  { id:'lekki', district:'Lekki', region:'Lagos', hub:[2955,-1.4392910237,-1335], lots:[
    {x:2910,z:-1344,y:-1.4393,role:'shop',name:'Lekki Fresh Mart',kind:'commercial',service:'Fresh fruit, snacks and water',product:'fresh-pack',price:750},
    {x:2946,z:-1380,y:-1.4393,role:'home',name:'Chevron Garden Bungalow',kind:'residential'},
    {x:2946,z:-1290,y:.763,role:'shell',name:'Coastal Co-Work Studio',kind:'office'},
    {x:2964,z:-1290,y:.763,role:'shell',name:'Lekki Palm Villas',kind:'residential'}
  ], colours:{wall:[.75,.67,.5],trim:[.1,.26,.23],accent:[.16,.42,.32],roof:[.17,.23,.2]}, people:['Market Seller','Beach Visitor','Resident']},
  { id:'ekiti-highlands', district:'Ekiti Highlands', region:'Ekiti', hub:[3420,-3.9698225368,-540], lots:[
    {x:3375,z:-549,y:-4.6275,role:'shop',name:'Ado Highlands Farm Store',kind:'commercial',service:'Farm produce and local provisions',product:'farm-crate',price:1100},
    {x:3375,z:-531,y:-4.6275,role:'home',name:'Efon Ridge Family Home',kind:'residential'},
    {x:3411,z:-585,y:-3.9698,role:'shell',name:'Highlands Cooperative Office',kind:'office'},
    {x:3429,z:-585,y:-3.9698,role:'shell',name:'Ridge View Courtyard Homes',kind:'residential'}
  ], colours:{wall:[.59,.48,.34],trim:[.19,.29,.18],accent:[.55,.34,.13],roof:[.16,.2,.15]}, people:['Produce Seller','Farm Courier','Resident']}
];

const HALF = { x:6.5, z:5.5, wallHeight:3.65 };

function rotateXZ(x,z,yaw){
  const a=yaw*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return [x*c+z*s,-x*s+z*c];
}
function worldPoint(origin,local,yaw){
  const [dx,dz]=rotateXZ(local[0],local[2],yaw);
  return [origin[0]+dx,origin[1]+local[1],origin[2]+dz];
}
function obbOverlap(a,b,margin=0){
  const axes=[];
  for(const o of [a,b]){const r=(o.rotationY||0)*Math.PI/180;axes.push([Math.cos(r),Math.sin(r)],[-Math.sin(r),Math.cos(r)]);}
  for(const [ax,az] of axes){
    const proj=o=>{const r=(o.rotationY||0)*Math.PI/180;return Math.abs(ax*Math.cos(r)+az*Math.sin(r))*o.halfExtents[0]+Math.abs(-ax*Math.sin(r)+az*Math.cos(r))*o.halfExtents[2];};
    const distance=Math.abs((a.position[0]-b.position[0])*ax+(a.position[2]-b.position[2])*az);
    if(distance>proj(a)+proj(b)-margin)return false;
  }
  return true;
}

export function createStage08NDistrictNeighbourhoods({app,box,material,manifest,onDoorAction=()=>{}}={}){
  if(!app||!box||!material||!manifest?.cells?.length)throw new Error('Stage 08N requires PlayCanvas helpers and the surveyed GIDI manifest.');
  const manifestColliders=manifest.cells.flatMap(cell=>cell.colliders||[]);
  const environmentObstacles=manifestColliders.filter(item=>item.kind==='road'||item.kind==='building');
  const terrain=manifestColliders.filter(item=>item.kind==='terrain');
  const collisionProxies=[],doorProxies=[],buildings=[],doors=[],shops=[],npcSpawns=[],batchGroupIds=[];
  let details=0,elapsed=0,interactionRemovers=[];
  const districtNpcs=[],trafficVehicles=[];
  const districtEntities=new Map(),districtActive=new Map(),districtBatchGroups=new Map();
  let activeDistrictId=null,playerPhysicsRef=null;
  const roadColliders=manifestColliders.filter(item=>item.kind==='road');
  const shared={floor:material([.35,.31,.26]),interior:material([.7,.65,.57]),glass:material([.1,.24,.28],.3),wood:material([.3,.19,.12]),metal:material([.2,.24,.25],.5),dark:material([.055,.065,.07]),white:material([.84,.82,.75]),concrete:material([.49,.47,.42])};
  const addBox=(name,parent,position,scale,mat,{collide=false,batch=true}={})=>{
    const entity=box(name,position,scale,mat,parent);
    if(activeDistrictId)districtEntities.get(activeDistrictId)?.push(entity);
    entity.tags.add('stage08n-neighbourhood');
    if(batch&&entity.render&&parent?.batchGroupId!=null)entity.render.batchGroupId=parent.batchGroupId;
    details++;
    const parentYaw=Number.isFinite(parent.stage08nYaw)?parent.stage08nYaw:parent.getEulerAngles().y;
    if(collide)collisionProxies.push({id:'stage08n:'+name,position:worldPoint(parent.getPosition().toArray(),position,parentYaw),halfExtents:scale.map(v=>Math.abs(v)/2),rotationY:parentYaw,source:'stage08n-neighbourhood',districtId:activeDistrictId});
    return entity;
  };
  const ensurePlacement=(district,lot,rotationY)=>{
    const land=terrain.find(t=>Math.abs(lot.x-t.position[0])<=t.halfExtents[0]-8&&Math.abs(lot.z-t.position[2])<=t.halfExtents[2]-8);
    if(!land)throw new Error(`${district}: ${lot.name} is not placed on a surveyed terrain tile.`);
    const proposed={position:[lot.x,lot.y+2.1,lot.z],halfExtents:[HALF.x,2.1,HALF.z],rotationY};
    const hit=environmentObstacles.find(item=>obbOverlap(proposed,item,.8));
    if(hit)throw new Error(`${district}: ${lot.name} overlaps ${hit.id}.`);
    if(buildings.some(item=>obbOverlap(proposed,item.obb,1.0)))throw new Error(`${district}: ${lot.name} overlaps another Stage 08N building.`);
    return land;
  };
  const makeFurnishing=(root,id,position,scale,mat,solid=false)=>addBox(id,root,position,scale,mat,{collide:solid});

  for(const district of DISTRICTS){
    activeDistrictId=district.id;
    districtEntities.set(district.id,[]);districtActive.set(district.id,false);
    const group=app.batcher?.addGroup('stage08n-'+district.id+'-neighbourhood',false,40)||null;
    if(group){batchGroupIds.push(group.id);districtBatchGroups.set(district.id,group.id);}
    const mats={wall:material(district.colours.wall),trim:material(district.colours.trim),accent:material(district.colours.accent),roof:material(district.colours.roof),sign:material([.1,.13,.15])};
    for(let index=0;index<district.lots.length;index++){
      const lot=district.lots[index];
      const yaw=Math.atan2(district.hub[0]-lot.x,district.hub[2]-lot.z)*180/Math.PI;
      ensurePlacement(district.district,lot,yaw);
      const root=new pc.Entity('stage08n-'+district.id+'-'+index+'-'+lot.role);
      root.setPosition(lot.x,lot.y,lot.z);root.setEulerAngles(0,yaw,0);root.stage08nYaw=yaw;root.batchGroupId=group?.id??null;app.root.addChild(root);districtEntities.get(district.id).push(root);
      const enterable=true;
      const width=lot.role==='home'?14:13,depth=lot.role==='home'?12:11,height=lot.role==='home'?3.9:4.25;
      const hx=width/2,hz=depth/2;
      if(enterable){
        addBox(lot.name+'-interior-floor',root,[0,.08,0],[width,.16,depth],shared.floor,{collide:true});
        addBox(lot.name+'-front-entry-step',root,[0,.09,hz+.62],[2.45,.18,1.24],shared.concrete,{collide:true});
        addBox(lot.name+'-pedestrian-entry-path',root,[0,.07,hz+2.35],[2.2,.14,2.2],shared.concrete,{collide:true});
        addBox(lot.name+'-rear-wall',root,[0,height/2,-hz],[width,height,.24],mats.wall,{collide:true});
        addBox(lot.name+'-left-wall',root,[-hx,height/2,0],[.24,height,depth],mats.wall,{collide:true});
        addBox(lot.name+'-right-wall',root,[hx,height/2,0],[.24,height,depth],mats.wall,{collide:true});
        const gap=1.9,segment=(width-gap)/2;
        addBox(lot.name+'-front-left',root,[-(gap/2+segment/2),height/2,hz],[segment,height,.24],mats.wall,{collide:true});
        addBox(lot.name+'-front-right',root,[(gap/2+segment/2),height/2,hz],[segment,height,.24],mats.wall,{collide:true});
        addBox(lot.name+'-door-lintel',root,[0,height-.16,hz],[gap,.32,.24],mats.wall,{collide:true});
        const roof=addBox(lot.name+'-roof',root,[0,height+.18,0],[width+.42,.36,depth+.42],mats.roof);
        roof.tags.add('stage08n-hide-inside');
        addBox(lot.name+'-fascia',root,[0,height-.03,hz+.17],[width+.28,.28,.34],mats.trim);
        addBox(lot.name+'-front-sign',root,[0,height-.62,hz+.2],[3.8,.65,.13],mats.sign);
        addBox(lot.name+'-window-left',root,[-hx-.02,2.15,1.3],[.08,1.05,2.35],shared.glass);
        addBox(lot.name+'-window-right',root,[hx+.02,2.15,1.3],[.08,1.05,2.35],shared.glass);
        // A real hinge hierarchy: the panel rotates around its left edge, not its centre.
        const pivot=new pc.Entity(lot.name+'-hinged-door-pivot');
        pivot.setLocalPosition(-gap/2,0,hz-.16);root.addChild(pivot);
        const panel=box(lot.name+'-hinged-door-panel',[gap/2,1.52,0],[gap,3.04,.12],mats.trim,pivot);
        districtEntities.get(district.id).push(panel);
        panel.tags.add('stage08n-dynamic-door');
        addBox(lot.name+'-door-handle',pivot,[gap-.16,1.48,.09],[.055,.32,.12],shared.metal,{batch:false});
        const doorWorld=worldPoint(root.getPosition().toArray(),[0,1.52,hz-.16],yaw);
        const doorIndex=doorProxies.length;
        doorProxies.push({id:'stage08n-door:'+district.id+':'+index,position:doorWorld,halfExtents:[gap/2,1.52,.075],rotationY:yaw,source:'stage08n-door',districtId:district.id});
        const entrance=worldPoint(root.getPosition().toArray(),[0,0,hz+1.1],yaw);
        const door={id:'stage08n-door-'+district.id+'-'+index,district:district.district,districtId:district.id,name:lot.name,root,pivot,panel,roof,doorIndex,doorProxy:doorProxies[doorIndex],entrance,open:false,angle:0,targetAngle:0,manual:false,autoUntil:0,position:[lot.x,lot.y,lot.z],yaw,halfExtents:[hx,depth/2],};
        doors.push(door);
        if(lot.role==='shop'){
          makeFurnishing(root,lot.name+'-service-counter',[0,.58,-1.8],[6.3,1.05,1.0],mats.accent,true);
          makeFurnishing(root,lot.name+'-countertop',[0,1.14,-1.8],[6.45,.12,1.08],shared.wood);
          for(let shelf=0;shelf<3;shelf++){
            makeFurnishing(root,lot.name+'-stock-shelf-'+shelf,[-hx+1.0, .95+shelf*.72,-hz+1.05],[.48,2.2,.45],mats.trim,true);
            makeFurnishing(root,lot.name+'-shelf-board-'+shelf,[-hx+1.27,.55+shelf*.72,-hz+1.05],[.68,.08,.52],shared.wood);
          }
          makeFurnishing(root,lot.name+'-display-fridge',[hx-1.05,1.3,-hz+1.25],[1.2,2.6,1.1],shared.glass,true);
          makeFurnishing(root,lot.name+'-cash-register',[1.9,1.28,-1.82],[.5,.18,.42],shared.dark);
          makeFurnishing(root,lot.name+'-waiting-bench',[3.1,.48,1.1],[2.2,.18,.52],shared.wood);
          shops.push({id:'stage08n-shop-'+district.id,district:district.district,name:lot.name,service:lot.service,product:lot.product,price:lot.price,doorId:doors[doors.length-1].id,position:worldPoint(root.getPosition().toArray(),[0,0,-.9],yaw),owner:district.people[0]});
        }else if(lot.role==='home'){
          makeFurnishing(root,lot.name+'-living-room-sofa',[-2.6,.55,-1.1],[3.2,.75,1.15],mats.accent);
          makeFurnishing(root,lot.name+'-coffee-table',[-2.4,.48,.3],[1.55,.12,.85],shared.wood);
          makeFurnishing(root,lot.name+'-dining-table',[2.4,.82,-1.15],[2.25,.14,1.2],shared.wood);
          for(const [dx,dz] of [[1.4,-1.15],[3.35,-1.15],[1.4,-.05],[3.35,-.05]])makeFurnishing(root,lot.name+'-dining-chair-'+dx+'-'+dz,[dx,.52,dz],[.48,.95,.48],mats.trim);
          makeFurnishing(root,lot.name+'-kitchen-island',[0,.58,-3.5],[2.8,1.0,.95],shared.interior,true);
          makeFurnishing(root,lot.name+'-bed-frame',[3.6,.33,2.8],[2.8,.55,3.1],shared.wood);
          makeFurnishing(root,lot.name+'-wardrobe',[hx-1,.95,2.55],[1.2,1.9,.85],mats.trim,true);
        }else if(lot.kind==='office'){
          makeFurnishing(root,lot.name+'-reception-desk',[0,.58,-1.8],[4.2,1.05,1.0],mats.accent,true);
          makeFurnishing(root,lot.name+'-meeting-table',[0,.78,-3.65],[3.1,.14,1.35],shared.wood);
          for(let seat=0;seat<4;seat++)makeFurnishing(root,lot.name+'-meeting-chair-'+seat,[-1.7+(seat%2)*3.4,.48,-4.65+Math.floor(seat/2)*1.9],[.55,.85,.55],mats.trim);
          makeFurnishing(root,lot.name+'-filing-cabinet',[hx-1,.95,2.2],[1.0,1.9,.8],mats.trim,true);
        }else{
          makeFurnishing(root,lot.name+'-apartment-lounge-sofa',[-2.4,.55,-1.3],[3.2,.75,1.05],mats.accent);
          makeFurnishing(root,lot.name+'-apartment-kitchen',[2.8,.58,-3.4],[2.4,1.0,.9],shared.interior,true);
          makeFurnishing(root,lot.name+'-apartment-bed',[3.3,.34,2.8],[2.7,.55,3.0],shared.wood);
        }
        const plazaPoints=[
          worldPoint(root.getPosition().toArray(),[0,0,hz+1.3],yaw),
          worldPoint(root.getPosition().toArray(),[0,0,hz+5.5],yaw),
          worldPoint(root.getPosition().toArray(),[3.0,0,hz+6.8],yaw),
          worldPoint(root.getPosition().toArray(),[-3.0,0,hz+6.8],yaw)
        ];
        {
          const groundY=lot.y;
          const localStart=lot.role==='shop'?[0,0,-2.8]:lot.role==='home'?[0,0,-2.2]:[0,0,-2.6];
          const start=worldPoint(root.getPosition().toArray(),localStart,yaw);
          const role=lot.role==='shop'?district.people[0]:lot.kind==='office'?district.people[1]:district.people[2];
          const schedule=lot.role==='shop'?{start:7,end:22}:lot.kind==='office'?{start:8,end:18}:{start:6,end:23};
          const spawn={id:'stage08n-npc-'+district.id+'-'+index,role,district:district.district,x:start[0],z:start[2],y:groundY,groundY,shirt:district.colours.accent,skin:[.35,.2,.13],route:[start,worldPoint(root.getPosition().toArray(),[0,0,hz-.35],yaw),plazaPoints[0],plazaPoints[1],plazaPoints[2],plazaPoints[1]],schedule};
          npcSpawns.push(spawn);
        }
      }
      const facadeFront=worldPoint(root.getPosition().toArray(),[0,0,hz+1.8],yaw);
      buildings.push({id:district.id+'-'+index,name:lot.name,district:district.district,districtId:district.id,root,kind:lot.kind,role:lot.role,enterable,position:[lot.x,lot.y,lot.z],yaw,obb:{position:[lot.x,lot.y+height/2,lot.z],halfExtents:[width/2,height/2,depth/2],rotationY:yaw},doorId:enterable?doors[doors.length-1].id:null,facadeFront});
    }
    // A small neighbourhood forecourt ties the four plots together without adding road obstacles.
    const hub=district.hub;
    const plaza=box('stage08n-'+district.id+'-shared-plaza',[hub[0]-18,hub[1]+.035,hub[2]-19],[13,.07,5.5],shared.concrete);
    plaza.tags.add('stage08n-neighbourhood');
    if(group&&plaza.render)plaza.render.batchGroupId=group.id;districtEntities.get(district.id).push(plaza);
    for(let bench=0;bench<2;bench++){
      const e=box('stage08n-'+district.id+'-plaza-bench-'+bench,[hub[0]-20+bench*4,hub[1]+.48,hub[2]-19],[2.2,.16,.55],shared.wood);
      if(group&&e.render)e.render.batchGroupId=group.id;districtEntities.get(district.id).push(e);details++;
    }
    for(const entity of districtEntities.get(district.id))entity.enabled=false;
  }
  activeDistrictId=null;

  function setDoorOpen(door,open,manual=false,callback=onDoorAction){
    if(!door)return false;
    const desired=Boolean(open);
    if(door.open===desired&&door.targetAngle===(desired?-100:0)){if(manual)door.manual=!desired;return true;}
    door.open=desired;door.manual=manual?desired:false;door.targetAngle=desired?-100:0;
    if(doorRuntimeReady)doorRuntimeSet(door,!desired&&districtActive.get(door.districtId)===true);
    if(manual)callback({door,open:desired});
    return true;
  }
  let doorRuntimeReady=false,doorRuntimeSet=()=>false;
  const collisionOwnerIds=new Map(),doorOwnerIds=new Map();
  function attachRuntime({playerPhysics}={}){
    if(!playerPhysics?.addStaticColliders||!playerPhysics?.setStaticColliderEnabled)throw new Error('Stage 08N requires dynamic Bullet door colliders.');
    playerPhysicsRef=playerPhysics;
    for(const district of DISTRICTS){
      const walls=collisionProxies.filter(item=>item.districtId===district.id);
      const owner='stage08n-walls-'+district.id;
      playerPhysics.addStaticColliders(walls,owner);collisionOwnerIds.set(district.id,owner);
      for(let index=0;index<walls.length;index++)playerPhysics.setStaticColliderEnabled(owner,index,false);
      const districtDoors=doorProxies.filter(item=>item.districtId===district.id);
      const doorOwner='stage08n-doors-'+district.id;
      playerPhysics.addStaticColliders(districtDoors,doorOwner);doorOwnerIds.set(district.id,doorOwner);
      for(let index=0;index<districtDoors.length;index++)playerPhysics.setStaticColliderEnabled(doorOwner,index,false);
    }
    for(const door of doors){const index=doorProxies.filter(item=>item.districtId===door.districtId).findIndex(item=>item.id===door.doorProxy.id);door.doorColliderLocalIndex=index;}
    doorRuntimeSet=(door,enabled)=>playerPhysics.setStaticColliderEnabled(doorOwnerIds.get(door.districtId),door.doorColliderLocalIndex,enabled);
    doorRuntimeReady=true;
    return {doors:doors.length,wallColliders:collisionProxies.length,doorColliders:doorProxies.length};
  }
  function registerInteractions(interactionSystem,{economy}={}){
    if(!interactionSystem?.register)throw new Error('Stage 08N requires the world interaction registry.');
    for(const door of doors){
      interactionRemovers.push(interactionSystem.register({id:door.id,name:door.name+' door',position:door.entrance,range:3.0,prompt:()=>`${door.open?'CLOSE':'OPEN'} DOOR · ${door.name.toUpperCase()}`,onInteract:()=>{
        const next=!door.open;setDoorOpen(door,next,true);return {message:(next?'Door opened · ':'Door closed · ')+door.name};
      }}));
    }
    for(const shop of shops){
      interactionRemovers.push(interactionSystem.register({id:shop.id,name:shop.name+' counter',position:shop.position,range:3.6,prompt:'SHOP · '+shop.name.toUpperCase(),canInteract:()=>doors.find(door=>door.id===shop.doorId)?.open===true,onInteract:()=>{
        if(typeof economy?.purchase!=='function')return {message:shop.service+'. Shop account is unavailable.'};
        const result=economy.purchase(shop.product,shop.price);
        if(economy?.getState)globalThis.window?.__NAIJA_RPG_UI__?.setEconomy?.(economy.getState());
        return {message:result.message||`${shop.service} · ${shop.name}`};
      }}));
    }
    return ()=>{for(const remove of interactionRemovers.splice(0))remove();};
  }
  function update(dt,playerState,pedestrianState){
    const step=Math.max(0,Math.min(.05,Number(dt)||0));
    elapsed+=step;
    const player=playerState?.position;
    for(const district of DISTRICTS){
      const active=!!player&&Math.hypot(player[0]-district.hub[0],player[2]-district.hub[2])<360;
      if(districtActive.get(district.id)!==active){
        districtActive.set(district.id,active);
        for(const entity of districtEntities.get(district.id)||[])entity.enabled=active;
        if(active){const groupId=districtBatchGroups.get(district.id);if(groupId!=null)app.batcher?.generate?.([groupId]);}
        for(const actor of districtNpcs.filter(item=>item.districtId===district.id))actor.root.enabled=active;
        for(const vehicle of trafficVehicles.filter(item=>item.districtId===district.id))vehicle.root.enabled=active;
        if(doorRuntimeReady){
          const wallOwner=collisionOwnerIds.get(district.id),doorOwner=doorOwnerIds.get(district.id);
          const wallCount=collisionProxies.filter(item=>item.districtId===district.id).length;
          const doorCount=doorProxies.filter(item=>item.districtId===district.id).length;
          for(let index=0;index<wallCount;index++)playerPhysicsRef.setStaticColliderEnabled(wallOwner,index,active);
          for(let index=0;index<doorCount;index++){const door=doors.find(item=>item.districtId===district.id&&item.doorColliderLocalIndex===index);playerPhysicsRef.setStaticColliderEnabled(doorOwner,index,active&&!(door?.open));}
        }
      }
    }
    const gameHour=(6+elapsed/60)%24;
    for(const actor of districtNpcs){
      if(!districtActive.get(actor.districtId))continue;
      const onDuty=gameHour>=actor.schedule.start&&gameHour<actor.schedule.end;
      const home=actor.route[0];
      if(!onDuty){
        const dx=home[0]-actor.position[0],dz=home[2]-actor.position[2],distance=Math.hypot(dx,dz);
        if(distance>.45){const move=Math.min(distance,actor.speed*step);actor.position[0]+=dx/distance*move;actor.position[2]+=dz/distance*move;actor.root.setPosition(actor.position[0],actor.y,actor.position[2]);actor.root.setEulerAngles(0,Math.atan2(dx,-dz)*180/Math.PI,0);}
        actor.returningHome=true;continue;
      }
      if(actor.returningHome){actor.waypoint=1;actor.returningHome=false;}
      const target=actor.route[actor.waypoint];
      const dx=target[0]-actor.position[0],dz=target[2]-actor.position[2],distance=Math.hypot(dx,dz);
      if(distance<.55){actor.waypoint=(actor.waypoint+1)%actor.route.length;actor.wait=actor.waitDuration;}
      if(actor.wait>0)actor.wait=Math.max(0,actor.wait-step);
      else if(distance>.02){const move=Math.min(distance,actor.speed*step);actor.position[0]+=dx/distance*move;actor.position[2]+=dz/distance*move;actor.root.setPosition(actor.position[0],actor.y,actor.position[2]);actor.root.setEulerAngles(0,Math.atan2(dx,-dz)*180/Math.PI,0);}
    }
    const actors=[...(pedestrianState?.roster||[]),...districtNpcs.map(actor=>({district:actor.district,position:actor.position}))];
    for(const vehicle of trafficVehicles){
      if(!districtActive.get(vehicle.districtId))continue;
      const ahead=trafficVehicles.filter(other=>other!==vehicle&&other.roadId===vehicle.roadId&&other.lane===vehicle.lane&&other.direction===vehicle.direction).map(other=>({other,gap:(other.progress-vehicle.progress)*vehicle.direction})).filter(item=>item.gap>0&&item.gap<9).sort((a,b)=>a.gap-b.gap)[0];
      const pedestrianNear=actors.some(actor=>Math.hypot(actor.position[0]-vehicle.position[0],actor.position[2]-vehicle.position[2])<3.6);
      const speedScale=pedestrianNear?0:(ahead?(ahead.gap<5?0:ahead.gap<8?.35:.7):1);
      vehicle.progress+=vehicle.direction*vehicle.speed*speedScale*step;
      if(vehicle.progress>vehicle.end){vehicle.progress=vehicle.end;vehicle.direction=-1;}
      if(vehicle.progress<vehicle.start){vehicle.progress=vehicle.start;vehicle.direction=1;}
      vehicle.position[vehicle.axis==='x'?0:2]=vehicle.progress;
      vehicle.root.setPosition(vehicle.position[0],vehicle.position[1],vehicle.position[2]);
      vehicle.root.setEulerAngles(0,vehicle.axis==='x'?(vehicle.direction>0?90:-90):(vehicle.direction>0?180:0),0);
      vehicle.state=pedestrianNear?'yielding-to-pedestrian':ahead?'following-traffic':'cruising';
    }
    for(const door of doors){
      let nearestActor=Infinity;
      for(const actor of actors){if(actor.district!==door.district)continue;const p=actor.position;nearestActor=Math.min(nearestActor,Math.hypot(p[0]-door.entrance[0],p[2]-door.entrance[2]));}
      if(nearestActor<2.35){door.autoUntil=elapsed+1.3;if(!door.open&&!door.manual)setDoorOpen(door,true,false);}
      if(!door.manual&&door.open&&elapsed>door.autoUntil&&nearestActor>3.2)setDoorOpen(door,false,false);
      const delta=door.targetAngle-door.angle;
      if(Math.abs(delta)>.2){door.angle+=Math.sign(delta)*Math.min(Math.abs(delta),step*190);door.pivot.setLocalEulerAngles(0,door.angle,0);}
    }
    if(player){
      for(const building of buildings){
        const door=doors.find(item=>item.id===building.doorId),roof=door?.roof;
        if(!roof||!building.enterable)continue;
        const dx=player[0]-building.position[0],dz=player[2]-building.position[2];
        const local=rotateXZ(dx,dz,-building.yaw);
        const inside=Math.abs(local[0])<building.obb.halfExtents[0]-.65&&Math.abs(local[1])<building.obb.halfExtents[2]-.65&&Math.abs(player[1]-building.position[1])<4.8;
        roof.enabled=!inside;
      }
    }
  }

  // District traffic follows surveyed road-collider segments. Two opposing
  // lanes per district use spacing, speed control and pedestrian yielding.
  for(const district of DISTRICTS){
    const road=roadColliders.map(item=>({item,distance:Math.hypot(item.position[0]-district.hub[0],item.position[2]-district.hub[2])}))
      .filter(entry=>entry.distance<78&&Math.max(entry.item.halfExtents[0],entry.item.halfExtents[2])>=10)
      .sort((a,b)=>a.distance-b.distance)[0]?.item;
    if(!road)continue;
    const axis=road.halfExtents[0]>=road.halfExtents[2]?'x':'z';
    const span=Math.max(6,road.halfExtents[axis==='x'?0:2]-3.5);
    const start=road.position[axis==='x'?0:2]-span,end=road.position[axis==='x'?0:2]+span;
    for(let vehicleIndex=0;vehicleIndex<4;vehicleIndex++){
      const lane=vehicleIndex%2,direction=lane===0?1:-1,slot=Math.floor(vehicleIndex/2);
      const root=new pc.Entity('stage08n-traffic-'+district.id+'-'+vehicleIndex);
      const bodyMat=material(vehicleIndex%2===0?[.12,.31,.48]:[.62,.23,.12]);
      box('district-traffic-body',[0,.62,0],[1.65,.58,3.15],bodyMat,root);
      box('district-traffic-cabin',[0,1.12,-.16],[1.28,.58,1.42],shared.glass,root);
      const lateral=lane===0?-2.05:2.05;
      const position=[road.position[0],0,road.position[2]];
      position[axis==='x'?2:0]+=lateral;
      const initial=direction>0?start+span*(.22+slot*.48):end-span*(.22+slot*.48);
      position[axis==='x'?0:2]=initial;
      app.root.addChild(root);root.setPosition(...position);
      root.enabled=false;
      trafficVehicles.push({id:root.name,district:district.district,districtId:district.id,roadId:road.id,axis,lane,direction,progress:initial,start,end,speed:3.8+slot*.15,position,root,state:'cruising'});
      details+=2;
    }
  }

  for(let i=0;i<npcSpawns.length;i++){
    const spawn=npcSpawns[i],root=new pc.Entity(spawn.id);
    const shirt=material(spawn.shirt),skin=material(spawn.skin),trousers=material([.09,.1,.12]),shoes=material([.025,.03,.035]);
    const part=(name,type,scale,position,mat)=>{const entity=new pc.Entity(name);entity.addComponent('render',{type,material:mat});entity.setLocalScale(...scale);entity.setLocalPosition(...position);root.addChild(entity);};
    part('body','cylinder',[.38,.76,.3],[0,1.0,0],shirt);part('head','sphere',[.23,.26,.22],[0,1.58,0],skin);part('hair','sphere',[.235,.1,.225],[0,1.75,-.015],shoes);part('trousers','cylinder',[.32,.52,.27],[0,.38,0],trousers);
    app.root.addChild(root);root.setPosition(spawn.x,spawn.y,spawn.z);
    root.enabled=false;
    const districtId=DISTRICTS.find(item=>item.district===spawn.district)?.id;
    districtNpcs.push({id:spawn.id,role:spawn.role,district:spawn.district,districtId,root,position:[spawn.x,spawn.y,spawn.z],y:spawn.y,route:spawn.route.map(p=>p.slice()),waypoint:1,speed:spawn.role==='Shopkeeper'||spawn.role==='Tailor'||spawn.role==='Grocer'||spawn.role==='Produce Seller'?.62:.9,wait:0,waitDuration:1.4,schedule:spawn.schedule,returningHome:false});details+=4;
  }
  function destroy(){for(const remove of interactionRemovers.splice(0))remove();for(const actor of districtNpcs)actor.root.destroy();for(const vehicle of trafficVehicles)vehicle.root.destroy();for(const door of doors)door.root.destroy();if(playerPhysicsRef?.removeStaticColliders){for(const owner of collisionOwnerIds.values())playerPhysicsRef.removeStaticColliders(owner);for(const owner of doorOwnerIds.values())playerPhysicsRef.removeStaticColliders(owner);}}
  function getState(){return {stage:'08N',districts:DISTRICTS.map(d=>d.district),buildingCount:buildings.length,enterableInteriors:buildings.filter(b=>b.enterable).length,doorCount:doors.length,shops:shops.map(s=>({...s,position:s.position.slice()})),npcSpawns:npcSpawns.length,npcCount:districtNpcs.length,activeDistrictNpcs:districtNpcs.filter(actor=>districtActive.get(actor.districtId)).length,trafficVehicles:trafficVehicles.length,activeTrafficVehicles:trafficVehicles.filter(vehicle=>districtActive.get(vehicle.districtId)).length,trafficStates:trafficVehicles.reduce((out,v)=>{out[v.state]=(out[v.state]||0)+1;return out;},{}),activeDistricts:[...districtActive].filter(([,active])=>active).map(([id])=>id),detailMeshes:details,collisionProxies:collisionProxies.length,doorCollisionProxies:doorProxies.length,batchGroups:batchGroupIds.length,openDoors:doors.filter(d=>d.open).length,buildings:buildings.map(b=>({id:b.id,name:b.name,district:b.district,kind:b.kind,role:b.role,enterable:b.enterable,position:b.position.slice(),doorId:b.doorId})),doors:doors.map(d=>({id:d.id,district:d.district,name:d.name,open:d.open,angle:+d.angle.toFixed(1),entrance:d.entrance.slice()}))};}
  return {stage:'08N',districts:DISTRICTS,buildings,doors,shops,npcSpawns,districtNpcs,trafficVehicles,collisionProxies,doorProxies,batchGroupIds,detailMeshes:details,attachRuntime,registerInteractions,update,destroy,getState};
}
