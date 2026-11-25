import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port=4183,origin=`http://127.0.0.1:${port}`;
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
  await page.waitForFunction(()=>window.__NAIJA_GAME__?.getYabaStreetLife01State?.().staticBatches>0,null,{timeout:15000});
  const result=await page.evaluate(()=>{
    const game=window.__NAIJA_GAME__;
    return {
      street:game.getYabaStreetLife01State(),
      spawn:game.firstSpawnPosition,
      player:game.getPlayerState(),
      world:game.getRenderBreakdown().groups.map(group=>group.name),
      collision:game.worldCollision,
      batches:game.getStaticBatchState().stage08P
    };
  });
  const street=result.street;
  assert.equal(street.stage,'08P');
  assert.equal(street.id,'yaba-street-life-01');
  assert.equal(street.layout.existingYabaPreserved,true);
  assert.equal(street.layout.replacedLegacyPlaceholder,true);
  assert.equal(street.layout.hiddenLegacyProps,11);
  assert.equal(street.assetsRequested,8);
  assert.equal(street.assetsLoaded,8);
  assert.deepEqual(street.assetFailures,[]);
  assert.deepEqual(street.textureFailures,[]);
  assert.equal(street.customSigns,7);
  assert.equal(street.overheadWireSpans,2);
  assert.equal(street.powerPoles,3);
  assert.ok(street.customMeshes>=90);
  assert.ok(street.collisionProxies>=20);
  assert.equal(result.player.grounded,true);
  assert.deepEqual(result.spawn,[-8,0.12,-40]);
  assert.ok(result.world.includes('stage08p-yaba-street-life-01'));
  assert.ok(result.collision.yabaStreetLife01Proxies>=20);
  assert.ok(result.batches?.groupId>=0&&result.batches?.batches>0,'Stage 08P static batch group must generate render batches');
  assert.ok(result.world.includes('stage08j-yaba-ikeja'),'existing Yaba street infrastructure should remain');
  assert.deepEqual(errors,[],'browser errors: '+errors.join('; '));

  // Verify that the explicit Data Saver path skips imported GLBs and textures
  // while preserving the street blockout and procedural fallback signs.
  const saverPage=await browser.newPage({viewport:{width:480,height:270},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const saverErrors=[];
  saverPage.on('pageerror',error=>saverErrors.push('page: '+error.message));
  saverPage.on('console',message=>{if(message.type()==='error')saverErrors.push('console: '+message.text());});
  saverPage.on('requestfailed',request=>saverErrors.push('request: '+request.url()+': '+request.failure()?.errorText));
  await saverPage.addInitScript(()=>{localStorage.setItem('naijaCityDataSaver','true');});
  await saverPage.goto(origin+'/?smoke=1&stage08n-neighbourhoods=1',{waitUntil:'domcontentloaded'});
  await saverPage.waitForFunction(()=>window.__NAIJA_GAME__?.ready===true,null,{timeout:120000});
  const saver=await saverPage.evaluate(()=>window.__NAIJA_GAME__.getYabaStreetLife01State());
  assert.equal(saver.dataSaverFallback,true);
  assert.equal(saver.assetsLoaded,0,'Data Saver must skip optional imported GLBs');
  assert.equal(saver.assetFailures.length,0);
  assert.equal(saver.textureFailures.length,0);
  assert.equal(saver.collisionProxies>=20,true);
  assert.equal(saver.overheadWireSpans,0,'Data Saver skips optional wire GLB download');
  assert.deepEqual(saverErrors,[],'Data Saver browser errors: '+saverErrors.join('; '));
  await saverPage.close();
  console.log(JSON.stringify({pass:true,result,dataSaver:{enabled:saver.dataSaverFallback,assetsLoaded:saver.assetsLoaded,collisionProxies:saver.collisionProxies,errors:saverErrors},browserErrors:errors},null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
