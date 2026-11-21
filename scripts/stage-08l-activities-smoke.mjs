import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port=4180,origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
  let ready=false;
  for(let i=0;i<60;i++){try{const response=await fetch(origin);if(response.ok){ready=true;break;}}catch{}if(server.exitCode!==null)throw new Error(`Vite exited ${server.exitCode}`);await delay(500);}
  assert.ok(ready,'Vite should start');
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:480,height:270},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
  await page.goto(origin+'?smoke=1&stage08l-activities=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__NAIJA_GAME__?.ready===true,null,{timeout:120000});
  const visualDir='/tmp/naija-city-visual-audit/stage-08l-activities';mkdirSync(visualDir,{recursive:true});
  const report=await page.evaluate(async()=>{
    const g=window.__NAIJA_GAME__,out=[];
    for(const hub of g.stage08L.hubs){
      const loaded=await g.debugLoadGidiForSmoke(hub.position);
      if(!loaded.ready)throw new Error(hub.district+' GIDI cell not ready');
      const ground=g.getGroundProbe([hub.center[0],hub.center[1]+3,hub.center[2]],[hub.center[0],hub.center[1]-2,hub.center[2]]);
      if(!ground?.point||Math.abs(ground.point[1]-hub.center[1])>.15)throw new Error(hub.district+' interior floor does not align with streamed ground: '+JSON.stringify(ground));
      const wall=g.getGroundProbe([hub.center[0]-6,hub.center[1]+1.5,hub.center[2]],[hub.center[0]-3,hub.center[1]+1.5,hub.center[2]]);
      if(!wall?.id?.includes('rear-wall'))throw new Error(hub.district+' rear wall collision missing: '+JSON.stringify(wall));
      const doorway=g.getGroundProbe([hub.center[0]+3,hub.center[1]+1.5,hub.center[2]],[hub.center[0]+5,hub.center[1]+1.5,hub.center[2]]);
      if(doorway?.id?.includes('front-wall'))throw new Error(hub.district+' doorway is blocked: '+JSON.stringify(doorway));
      for(const pickup of hub.pickups){
        g.debugSetPlayerForSmoke(pickup.position,0);
        const result=g.debugInteractForSmoke();
        if(!result.success)throw new Error(hub.district+' pickup interaction failed: '+JSON.stringify(result));
      }
      g.debugSetPlayerForSmoke(hub.position,0);
      const completed=g.debugInteractForSmoke();
      if(!completed.success||!completed.result?.message?.startsWith('ACTIVITY COMPLETE'))throw new Error(hub.district+' activity completion failed: '+JSON.stringify(completed));
      out.push({district:hub.district,activity:hub.activity,pickups:hub.pickups.length,completed:true,groundSurface:ground.surface,rearWallCollision:wall.id,doorwayClear:!doorway?.id?.includes('front-wall'),loadedCells:loaded.loadedCells});
    }
    return {activities:g.getStage08LState(),report:out,interactions:g.getInteractionState(),cameraTargets:g.stage08L.hubs.map(h=>({district:h.district,center:h.center,position:h.position}))};
  });
  for(const target of report.cameraTargets){
    await page.waitForTimeout(3200); // let the completion toast from the previous test expire
    await page.evaluate(async({position,center,district})=>{
      const g=window.__NAIJA_GAME__;await g.debugLoadGidiForSmoke(position);
      g.debugSetPlayerForSmoke(center,0);
      window.__NAIJA_RPG_UI__?.setDistrictLabel?.(district,district==='Ekiti Highlands'?'Ekiti':'Lagos');
      window.__NAIJA_RPG_PAUSED__=true;
      g.debugSetCameraForSmoke([center[0]+16,center[1]+11,center[2]+15],[center[0],center[1]+1,center[2]]);
      document.getElementById('hud-toast')?.classList.remove('visible');
    },target);
    await page.screenshot({path:visualDir+'/'+target.district.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-activity-hub.png'});
    await page.evaluate(()=>{window.__NAIJA_RPG_PAUSED__=false;});
  }
  assert.equal(report.activities.completedActivities,5);
  for(const hub of report.activities.activities)assert.equal(hub.completed,true);
  assert.equal(report.interactions.interactions>=20,true);
  assert.deepEqual(errors,[],'browser errors: '+errors.join('; '));
  console.log(JSON.stringify({pass:true,report,browserErrors:errors,visualAuditDir:visualDir},null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
