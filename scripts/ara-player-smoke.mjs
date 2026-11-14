import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
const port=4174,origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
 let ready=false;for(let i=0;i<40;i++){try{if((await fetch(origin)).ok){ready=true;break}}catch{}if(server.exitCode!==null)throw Error('preview exited '+server.exitCode);await delay(500)}
 if(!ready)throw Error('preview did not start');
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(origin+'?smoke=ara',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__NAIJA_GAME__?.ready===true,null,{timeout:90000});
 await page.waitForFunction(()=>window.__NAIJA_GAME__?.playerCharacterReady===true,null,{timeout:60000});
 await page.waitForFunction(()=>window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount>0,null,{timeout:30000});
 const state=await page.evaluate(()=>{const g=window.__NAIJA_GAME__;return {ready:g.ready,playerCharacterReady:g.playerCharacterReady,characterSource:g.characterSource,characterGeometry:g.characterGeometry,characterLoadError:g.characterLoadError,animations:g.heroAnimations,defaults:g.heroDefaultClips,rig:g.getHeroRigSnapshot?.(),mainCharacterId:g.mainCharacterId,mainCharacterName:g.mainCharacterName,hero01Role:g.hero01Role,heroNpc:g.getHeroNpcState?.(),traversal:g.getTraversalState?.(),drawCalls:window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount,canvas:{w:document.querySelector('#application')?.width,h:document.querySelector('#application')?.height},gate:document.querySelector('#rpg-interface')?.classList.contains('character-required'),picker:!!document.querySelector('#player-character-file'),panel:document.querySelector('#panel-content')?.innerText,status:document.querySelector('#status')?.textContent,assetStatus:document.querySelector('#asset-status')?.textContent}});
 if(String(state.assetStatus||'').includes('Environment startup failed')||String(state.status||'').includes('Could not start'))throw Error('Game startup failed: '+JSON.stringify({status:state.status,assetStatus:state.assetStatus}));
 if(!state.playerCharacterReady||state.characterSource!=='ara-3d-gen-female-preset'||state.characterGeometry!=='rigged-glb')throw Error('Ara GLB not active: '+JSON.stringify(state));
 if((state.rig?.boneCount??0)<50||(state.rig?.skinnedMeshCount??0)<1)throw Error('Ara rig invalid: '+JSON.stringify(state.rig));
 for(const clip of ['Idle','Walk','Run','Jump','Vault over obstacle','Climb up ledge'])if(!state.animations.includes(clip))throw Error('Missing animation '+clip+': '+state.animations.join(', '));
 if(state.gate||state.picker)throw Error('Player import gate or old FBX picker remains visible');
 if(state.mainCharacterId!=='ara-female'||state.hero01Role!=='city-npc')throw Error('Character roles changed: '+JSON.stringify(state));
 await page.waitForFunction(()=>window.__NAIJA_GAME__?.getHeroNpcState?.()?.moved===true,null,{timeout:20000});
 const npc=await page.evaluate(()=>window.__NAIJA_GAME__?.getHeroNpcState?.());
 if(npc?.isPlayer!==false||npc?.rigged!==true)throw Error('Hero 01 NPC role broken: '+JSON.stringify(npc));
 const screenshot=await page.locator('#application').screenshot({animations:'disabled'});
 await page.screenshot({path:'/workspace/naija-city/out/ara-player-smoke.png',fullPage:false});
 const relevantErrors=errors.filter(e=>!e.includes('ammo.wasm.js')&&!e.includes('Failed to load resource: net::ERR_EMPTY_RESPONSE')); if(relevantErrors.length)throw Error('Browser errors: '+relevantErrors.join(' | '));
 console.log(JSON.stringify({pass:true,state,npc,screenshotBytes:screenshot.length,browserErrors:errors},null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
