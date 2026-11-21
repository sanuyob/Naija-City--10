// Stage 08L: five small, enterable community spaces with repeatable local activities.
// Interiors are deliberately open-roofed for visibility and low-end mobile rendering.
const HUBS = [
  { id:'eko-parcel-depot', district:'Eko CBD', x:1140, z:-935, ground:-3.9379220462, title:'Eko Parcel Depot', activity:'Parcel Dispatch', item:'parcel', colours:[[.12,.25,.42],[.86,.58,.16]], message:'Collect three parcels from the depot floor, then check in at the dispatch counter.' },
  { id:'vi-art-room', district:'Victoria Island', x:1615, z:-1395, ground:-4.0511898676, title:'Island Art Room', activity:'Gallery Trail', item:'artwork', colours:[[.44,.18,.22],[.83,.68,.42]], message:'Find the three local artwork cards inside the gallery and report back to the curator.' },
  { id:'ikoyi-marina-shed', district:'Ikoyi', x:2175, z:-925, ground:-4.7379935332, title:'Ikoyi Marina Shed', activity:'Marina Supply', item:'supply crate', colours:[[.10,.31,.36],[.72,.56,.32]], message:'Gather three marina supply crates and return to the harbour desk.' },
  { id:'lekki-coast-hut', district:'Lekki', x:2955, z:-1335, ground:-1.4392910237, title:'Lekki Coast Hut', activity:'Beach Clean-up', item:'clean-up bag', colours:[[.08,.35,.30],[.88,.67,.20]], message:'Pick up three clean-up bags from the hut, then check in with the coast volunteer.' },
  { id:'ekiti-produce-shed', district:'Ekiti Highlands', x:3420, z:-540, ground:-3.9698225368, title:'Ekiti Produce Shed', activity:'Farm Produce Run', item:'produce basket', colours:[[.18,.34,.18],[.68,.43,.18]], message:'Collect three produce baskets and take them to the cooperative counter.' }
];

