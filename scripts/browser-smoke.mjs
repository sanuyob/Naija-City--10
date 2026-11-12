import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
const port=4173,origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try {
 let ready=false;
 for(let i=0;i<60;i++){try{const response=await fetch(origin);if(response.ok){ready=true;break;}}catch{}if(server.exitCode!==null)throw new Error(`Vite preview exited with code ${server.exitCode}`);await delay(500);}
 if(!ready)throw new Error('Vite preview did not become ready');
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.goto(origin,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__NAIJA_GAME__?.ready===true,null,{timeout:60000});
 await page.waitForFunction(()=>window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount>0,null,{timeout:15000});
 const state=await page.evaluate(()=>({viewport:{w:innerWidth,h:innerHeight},canvas:(()=>{const c=document.querySelector('#application'),r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bufferW:c.width,bufferH:c.height,webgl2:!!c.getContext('webgl2')};})(),diag:window.__NAIJA_RENDER_DIAGNOSTICS__,game:window.__NAIJA_GAME__}));
 if(state.viewport.w!==390||state.viewport.h!==844)throw new Error('Test viewport is not 390x844: '+JSON.stringify(state.viewport));
 if(!state.canvas.webgl2||state.canvas.w<380||state.canvas.h<800||state.canvas.h>900||state.canvas.y>1)throw new Error('Canvas does not fit the mobile viewport: '+JSON.stringify(state.canvas));
 if(state.diag.drawCallCount<=0||state.diag.scene.meshInstances<30||!state.diag.scene.diagnosticMarker.inFront)throw new Error('No actual scene geometry submitted for rendering: '+JSON.stringify(state.diag));
 if(state.diag.camera.position[2]<=0||state.diag.camera.forward[2]>=-0.2)throw new Error('Chase camera is not behind the player and looking down the road: '+JSON.stringify(state.diag.camera));
 if(state.game?.assets?.modelsLoaded!==1||state.game?.assets?.texturesLoaded!==1||state.game?.assets?.failures?.length)throw new Error('GLB/texture pipeline did not complete: '+JSON.stringify(state.game?.assets));
 const screenshot=await page.locator('#application').screenshot({animations:'disabled'});
 const visual=await page.evaluate(async encoded=>{
   const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
   const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
   const colors=new Set();let magenta=0,nonBlue=0;
   for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];if(!a)continue;colors.add((r>>3)+','+(g>>3)+','+(b>>3));if(r>100&&b>100&&g<100)magenta++;if(!(b>r*1.05&&b>g*1.02))nonBlue++;}
   return {width:canvas.width,height:canvas.height,uniqueColorBuckets:colors.size,magentaPixels:magenta,nonBluePixels:nonBlue};
 },screenshot.toString('base64'));
 if(visual.width<380||visual.height<800||visual.uniqueColorBuckets<12||visual.nonBluePixels<1000||visual.magentaPixels<20)throw new Error('Canvas screenshot visual assertion failed; scene may be blank: '+JSON.stringify(visual));
 if(!(await page.locator('.minimap').isVisible())||!(await page.locator('.objective').isVisible())||!(await page.locator('.weapon').isVisible()))throw new Error('Core RPG HUD zones are not visible');
 for(const [button,title] of [['inventory','Inventory'],['quests','Missions'],['map','District map'],['character','Character']]){await page.locator('[data-open="'+button+'"]').first().click();await page.locator('#rpg-panel').waitFor({state:'visible'});if(!(await page.locator('#panel-title').textContent()).includes(title))throw new Error('RPG menu failed: '+button);await page.locator('[data-close]').click();}
 await page.locator('[data-open="pause"]').click();await page.locator('#rpg-pause').waitFor({state:'visible'});await page.locator('[data-resume]').click();
 await page.locator('[data-open="settings"]').click();await page.locator('[data-setting="motion"]').click();if(await page.locator('[data-setting="motion"]').getAttribute('aria-pressed')!=='true')throw new Error('Settings toggle did not respond');await page.locator('[data-close]').click();
 await page.locator('#assets-toggle').click();await page.locator('#assets-panel[open]').waitFor({state:'visible'});
 const inventory=await page.locator('#assets-panel').textContent();
 if(!inventory?.includes('Low-poly shop building blocks')||!inventory.includes('Not in this build'))throw new Error('Asset inventory contents are incomplete');
 await page.locator('#assets-close').click();
 await page.locator('#perf-toggle').click();await page.locator('#perf-panel').waitFor({state:'visible'});await page.waitForTimeout(1200);
 if(!/FPS/.test((await page.locator('#perf-panel').textContent())??''))throw new Error('Performance telemetry did not update');
 if(errors.length)throw new Error('Browser errors: '+errors.join(' | '));
 console.log('Stage 05 RPG UI and Stage 04 preserved-engine verification passed: 390x844 canvas, camera direction, mesh instances, nonzero draw calls, screenshot pixel assertion including magenta diagnostic marker, GLB + texture loaded, physics and performance panel.');
 console.log('Render diagnostics: '+JSON.stringify(state.diag));
 console.log('Canvas screenshot metrics: '+JSON.stringify(visual));
 await context.close();
} finally {if(browser)await browser.close();server.kill('SIGTERM');}
