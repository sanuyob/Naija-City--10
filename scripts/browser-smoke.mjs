import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
const port=4173,origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try {
 let ready=false;
 for(let i=0;i<60;i++){try{const r=await fetch(origin);if(r.ok){ready=true;break;}}catch{}if(server.exitCode!==null)throw new Error(`Vite preview exited with code ${server.exitCode}`);await delay(500);}
 if(!ready)throw new Error('Vite preview did not become ready');
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(origin,{waitUntil:'networkidle'});await page.locator('#status').filter({hasText:'Ready'}).waitFor({timeout:45000});
 if(!await page.locator('#application').evaluate(c=>Boolean(c.getContext('webgl2'))))throw new Error('WebGL 2 unavailable');
 if(!await page.evaluate(()=>window.__NAIJA_GAME__?.ready&&window.__NAIJA_GAME__?.junction&&window.__NAIJA_GAME__?.stage===4&&window.__NAIJA_GAME__?.traffic===6&&window.__NAIJA_GAME__?.physics===true&&window.__NAIJA_GAME__?.wheelCount===4&&window.__NAIJA_GAME__?.trafficPhysicsBodies===6))throw new Error('Stage 04 Ammo vehicle or traffic physics readiness missing');
 const go=page.locator('[data-control="accelerate"]'),b=await go.boundingBox();if(!b)throw new Error('GO control is not visible');
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(1400);
 const speed=parseInt((await page.locator('#speed').textContent())??'0',10);await page.mouse.up();if(!(speed>0))throw new Error('Accelerator did not increase speed');
 await page.locator('#perf-toggle').click();await page.locator('#perf-panel').waitFor({state:'visible'});await page.waitForTimeout(1300);
 if(!/FPS/.test((await page.locator('#perf-panel').textContent())??''))throw new Error('Performance telemetry did not update');
 if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);
 console.log(`Stage 04 browser smoke passed: 390x844, WebGL 2, Ammo raycast vehicle + four wheels, six physical traffic colliders, GO (${speed} km/h), live performance panel.`);
 await context.close();
} finally {if(browser)await browser.close();server.kill('SIGTERM');}
