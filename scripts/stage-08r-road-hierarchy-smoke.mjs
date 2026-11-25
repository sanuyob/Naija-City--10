import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port=4186,origin=`http://127.0.0.1:${port}`;
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
  const result=await page.evaluate(()=>{
    const game=window.__NAIJA_GAME__;
    return {
      roads:game.getRoadHierarchyState(),
      spawn:game.firstSpawnPosition,
      player:game.getPlayerState(),
      streetInfrastructure:game.stage08C.roadWidthsMetres,
      render:game.getRenderBreakdown().groups.map(group=>group.name)
    };
  });
  const r=result.roads;
  assert.equal(r.yabaCentralAvenueMetres,14);
  assert.equal(r.yabaCentralAvenueRenderedMetres,14);
  assert.equal(r.yabaFootpathCentreOffsetMetres,8);
  assert.equal(r.yabaCoreShopInnerFacadeOffsetMetres,10.4);
  assert.ok(r.yabaMainCurbCentreOffsetMetres<r.yabaFootpathCentreOffsetMetres);
  assert.ok(r.yabaFootpathCentreOffsetMetres<r.yabaDrainCentreOffsetMetres);
  assert.ok(r.yabaDrainCentreOffsetMetres<r.yabaUtilityPoleCentreOffsetMetres);
  assert.ok(r.yabaUtilityPoleCentreOffsetMetres<r.yabaCoreShopInnerFacadeOffsetMetres);
  assert.equal(r.parallelLocalRoadMetres,9,'The two distributor roads should be widened selectively');
  assert.equal(r.parallelDistributorRoadMetres,9);
  assert.equal(r.parallelFootpathCentreOffsetMetres,6);
  assert.deepEqual(r.distributorFurnitureOffsetsMetres,{kerb:4.6,drainCover:4.95,footpath:6,streetlight:6.8});
  assert.deepEqual(r.yabaCrossStreetsMetres,{'-110':9,'42':12.5,'118':12.5});
  assert.deepEqual(r.yabaCrossStreetsRenderedMetres,{'-110':9,'42':12.5,'118':12.5},'Measured road geometry must match the intended hierarchy');
  assert.equal(r.busyCrossStreetLaneMarkingSegments,52,'Both widened collectors need center, lane-divider and edge markings');
  assert.equal(r.distributorKerbEdges,4,'Both sides of both narrow distributors retain kerbs');
  assert.equal(r.distributorDrainLines,4,'Both sides of both narrow distributors retain drainage');
  assert.equal(r.ikejaCommercialRoadMetres,18,'Existing Ikeja commercial corridor should not be altered');
  assert.equal(r.yabaIkejaConnectorMetres,14,'Existing Yaba-Ikeja connector should not be altered');
  assert.deepEqual(result.spawn,[-8,0.12,-40]);
  assert.equal(result.player.grounded,true,'Player should start grounded on the updated footpath');
  assert.equal(result.player.position[0],-8);
  assert.deepEqual(result.streetInfrastructure,{mainAvenue:14,localDistributors:9,crossStreets:{'-110':9,'42':12.5,'118':12.5}});
  assert.equal(r.busyCrossStreetLaneMarkingsMetres,12.5);
  assert.deepEqual(r.widenedCrossStreetIds,[42,118]);
  assert.ok(result.render.includes('stage08j-yaba-ikeja'),'Existing Yaba street infrastructure should remain in the live scene');
  assert.deepEqual(errors,[],'browser errors: '+errors.join('; '));
  console.log(JSON.stringify({pass:true,result,browserErrors:errors},null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
