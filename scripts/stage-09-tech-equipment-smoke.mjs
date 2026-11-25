import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port=4187,origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
  let ready=false;
  for(let i=0;i<60;i++){
    try{const response=await fetch(origin);if(response.ok){ready=true;break;}}catch{}
    if(server.exitCode!==null)throw new Error(`Vite exited ${server.exitCode}`);
    await delay(500);
  }
  assert.ok(ready,'Vite should start');
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:480,height:270},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push('page: '+error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push('console: '+message.text());});
  page.on('requestfailed',request=>errors.push('request: '+request.url()+': '+request.failure()?.errorText));
  page.on('response',response=>{if(response.status()>=400)errors.push(`http ${response.status()}: ${response.url()}`);});

  await page.goto(origin+'/?smoke=1&stage08n-neighbourhoods=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__NAIJA_GAME__?.ready===true,null,{timeout:120000});
  const initial=await page.evaluate(()=>{
    const game=window.__NAIJA_GAME__;
    return {
      tech:game.getTechEquipmentState(),
      techCollisionProxies:game.worldCollision.techEquipmentProxies,
      totalWorldProxies:game.worldCollision.totalProxies,
      physics:game.getPhysicsState().player,
      terminal:game.getGroundProbe([-24.76,3.0,98.8],[-24.76,1.2,98.8]),
      projector:game.getGroundProbe([-24.76,2.8,100.0],[-24.76,1.2,100.0]),
      renderGroups:game.getRenderBreakdown().groups.map(group=>group.name),
      junctions:game.stage08I.junctionGeometry
    };
  });
  assert.equal(initial.tech.assetsRequested,4);
  assert.equal(initial.tech.assetsLoaded,4,'All four downloaded props should load');
  assert.equal(initial.tech.assetsFailed,0,'No GLB load failures are expected');
  assert.equal(initial.tech.estimatedTriangles,29548);
  assert.equal(initial.tech.textureMaxDimension,512);
  assert.equal(initial.techCollisionProxies,2,'Terminal and hologram projector should have static Bullet colliders');
  assert.equal(initial.physics.mode,'ammo-bullet-capsule','Bullet player physics should remain active');
  assert.ok(initial.physics.colliderCount >= 1028,'Tech props and selective Yaba junction solids should be registered in Bullet physics');
  assert.equal(initial.terminal?.id,'stage09-tech-sci-fi-terminal','Raycast should hit the terminal Bullet collider');
  assert.equal(initial.projector?.id,'stage09-tech-hologram-projector','Raycast should hit the projector Bullet collider');
  assert.ok(initial.renderGroups.includes('stage09-tech-equipment'),'Technology props should be visible in scene diagnostics');

  // Inspect and collect the City Data Pad through the actual interaction and HUD UI.
  const dataPadInteraction=await page.evaluate(()=>{
    const game=window.__NAIJA_GAME__;
    game.debugSetPlayerForSmoke([-24.76,.12,101.25],0);
    return game.debugInteractForSmoke();
  });
  assert.equal(dataPadInteraction.success,true);
  assert.equal(dataPadInteraction.id,'mide-tech-item-data-pad');
  assert.equal(await page.locator('#panel-title').textContent(),'City Data Pad');
  await page.locator('[data-item-collect][data-item-id="tech-data-pad"]').click();
  assert.equal((await page.evaluate(()=>window.__NAIJA_GAME__.getCityEconomyState().inventory['tech-data-pad'])),1);
  await page.locator('[data-item-equip][data-item-id="tech-data-pad"][data-slot="1"]').click();
  assert.equal((await page.evaluate(()=>window.__NAIJA_GAME__.getCityEconomyState().quickSlots[1])),'tech-data-pad');
  await page.locator('[data-item-use][data-item-id="tech-data-pad"]').click();
  assert.match(await page.locator('#hud-toast').textContent(),/DATA PAD/);
  assert.equal(await page.locator('#world-map-overlay').isVisible(),true,'Using the Data Pad should open the in-game city atlas');
  await page.locator('[data-map-close]').click();

  // Inspect and collect the Field Radio using its own interaction target.
  const radioInteraction=await page.evaluate(()=>{
    const game=window.__NAIJA_GAME__;
    game.debugSetPlayerForSmoke([-24.76,.12,102.55],0);
    return game.debugInteractForSmoke();
  });
  assert.equal(radioInteraction.success,true);
  assert.equal(radioInteraction.id,'mide-tech-item-walkie-talkie');
  assert.equal(await page.locator('#panel-title').textContent(),'Field Radio');
  await page.locator('[data-item-collect][data-item-id="tech-field-radio"]').click();
  assert.equal((await page.evaluate(()=>window.__NAIJA_GAME__.getCityEconomyState().inventory['tech-field-radio'])),1);
  await page.locator('[data-item-equip][data-item-id="tech-field-radio"][data-slot="2"]').click();
  assert.equal((await page.evaluate(()=>window.__NAIJA_GAME__.getCityEconomyState().quickSlots[2])),'tech-field-radio');
  await page.locator('[data-item-use][data-item-id="tech-field-radio"]').click();
  assert.match(await page.locator('#hud-toast').textContent(),/FIELD RADIO/);

  // Close the inventory, then verify both quick-access buttons invoke device actions.
  await page.locator('[data-close]').click();
  await page.locator('.quick-slots [data-slot="2"]').click();
  assert.match(await page.locator('#hud-toast').textContent(),/FIELD RADIO/);
  await page.locator('.quick-slots [data-slot="1"]').click();
  assert.match(await page.locator('#hud-toast').textContent(),/DATA PAD/);
  assert.equal(await page.locator('#world-map-overlay').isVisible(),true,'Quick slot 1 should open the atlas');
  await page.locator('[data-map-close]').click();
  assert.equal(await page.locator('#world-map-overlay').isVisible(),false,'The city atlas should close before continuing');

  const beforeReload=await page.evaluate(()=>({
    tech:window.__NAIJA_GAME__.getTechEquipmentState(),
    economy:window.__NAIJA_GAME__.getCityEconomyState(),
    interactionTargets:window.__NAIJA_GAME__.getInteractionState().targets.filter(target=>target.id.startsWith('mide-tech-item-')).map(target=>({id:target.id,enabled:target.enabled}))
  }));
  assert.deepEqual(beforeReload.economy.quickSlots,{1:'tech-data-pad',2:'tech-field-radio',3:null});
  assert.equal(beforeReload.tech.inventoryItems.dataPadCollected,true);
  assert.equal(beforeReload.tech.inventoryItems.fieldRadioCollected,true);
  assert.ok(beforeReload.interactionTargets.every(target=>target.enabled===false),'collected device interactions should be disabled');

  // A browser reload restores the items and equipped slots from the existing save.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__NAIJA_GAME__?.ready===true,null,{timeout:120000});
  const afterReload=await page.evaluate(()=>({
    tech:window.__NAIJA_GAME__.getTechEquipmentState(),
    economy:window.__NAIJA_GAME__.getCityEconomyState(),
    interactionTargets:window.__NAIJA_GAME__.getInteractionState().targets.filter(target=>target.id.startsWith('mide-tech-item-')).map(target=>({id:target.id,enabled:target.enabled}))
  }));
  assert.equal(afterReload.economy.inventory['tech-data-pad'],1);
  assert.equal(afterReload.economy.inventory['tech-field-radio'],1);
  assert.deepEqual(afterReload.economy.quickSlots,{1:'tech-data-pad',2:'tech-field-radio',3:null});
  assert.equal(afterReload.tech.inventoryItems.dataPadCollected,true);
  assert.equal(afterReload.tech.inventoryItems.fieldRadioCollected,true);
  assert.deepEqual(afterReload.interactionTargets,[],'collected device pickups should not be registered after reload');

  assert.equal(initial.junctions.treatedIntersections,19,'Ikeja junction geometry should remain intact');
  assert.equal(initial.junctions.roadWidthsUnchanged,true);
  assert.deepEqual(errors,[],'browser errors: '+errors.join('; '));
  console.log(JSON.stringify({pass:true,initial,beforeReload,afterReload,browserErrors:errors},null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
