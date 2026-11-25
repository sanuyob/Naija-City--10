import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port=4181,origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
  let ready=false;
  for(let i=0;i<60;i++){try{const response=await fetch(origin);if(response.ok){ready=true;break;}}catch{}if(server.exitCode!==null)throw new Error(`Vite exited ${server.exitCode}`);await delay(500);}
  assert.ok(ready,'Vite should start');
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:480,height:270},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('requestfailed',request=>errors.push(request.url()+': '+request.failure()?.errorText));
  await page.goto(origin+'?smoke=1&stage08n-neighbourhoods=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__NAIJA_GAME__?.ready===true,null,{timeout:120000});
  const result=await page.evaluate(async()=>{
    const g=window.__NAIJA_GAME__,reports=[];
    // Prime the streamed world at its western gateway first; distant Eko/VI
    // district requests depend on the infrastructure root being initialized.
    const gateway=await g.debugLoadGidiForSmoke([100,0,-445]);
    if(!gateway.streamer.ready)throw new Error('GIDI infrastructure did not become ready at the gateway');
    const initial=g.getStage08NState();
    for(const [districtIndex,districtId] of ['eko-cbd','victoria-island','ikoyi','lekki','ekiti-highlands'].entries()){
      const shop=g.stage08N.shops.find(item=>item.id==='stage08n-shop-'+districtId);
      const door=g.stage08N.doors.find(item=>item.id===shop.doorId);
      const building=g.stage08N.buildings.find(item=>item.doorId===door.id);
      const loaded=await g.debugLoadGidiForSmoke(door.entrance);
      g.debugSetPlayerForSmoke(door.entrance,0);
      g.stage08N.update(.016,g.getPlayerState(),g.getPedestrianState());
      await new Promise(resolve=>setTimeout(resolve,300));
      const groundedPlayer=g.getPlayerState();
      if(!groundedPlayer.grounded||Math.abs(groundedPlayer.position[1]-door.entrance[1])>.3)throw new Error(districtId+' player did not settle on surveyed terrain: '+JSON.stringify({player:groundedPlayer.position,expectedY:door.entrance[1],grounded:groundedPlayer.grounded}));
      for(let attempt=0;attempt<50;attempt++){
        const mapped=g.getGidiState().surfaceMaterialReplacements;
        if(mapped?.asphalt>0&&mapped?.concrete>0&&mapped?.paving>0)break;
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      const surfaceMaterials=g.getGidiState().surfaceMaterialReplacements;
      if(!surfaceMaterials?.asphalt||!surfaceMaterials?.concrete||!surfaceMaterials?.paving)throw new Error(districtId+' streamed GIDI road PBR material mapping missing: '+JSON.stringify(surfaceMaterials));
      if(!g.getStage08NState().activeDistricts.includes(districtId))throw new Error(districtId+' neighbourhood did not stream in: '+JSON.stringify({active:g.getStage08NState().activeDistricts,player:g.getPlayerState().position,vehicle:g.getVehicleState()}));
      const batchState=g.getStaticBatchState().stage08N.find(item=>item.index===districtIndex);
      if(!batchState?.batches)throw new Error(districtId+' static batch group was not generated: '+JSON.stringify(batchState));
      const normal=[Math.sin(door.yaw*Math.PI/180),Math.cos(door.yaw*Math.PI/180)];
      const from=[door.doorProxy.position[0]+normal[0]*2,door.doorProxy.position[1],door.doorProxy.position[2]+normal[1]*2];
      const to=[door.doorProxy.position[0]-normal[0]*2,door.doorProxy.position[1],door.doorProxy.position[2]-normal[1]*2];
      const before=g.getGroundProbe(from,to);
      const interactionDebug=g.getInteractionState();
      if(!interactionDebug.nearest?.available||!interactionDebug.nearest.prompt.includes('OPEN DOOR'))throw new Error(districtId+' OPEN DOOR prompt is not available: '+JSON.stringify(interactionDebug.nearest));
      if(!before?.id?.includes('stage08n-door'))throw new Error(districtId+' closed door collider missing: '+JSON.stringify(before));
      document.querySelector('#interact-button')?.click();
      await new Promise(resolve=>setTimeout(resolve,100));
      const opened={success:door.open,result:g.getInteractionState().lastInteraction};
      if(!opened.success)throw new Error(districtId+' door did not open through the mobile interaction button: '+JSON.stringify(opened));
      await new Promise(resolve=>setTimeout(resolve,650));
      const after=g.getGroundProbe(from,to);
      if(after?.id?.includes('stage08n-door'))throw new Error(districtId+' open door still blocks the doorway: '+JSON.stringify(after));
      g.debugSetPlayerForSmoke(shop.position,door.yaw);
      await new Promise(resolve=>setTimeout(resolve,100));
      document.querySelector('#interact-button')?.click();
      await new Promise(resolve=>setTimeout(resolve,100));
      const purchase={success:g.getCityEconomyState().purchases>reports.length,result:g.getCityEconomyState().inventory[shop.product]};
      if(!purchase.success)throw new Error(districtId+' shop purchase failed: '+JSON.stringify(purchase));
      g.debugSetPlayerForSmoke(door.entrance,0);
      await new Promise(resolve=>setTimeout(resolve,100));
      document.querySelector('#interact-button')?.click();
      await new Promise(resolve=>setTimeout(resolve,100));
      const closed={success:!door.open,result:g.getInteractionState().lastInteraction};
      if(!closed.success)throw new Error(districtId+' door did not close through the mobile interaction button: '+JSON.stringify(closed));
      const floorHit=g.getGroundProbe([building.position[0],building.position[1]+3,building.position[2]],[building.position[0],building.position[1]-2,building.position[2]]);
      if(!floorHit?.id?.includes('interior-floor'))throw new Error(districtId+' interior floor collision missing: '+JSON.stringify(floorHit));
      g.debugSetPlayerForSmoke([building.position[0],building.position[1]+.2,building.position[2]],door.yaw);
      g.stage08N.update(.016,g.getPlayerState(),g.getPedestrianState());
      await new Promise(resolve=>setTimeout(resolve,120));
      if(door.roof?.enabled!==false||door.roofElements?.some(part=>part.enabled!==false))throw new Error(districtId+' complete roof assembly did not hide when the character entered: '+JSON.stringify({player:g.getPlayerState().position,building:building.position,roof:door.roof?.enabled,roofParts:door.roofElements?.map(part=>part.enabled),active:g.getStage08NState().activeDistricts}));
      if(door.roofElements?.some(part=>part.render?.batchGroupId>=0))throw new Error(districtId+' roof parts must remain individually hideable instead of being merged into a static batch');
      reports.push({district:door.district,loadedCells:loaded.loadedCells,staticBatches:batchState.batches,interactionPrompt:interactionDebug.nearest?.prompt,interactionAvailable:interactionDebug.nearest?.available,doorOpened:true,closedDoorCollider:before.id,openDoorClear:!after?.id?.includes('stage08n-door'),shopPurchase:shop.name+' · inventory '+purchase.result,doorClosed:true,interiorRoofHidden:true,roofAccessoriesHidden:door.roofElements.length,roadMaterialReplacements:surfaceMaterials,playerGrounded:groundedPlayer.position[1],interiorFloorCollision:floorHit.id});
    }
    document.querySelector('.nav [data-open="inventory"]')?.click();
    return {gateway:{ready:gateway.streamer.ready,materialReplacements:gateway.streamer.surfaceMaterialReplacements},initial,final:g.getStage08NState(),economy:g.getCityEconomyState(),traffic:g.getTrafficAIState(),districtBatches:g.getStaticBatchState().stage08N,deviceProfile:g.getStage08FProfile(),hudWallet:document.querySelector('#hud-wallet-value')?.textContent,bagCount:document.querySelector('#hud-inventory-count')?.textContent,inventoryPanel:document.querySelector('#panel-content')?.textContent,reports};
  });
  assert.equal(result.gateway.ready,true);
  assert.ok(result.gateway.materialReplacements.asphalt>0&&result.gateway.materialReplacements.concrete>0&&result.gateway.materialReplacements.paving>0);
  assert.equal(result.initial.buildingCount,20);
  assert.deepEqual(result.initial.roofProfiles,{'flat-parapet':5,'sheet-pitch':5,'service-roof':5,'pergola':5});
  assert.equal(result.initial.weatheredBuildings,7);
  assert.equal(result.initial.vegetationPlanters,10);
  assert.equal(result.initial.enterableInteriors,20);
  assert.equal(result.final.activeDistrictNpcs,4);
  assert.equal(result.final.activeTrafficVehicles,4);
  assert.equal(result.final.trafficVehicles,20);
  assert.equal(result.economy.purchases,5);
  assert.equal(result.hudWallet,'₦400','HUD wallet should reflect the saved shop purchases');
  assert.equal(result.bagCount,'BAG · 5');
  assert.ok(result.inventoryPanel.includes('market basket'),'inventory panel should list purchased goods');
  assert.equal(result.reports.length,5);
  assert.deepEqual(errors,[],'browser errors: '+errors.join('; '));
  console.log(JSON.stringify({pass:true,result,browserErrors:errors},null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
