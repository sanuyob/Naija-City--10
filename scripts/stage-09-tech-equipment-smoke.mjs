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
  const result=await page.evaluate(()=>{
    const game=window.__NAIJA_GAME__;
    const terminal=game.getGroundProbe([-24.76,3.0,98.8],[-24.76,1.2,98.8]);
    const projector=game.getGroundProbe([-24.76,2.8,100.0],[-24.76,1.2,100.0]);
    game.debugSetPlayerForSmoke([-22.35,.12,101],0);
    const interaction=game.debugInteractForSmoke();
    const physics=game.getPhysicsState().player;
    return {
      tech:game.getTechEquipmentState(),
      techCollisionProxies:game.worldCollision.techEquipmentProxies,
      totalWorldProxies:game.worldCollision.totalProxies,
      physics,
      terminal,
      projector,
      interaction,
      renderGroups:game.getRenderBreakdown().groups.map(group=>group.name),
      junctions:game.stage08I.junctionGeometry,
      player:game.getPlayerState()
    };
  });
  assert.equal(result.tech.assetsRequested,4);
  assert.equal(result.tech.assetsLoaded,4,'All four downloaded props should load');
  assert.equal(result.tech.assetsFailed,0,'No GLB load failures are expected');
  assert.equal(result.tech.estimatedTriangles,29548);
  assert.equal(result.tech.textureMaxDimension,512);
  assert.equal(result.techCollisionProxies,2,'Terminal and hologram projector should have static Bullet colliders');
  assert.equal(result.physics.mode,'ammo-bullet-capsule','Bullet player physics should remain active');
  assert.ok(result.physics.colliderCount >= 1028,'Tech props and selective Yaba junction solids should be registered in Bullet physics');
  assert.equal(result.terminal?.id,'stage09-tech-sci-fi-terminal','Raycast should hit the terminal Bullet collider');
  assert.equal(result.projector?.id,'stage09-tech-hologram-projector','Raycast should hit the projector Bullet collider');
  assert.equal(result.interaction?.success,true,'Mide Tech Hub interaction should be available');
  assert.equal(result.interaction?.id,'mide-tech-hub-demo');
  assert.ok(result.renderGroups.includes('stage09-tech-equipment'),'Technology prop render group should be visible in scene diagnostics');
  assert.equal(result.junctions.treatedIntersections,19,'Ikeja junction geometry should remain intact');
  assert.equal(result.junctions.roadWidthsUnchanged,true);
  assert.deepEqual(errors,[],'browser errors: '+errors.join('; '));
  console.log(JSON.stringify({pass:true,result,browserErrors:errors},null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
