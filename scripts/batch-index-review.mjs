import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const port=4175, origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
 let ready=false;for(let i=0;i<60;i++){try{const r=await fetch(origin);if(r.ok){ready=true;break;}}catch{}if(server.exitCode!==null)throw new Error(`Vite exited ${server.exitCode}`);await delay(500);}if(!ready)throw new Error('Vite not ready');
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--enable-precise-memory-info','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:844,height:390},screen:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>3});Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>4});});
 const page=await context.newPage();await page.goto(origin+'?smoke=1',{waitUntil:'networkidle',timeout:90000});
 await page.waitForFunction(()=>window.__NAIJA_GAME__?.ready===true,null,{timeout:90000});
 await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0,0,-65],0));
 await page.waitForFunction(()=>window.__NAIJA_GAME__?.getStage08EState?.()?.heroBuildingLoaded===true,null,{timeout:90000});
 await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0,0,0],0));await page.waitForFunction(()=>window.__NAIJA_GAME__?.getUnbatchedComponentAudit?.()?.unbatchedComponents>=571,null,{timeout:45000});await page.waitForTimeout(350);
 await page.evaluate(()=>{window.__NAIJA_RPG_PAUSED__=true;window.__NAIJA_GAME__?.debugSetCameraForSmoke?.([0,10,13],[0,1.5,-60]);});await page.waitForTimeout(300);
 const result=await page.evaluate(()=>({audit:window.__NAIJA_GAME__?.getUnbatchedComponentAudit?.(),preExisting:window.__NAIJA_GAME__?.getPreExistingBatchIndex?.(),render:window.__NAIJA_GAME__?.getRenderBreakdown?.(),batch:window.__NAIJA_GAME__?.getStaticBatchState?.()?.stage08Q,device:{deviceMemoryGiB:navigator.deviceMemory??null,hardwareConcurrency:navigator.hardwareConcurrency??null,maxTouchPoints:navigator.maxTouchPoints??0,touchCapable:('ontouchstart' in window)||navigator.maxTouchPoints>0},memoryDiagnostics:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize,jsHeapSizeLimit:performance.memory.jsHeapSizeLimit}:null}));
 await writeFile('/workspace/Naija-City-08Q/artifacts/daylight-review/batch-index-reconciliation.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({auditRows:result.audit?.components?.length,unbatched:result.audit?.unbatchedComponents,preExisting:result.preExisting?.preExistingBatchedComponents,renderTotal:result.render?.components,qAssigned:result.batch?.assignedComponents}));
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
