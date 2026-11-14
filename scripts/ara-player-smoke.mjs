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
 const state=await page.evaluate(()=>{const g=window.__NAIJA_GAME__;return {ready:g.ready,playerCharacterReady:g.playerCharacterReady,characterSource:g.characterSource,characterGeometry:g.characterGeometry,characterLoadError:g.characterLoadError,animations:g.heroAnimations,defaults:g.heroDefaultClips,rig:g.getHeroRigSnapshot?.(),mainCharacterId:g.mainCharacterId,mainCharacterName:g.mainCharacterName,hero01Role:g.hero01Role,heroNpc:g.getHeroNpcState?.(),traversal:g.getTraversalState?.(),physics:g.getPhysicsState?.(),vfx:g.getVfxState?.(),audio:g.getAudioState?.(),drawCalls:window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount,canvas:{w:document.querySelector('#application')?.width,h:document.querySelector('#application')?.height},gate:document.querySelector('#rpg-interface')?.classList.contains('character-required'),picker:!!document.querySelector('#player-character-file'),panel:document.querySelector('#panel-content')?.innerText,status:document.querySelector('#status')?.textContent,assetStatus:document.querySelector('#asset-status')?.textContent}});
 if(String(state.assetStatus||'').includes('Environment startup failed')||String(state.status||'').includes('Could not start'))throw Error('Game startup failed: '+JSON.stringify({status:state.status,assetStatus:state.assetStatus}));
 if(!state.playerCharacterReady||state.characterSource!=='ara-3d-gen-female-preset'||state.characterGeometry!=='rigged-glb')throw Error('Ara GLB not active: '+JSON.stringify(state));
 if((state.rig?.boneCount??0)<50||(state.rig?.skinnedMeshCount??0)<1)throw Error('Ara rig invalid: '+JSON.stringify(state.rig));
 if(!state.audio?.available||!state.audio.effects.includes('footstep')||state.audio.mode!=='procedural-web-audio')throw Error('Player audio system unavailable: '+JSON.stringify(state.audio));
 for(const clip of ['Idle','Walk','Run','Jump','Jump start','Jump (in air)','Jump land','Vault over obstacle','Climb up ledge','Forward roll','Side dodge left','Side dodge right'])if(!state.animations.includes(clip))throw Error('Missing animation '+clip+': '+state.animations.join(', '));
 const animationChecks=await page.evaluate(()=>{
  const g=window.__NAIJA_GAME__,play=window.__NAIJA_PLAY_HERO_ANIMATION__;
  const cases=[['Hero01_Walk','Walk'],['Hero01_Sprint','Run'],['Hero01_JumpStart','Jump start'],['Hero01_Jump','Jump (in air)'],['Hero01_Landing','Jump land'],['Hero01_VaultLow','Vault over obstacle'],['Hero01_Mantle','Climb up ledge'],['Hero01_Roll','Forward roll'],['Hero01_DodgeLeft','Side dodge left'],['Hero01_DodgeRight','Side dodge right']];
  return cases.map(([alias,expected])=>{const played=play(alias,1);return {alias,expected,played,activeClip:g.getHeroAnimationState().activeClip};});
 });
 const failedAnimations=animationChecks.filter(item=>!item.played||item.activeClip!==item.expected);
 if(failedAnimations.length)throw Error('Animation alias mapping failed: '+JSON.stringify(failedAnimations));
 await page.evaluate(()=>window.__NAIJA_PLAY_HERO_ANIMATION__?.('Hero01_Idle',1));
 const jumpPhysics=await page.evaluate(()=>window.__NAIJA_GAME__?.debugJumpPhysicsForSmoke?.());
 if(!jumpPhysics||jumpPhysics.airborne.position[1]<=0||!jumpPhysics.landed.grounded||jumpPhysics.landed.position[1]!==0)throw Error('Jump/landing physics check failed: '+JSON.stringify(jumpPhysics));
 if((jumpPhysics.vfx?.byType?.jump||0)<1||(jumpPhysics.vfx?.byType?.landing||0)<1)throw Error('Jump/landing VFX events did not fire: '+JSON.stringify(jumpPhysics.vfx));
 const parkour=await page.evaluate(()=>window.__NAIJA_GAME__?.debugTraverseTypeForSmoke?.('low-vault'));
 if(!parkour?.started||!parkour.completed||parkour.traversal.lastTraversal?.type!=='low-vault')throw Error('Low vault traversal check failed: '+JSON.stringify(parkour));
 if(state.gate||state.picker)throw Error('Player import gate or old FBX picker remains visible');
 if(state.mainCharacterId!=='ara-female'||state.hero01Role!=='city-npc')throw Error('Character roles changed: '+JSON.stringify(state));
 await page.waitForFunction(()=>window.__NAIJA_GAME__?.getHeroNpcState?.()?.moved===true,null,{timeout:20000});
 const npc=await page.evaluate(()=>window.__NAIJA_GAME__?.getHeroNpcState?.());
 if(npc?.isPlayer!==false||npc?.rigged!==true)throw Error('Hero 01 NPC role broken: '+JSON.stringify(npc));
 const screenshot=await page.locator('#application').screenshot({animations:'disabled'});
 await page.screenshot({path:'/workspace/naija-city/out/ara-player-smoke.png',fullPage:false});
 const relevantErrors=errors.filter(e=>!e.includes('ammo.wasm.js')&&!e.includes('Failed to load resource: net::ERR_EMPTY_RESPONSE')); if(relevantErrors.length)throw Error('Browser errors: '+relevantErrors.join(' | '));
 console.log(JSON.stringify({pass:true,state,animationChecks,jumpPhysics,parkour,npc,screenshotBytes:screenshot.length,browserErrors:errors},null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