export function createStage08LGidiDistrictActivities({ app, box, material, economy = null }) {
  if (!app || !box || !material) throw new Error('Stage 08L requires app, box and material helpers.');
  const collisionProxies=[];
  const hubs=[];
  const batchGroups=[];
  let activeGroup=null;
  let detailMeshes=0;
  const makeMat=(rgb,rough=.78)=>material(rgb,rough);
  const shared={
    floor:makeMat([.39,.34,.27]), plaster:makeMat([.63,.56,.44]), dark:makeMat([.075,.09,.095]),
    metal:makeMat([.25,.29,.29],.48), glass:makeMat([.12,.25,.29],.24), wood:makeMat([.34,.21,.12]),
    white:makeMat([.79,.77,.69]), trim:makeMat([.13,.22,.24])
  };
  function add(hub,name,position,scale,mat,solid=false){
    const e=box('stage08l-'+hub.id+'-'+name,position,scale,mat);
    e.tags.add('stage08l-district-activity');
    if(activeGroup&&e.render)e.render.batchGroupId=activeGroup.id;
    detailMeshes++;
    if(solid)collisionProxies.push({id:e.name+'-'+e.getGuid(),position:position.slice(),halfExtents:scale.map(v=>Math.abs(v)/2),rotationY:0,source:'stage08l-gidi-district-activities'});
    return e;
  }
  for(const def of HUBS){
    activeGroup=app.batcher?.addGroup('stage08l-'+def.id+'-static',false,32)||null;
    if(activeGroup)batchGroups.push(activeGroup.id);
    const [primary,accent]=def.colours;
    const mats={primary:makeMat(primary),accent:makeMat(accent),surface:makeMat([.47,.43,.36]),}
    const x=def.x,z=def.z,y=def.ground;
    // 8 x 7m compact, open-roofed shop. Door faces +X towards the nearby local road.
    add(def,'interior-floor',[x,y+.07,z],[8,.14,7],shared.floor);
    add(def,'rear-wall',[x-3.92,y+1.58,z],[.22,3.16,7],shared.plaster,true);
    add(def,'left-wall',[x,y+1.58,z-3.42],[7.85,3.16,.22],shared.plaster,true);
    add(def,'right-wall',[x,y+1.58,z+3.42],[7.85,3.16,.22],shared.plaster,true);
    // Front wall leaves a 1.8m entrance in the centre.
    add(def,'front-wall-left',[x+3.92,y+1.58,z-2.35],[.22,3.16,2.35],shared.plaster,true);
    add(def,'front-wall-right',[x+3.92,y+1.58,z+2.35],[.22,3.16,2.35],shared.plaster,true);
    add(def,'front-lintel',[x+3.92,y+2.98,z],[.22,.36,1.8],shared.plaster,true);
    // A narrow perimeter canopy gives the interior a readable roofline without hiding it.
    add(def,'roof-back',[x-1.95,y+3.12,z],[4.1,.22,7.15],shared.trim);
    add(def,'roof-side-left',[x+1.95,y+3.12,z-2.78],[4.1,.22,1.55],shared.trim);
    add(def,'roof-side-right',[x+1.95,y+3.12,z+2.78],[4.1,.22,1.55],shared.trim);
    add(def,'counter',[x-1.35,y+.58,z],[1.0,1.02,3.2],mats.primary,true);
    add(def,'counter-top',[x-1.35,y+1.12,z],[1.18,.12,3.35],shared.wood);
    add(def,'back-shelf',[x-3.35,y+1.22,z],[.48,2.25,3.8],mats.accent,true);
    for(let level=0;level<3;level++)add(def,'shelf-'+level,[x-3.02,y+.55+level*.65,z],[.16,.08,3.55],shared.wood);
    add(def,'service-window',[x-3.78,y+2.1,z],[.08,.9,1.8],shared.glass);
    add(def,'district-sign',[x+4.22,y+2.45,z],[.16,.82,3.5],mats.accent);
    add(def,'entrance-step',[x+4.42,y+.13,z],[1.05,.26,2.15],shared.surface);
    // A short pedestrian spur connects each doorway to the nearest surveyed road edge.
    add(def,'roadside-walkway',[x+12.1,y+.025,z],[15.3,.08,1.8],shared.surface);
    add(def,'walkway-edge-near',[x+12.1,y+.075,z-1.0],[15.3,.1,.12],shared.dark);
    add(def,'walkway-edge-far',[x+12.1,y+.075,z+1.0],[15.3,.1,.12],shared.dark);
    add(def,'entry-bollard-near',[x+5.8,y+.62,z-1.55],[.22,1.24,.22],shared.metal);
    add(def,'entry-bollard-far',[x+5.8,y+.62,z+1.55],[.22,1.24,.22],shared.metal);
    // District-specific service details make each small interior read differently.
    if(def.id==='eko-parcel-depot'){
      add(def,'dispatch-board',[x-3.55,y+2.25,z],[.12,1.0,2.3],mats.accent);
      add(def,'parcel-scale',[x-.55,y+1.22,z-1.15],[.58,.16,.58],shared.metal);
      add(def,'dispatch-stamp-table',[x-1.55,y+.95,z+2.35],[1.25,.12,.72],shared.wood);
    }else if(def.id==='vi-art-room'){
      add(def,'gallery-frame-left',[x-3.72,y+2.35,z-2.15],[.08,1.35,1.25],mats.accent);
      add(def,'gallery-frame-right',[x-3.72,y+2.35,z+2.15],[.08,1.35,1.25],mats.accent);
      add(def,'gallery-plinth',[x+1.45,y+.58,z],[.82,1.02,.82],shared.white);
    }else if(def.id==='ikoyi-marina-shed'){
      add(def,'life-ring',[x-3.58,y+1.72,z-2.35],[.16,.72,.72],mats.accent);
      add(def,'mooring-rope-rack',[x-2.75,y+1.2,z+2.45],[.42,1.9,.42],shared.wood);
      add(def,'harbour-notice-board',[x-3.62,y+2.25,z],[.1,.95,2.4],mats.primary);
    }else if(def.id==='lekki-coast-hut'){
      add(def,'coast-umbrella-pole',[x+6.2,y+1.65,z+2.5],[.12,3.3,.12],shared.metal);
      add(def,'coast-umbrella-canopy',[x+6.2,y+3.25,z+2.5],[2.5,.18,2.5],mats.accent);
      add(def,'beach-bench',[x+8.2,y+.52,z-2.2],[2.0,.16,.52],shared.wood);
    }else{
      add(def,'produce-rack',[x-3.55,y+1.1,z-2.25],[.42,1.9,1.55],mats.accent);
      add(def,'produce-crate-row',[x+1.15,y+.36,z-2.25],[1.65,.72,.72],shared.wood);
      add(def,'cooperative-board',[x-3.62,y+2.3,z+2.25],[.1,.95,1.55],mats.primary);
    }
    // Three tactile task objects form one short, self-contained activity.
    const pickupPositions=[[-2.45,-2.0],[-1.35,1.85],[1.05,-1.85]];
    const pickups=pickupPositions.map(([dx,dz],index)=>{
      const p=[x+dx,y+.32,z+dz];
      add(def,'activity-item-'+(index+1),[p[0],p[1],p[2]],[.62,.62,.62],index===1?mats.accent:mats.primary);
      add(def,'activity-item-label-'+(index+1),[p[0],p[1]+.34,p[2]],[.42,.06,.42],shared.white);
      return {id:def.id+'-pickup-'+(index+1),name:def.item+' '+(index+1),position:[p[0],y,p[2]],collected:false};
    });
    const saved=economy?.getActivityProgress?.(def.id);
    if(saved?.pickups?.length===pickups.length)pickups.forEach((pickup,index)=>{pickup.collected=Boolean(saved.pickups[index]);});
    const activity={id:def.id,district:def.district,title:def.title,name:def.activity,item:def.item,message:def.message,center:[x,y,z],position:[x+2.55,y,z],pickups,completed:Boolean(saved?.completed),started:pickups.some(p=>p.collected),reward:500};
    hubs.push(activity);
  }
  function registerInteractions(interactionSystem){
    if(!interactionSystem?.register)throw new Error('Stage 08L requires the world interaction registry.');
    const unregister=[];
    for(const activity of hubs){
      for(const pickup of activity.pickups){
        unregister.push(interactionSystem.register({
          id:pickup.id,name:pickup.name,position:pickup.position,range:2.8,prompt:'PICK UP · '+pickup.name.toUpperCase(),
          canInteract:()=>!pickup.collected,
          onInteract:()=>{
            if(pickup.collected)return false;
            pickup.collected=true;activity.started=true;
            interactionSystem.setEnabled(pickup.id,false);
            const count=activity.pickups.filter(item=>item.collected).length;
            economy?.setActivityProgress?.(activity.id,{pickups:activity.pickups.map(item=>item.collected),completed:activity.completed});
            return {message:activity.name+' · '+count+'/3 '+activity.item+'s collected.'};
          }
        }));
      }
      unregister.push(interactionSystem.register({
        id:activity.id+'-counter',name:activity.title+' counter',position:activity.position,range:3.1,prompt:'CHECK IN · '+activity.name.toUpperCase(),
        onInteract:()=>{
          const count=activity.pickups.filter(item=>item.collected).length;
          if(count<3)return {message:activity.message+' Progress: '+count+'/3.'};
          if(activity.completed)return {message:activity.name+' already completed. Explore the district for another activity.'};
          activity.completed=true;
          const reward=economy?.awardActivity?.(activity.id,activity.reward);
          if(economy?.getState)globalThis.window?.__NAIJA_RPG_UI__?.setEconomy?.(economy.getState());
          economy?.setActivityProgress?.(activity.id,{pickups:activity.pickups.map(item=>item.collected),completed:true});
          return {message:'ACTIVITY COMPLETE · '+activity.name+'. '+(reward?.success?reward.message:'Reward already claimed or unavailable.')};
        }
      }));
    }
    return ()=>{for(const remove of unregister)remove();};
  }
  return {
    stage:'08L',districts:hubs.map(h=>h.district),hubs,collisionProxies,detailMeshes,batchGroupIds:batchGroups,enterableInteriors:hubs.length,
    activityCount:hubs.length,batchGroups:batchGroups.length,pickupCount:hubs.reduce((n,h)=>n+h.pickups.length,0),
    registerInteractions,
    getState:()=>({stage:'08L',districts:hubs.map(h=>h.district),enterableInteriors:hubs.length,activityCount:hubs.length,pickupCount:hubs.reduce((n,h)=>n+h.pickups.length,0),completedActivities:hubs.filter(h=>h.completed).length,rewardsClaimed:hubs.filter(h=>economy?.getActivityProgress?.(h.id)?.rewardClaimed).length,wallet:economy?.getState?.().cash??null,activities:hubs.map(h=>({id:h.id,district:h.district,title:h.title,name:h.name,position:h.position.slice(),center:h.center.slice(),pickups:h.pickups.map(p=>({id:p.id,position:p.position.slice(),collected:p.collected})),started:h.started,collected:h.pickups.filter(p=>p.collected).length,total:3,completed:h.completed}))})
  };
}
