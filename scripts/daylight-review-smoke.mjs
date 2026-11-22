import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const port=4174, origin=`http://127.0.0.1:${port}`;
const reviewDir=new URL('../artifacts/daylight-review/',import.meta.url);
await mkdir(reviewDir,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
const errors=[],consoleErrors=[];
try {
  let ready=false;
  for(let i=0;i<60;i++){
    try{const response=await fetch(origin);if(response.ok){ready=true;break;}}catch{}
    if(server.exitCode!==null)throw new Error(`Vite preview exited with code ${server.exitCode}`);
    await delay(500);
  }
  if(!ready)throw new Error('Vite preview did not become ready');

  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const context=await browser.newContext({viewport:{width:844,height:390},screen:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{
    Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>3});
    Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>4});
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto(origin+'?smoke=1',{waitUntil:'networkidle',timeout:90000});
  await page.waitForFunction(()=>window.__NAIJA_GAME__?.ready===true,null,{timeout:90000});
  await page.waitForFunction(()=>window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount>0,null,{timeout:30000});
  const boot=await page.evaluate(()=>({
    gameReady:window.__NAIJA_GAME__?.ready,
    lowMemoryDevice:window.__NAIJA_GAME__?.dataOptimization?.lowMemoryDevice,
    startup:window.__NAIJA_GAME__?.startupPreload??null
  }));
  if(!boot.gameReady)throw new Error('Game did not become ready');

  // Bring the hero Computer Village building into the active camera region.
  await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0,0,-65],0));
  await page.waitForFunction(()=>window.__NAIJA_GAME__?.getStage08EState?.()?.heroBuildingLoaded===true,null,{timeout:90000});
  const heroLoad=await page.evaluate(()=>window.__NAIJA_GAME__?.getStage08EState?.());
  if(!heroLoad?.heroBuildingLoaded||heroLoad.heroLoadError)throw new Error('Yaba hero building failed to load: '+JSON.stringify(heroLoad));

  // Return to the original Yaba spawn, let the camera settle, then freeze world simulation for a clean still.
  await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0,0,0],0));
  await page.waitForTimeout(900);
  await page.evaluate(()=>{window.__NAIJA_RPG_PAUSED__=true;});
  await page.waitForTimeout(250);

  const capture=async(name)=>{
    const buffer=await page.locator('#application').screenshot({animations:'disabled',timeout:30000});
    const png=PNG.sync.read(buffer);
    if(png.width<800||png.height<360)throw new Error(`${name} screenshot has unexpected dimensions ${png.width}x${png.height}`);
    await writeFile(new URL(name+'-full.png',reviewDir),buffer);
    return {width:png.width,height:png.height,bytes:buffer.length};
  };
  const getAudit=()=>page.evaluate(()=>{
    const game=window.__NAIJA_GAME__,diag=window.__NAIJA_RENDER_DIAGNOSTICS__||{};
    return {
      visualSettings:game?.getVisualSettings?.()||null,
      lightingAudit:game?.getLightingAudit?.()||null,
      staticBatchState:game?.getStaticBatchState?.()||null,
      renderDiagnostics:{
        drawCallCount:diag.drawCallCount??null,primitiveCount:diag.primitiveCount??null,
        meshInstances:diag.scene?.meshInstances??null,frameTime:diag.frameTime??null,
        camera:diag.camera??null
      },
      worldLighting:game?.rendering?.worldLighting||null,
      stage08E:game?.getStage08EState?.()||null,
      playerPosition:game?.getPlayerState?.().position||null,
      lowMemoryDevice:game?.dataOptimization?.lowMemoryDevice??null
    };
  });
  const yabaImage=await capture('yaba-daylight');
  const yabaAudit=await getAudit();
  const measureFarClipSweep=async()=>{
    const results=[];
    for(const distance of [650,500,420,350]){
      await page.evaluate(value=>window.__NAIJA_GAME__?.debugSetCameraFarClipForSmoke?.(value),distance);
      await page.waitForTimeout(300);
      results.push(await page.evaluate(()=>({farClip:window.__NAIJA_RENDER_DIAGNOSTICS__?.camera?.farClip??null,drawCalls:window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount??null,meshInstances:window.__NAIJA_RENDER_DIAGNOSTICS__?.scene?.meshInstances??null,frameTime:window.__NAIJA_RENDER_DIAGNOSTICS__?.frameTime??null})));
    }
    await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetCameraFarClipForSmoke?.(650));
    await page.waitForTimeout(250);
    return results;
  };
  const yabaFarClipSweep=await measureFarClipSweep();
  await writeFile(new URL('yaba-daylight-audit.json',reviewDir),JSON.stringify({
    capture:'Yaba spawn after Stage 08E hero building was loaded',
    viewport:{width:844,height:390},image:yabaImage,boot,heroLoad,
    audit:yabaAudit,farClipSweep:yabaFarClipSweep,jsErrors:errors,consoleErrors
  },null,2));

  // Capture the actual Ikeja buildings with the existing documented QA camera pose.
  await page.evaluate(()=>{
    window.__NAIJA_GAME__?.debugSetCameraForSmoke?.([0,10,382],[0,1.5,310]);
  });
  await page.waitForTimeout(250);
  const ikejaImage=await capture('ikeja-daylight');
  const ikejaAudit=await getAudit();
  const ikejaFarClipSweep=await measureFarClipSweep();
  const timeOfDayAudit=[];
  for(const [hour,label] of [[6,'sunrise'],[12,'noon'],[18,'sunset'],[20,'night']]){
    await page.evaluate(value=>window.__NAIJA_GAME__?.debugSetWorldTimeForSmoke?.(value),hour);
    await page.waitForTimeout(120);
    const image=await capture('time-'+label);
    const audit=await getAudit();
    timeOfDayAudit.push({hour,label,image,visualSettings:audit.visualSettings,lighting:audit.lightingAudit?.worldLighting});
  }
  await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetWorldTimeForSmoke?.(9.25));
  await page.waitForTimeout(120);
  await writeFile(new URL('ikeja-daylight-audit.json',reviewDir),JSON.stringify({
    capture:'Ikeja district camera view',viewport:{width:844,height:390},
    image:ikejaImage,audit:ikejaAudit,farClipSweep:ikejaFarClipSweep,timeOfDayAudit,jsErrors:errors,consoleErrors
  },null,2));

  if(errors.length)throw new Error('Browser JavaScript errors: '+errors.join(' | '));
  console.log('DAYLIGHT_REVIEW_RESULT '+JSON.stringify({
    boot,heroLoad,yabaImage,ikejaImage,
    yabaLighting:yabaAudit.lightingAudit,ikejaLighting:ikejaAudit.lightingAudit,
    yabaStaticBatchState:yabaAudit.staticBatchState,ikejaStaticBatchState:ikejaAudit.staticBatchState,
    yabaFarClipSweep,ikejaFarClipSweep,timeOfDayAudit,
    yabaVisuals:yabaAudit.visualSettings,ikejaVisuals:ikejaAudit.visualSettings,
    yabaRender:yabaAudit.renderDiagnostics,ikejaRender:ikejaAudit.renderDiagnostics,
    consoleErrors,jsErrors:errors
  }));
} finally {
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
