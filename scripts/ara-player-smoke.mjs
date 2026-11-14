import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
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
 const state=await page.evaluate(()=>{const g=window.__NAIJA_GAME__;return {ready:g.ready,playerCharacterReady:g.playerCharacterReady,characterSource:g.characterSource,characterGeometry:g.characterGeometry,characterLoadError:g.characterLoadError,animations:g.heroAnimations,defaults:g.heroDefaultClips,rig:g.getHeroRigSnapshot?.(),mainCharacterId:g.mainCharacterId,mainCharacterName:g.mainCharacterName,hero01Role:g.hero01Role,heroNpc:g.getHeroNpcState?.(),traversal:g.getTraversalState?.(),physics:g.getPhysicsState?.(),vfx:g.getVfxState?.(),audio:g.getAudioState?.(),drawCalls:window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount,canvas:{w:document.querySelector('#application')?.width,h:document.querySelector('#application')?.height},gate:document.querySelector('#rpg-interface')?.classList.contains('character-required'),picker:!!document.querySelector('#player-character-file'),panel:document.querySelector('#panel-content')?.innerText,status:document.querySelector('#status')?.textContent,assetStatus:document.querySelector('#asset-status')?.textContent,
  startupPreload:g.startupPreload,characterForwardCorrection:g.characterForwardCorrection,
  objective:!!document.querySelector('.objective'),parkourButton:!!document.querySelector('#parkour-button'),
  loadingHidden:document.querySelector('#city-loading')?.hidden,
  cameraActualDistance:g.getPlayerState?.().cameraActualDistance,
  surfacePatches:g.surfacePatches,
  surfaceProbes:{
   asphalt:g.getGroundProbe?.([0,1,0],[0,-1,0])?.surface,
   concrete:g.getGroundProbe?.([-6.1,1,0],[-6.1,-1,0])?.surface,
   grass:g.getGroundProbe?.([-9.1,1,0],[-9.1,-1,0])?.surface,
   wet:g.getGroundProbe?.([1.25,1,-34],[1.25,-1,-34])?.surface
  }}});
 if(String(state.assetStatus||'').includes('Environment startup failed')||String(state.status||'').includes('Could not start'))throw Error('Game startup failed: '+JSON.stringify({status:state.status,assetStatus:state.assetStatus}));
 if(!state.playerCharacterReady||state.characterSource!=='ara-3d-gen-female-preset'||state.characterGeometry!=='rigged-glb')throw Error('Ara GLB not active: '+JSON.stringify(state));
 if(state.characterForwardCorrection!==180)throw Error('Ara forward-facing correction failed: '+JSON.stringify(state.characterForwardCorrection));
 if(state.startupPreload?.total!==48||state.startupPreload?.loaded!==48||state.startupPreload?.failed!==0||!state.startupPreload?.ready||!state.loadingHidden)throw Error('Yaba building preload was incomplete before play: '+JSON.stringify({preload:state.startupPreload,loadingHidden:state.loadingHidden}));
 if(state.objective||state.parkourButton)throw Error('Obstructive objective HUD or duplicate parkour button remains in active controls');
 if(!(state.cameraActualDistance>0&&state.cameraActualDistance<4.6))throw Error('Third-person camera did not initialize at the closer chase distance: '+state.cameraActualDistance);
 if(JSON.stringify(state.surfaceProbes)!==JSON.stringify({asphalt:'asphalt',concrete:'concrete',grass:'grass',wet:'wet'}))throw Error('Surface raycasts failed: '+JSON.stringify(state.surfaceProbes));
 if((state.rig?.boneCount??0)<50||(state.rig?.skinnedMeshCount??0)<1)throw Error('Ara rig invalid: '+JSON.stringify(state.rig));
 if(!state.audio?.available||!state.audio.effects.includes('footstep')||state.audio.mode!=='procedural-web-audio')throw Error('Player audio system unavailable: '+JSON.stringify(state.audio));
 const joystickBox=await page.locator('#move-joystick').boundingBox();
 if(!joystickBox)throw Error('Mobile movement joystick is not visible');
 const joystickCenter={x:joystickBox.x+joystickBox.width/2,y:joystickBox.y+joystickBox.height/2};
 await page.mouse.move(joystickCenter.x,joystickCenter.y);
 await page.mouse.down();
 await page.mouse.move(joystickCenter.x,joystickCenter.y-joystickBox.height*.30,{steps:8});
 await page.waitForTimeout(1350);
 const walkState=await page.evaluate(()=>({player:window.__NAIJA_GAME__?.getPlayerState?.(),animation:window.__NAIJA_GAME__?.getHeroAnimationState?.(),audio:window.__NAIJA_GAME__?.getAudioState?.(),feet:window.__NAIJA_GAME__?.getHeroFootPositions?.()}));
 if(!walkState.player?.moving||walkState.animation?.activeClip!=='Walk'||Math.hypot(walkState.player.position[0],walkState.player.position[2])<.005)throw Error('Touch joystick did not produce real Ara walking movement: '+JSON.stringify(walkState));
 if(!walkState.feet?.left?.every(Number.isFinite)||!walkState.feet?.right?.every(Number.isFinite)||walkState.player.footPlacementHits<1)throw Error('Animated foot contact/foot-bone sampling did not register: '+JSON.stringify(walkState));
 await page.mouse.up();
 // Reversing the stick direction must turn the visible character, not leave it walking side-on.
 await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0,0,0],0));
 await page.mouse.move(joystickCenter.x,joystickCenter.y);
 await page.mouse.down();
 await page.mouse.move(joystickCenter.x,joystickCenter.y+joystickBox.height*.30,{steps:8});
 await page.waitForTimeout(450);
 const reverseState=await page.evaluate(()=>({player:window.__NAIJA_GAME__?.getPlayerState?.(),face:window.__NAIJA_GAME__?.getHeroAnimationState?.().visualForward}));
 await page.mouse.up();
 if(!reverseState.player?.moving||reverseState.player.position[2]<=0||Math.abs(reverseState.player.facingYaw)<120||reverseState.face?.[2]<.5)throw Error('Backward joystick movement did not turn Ara to face the reverse direction: '+JSON.stringify(reverseState));
 const sprintButton=page.locator('#sprint-button');
 if(!(await sprintButton.isVisible()))throw Error('Mobile sprint control is not visible');
 await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0,0,0],0));
 await page.mouse.move(joystickCenter.x,joystickCenter.y);
 await page.mouse.down();
 await page.mouse.move(joystickCenter.x,joystickCenter.y-joystickBox.height*.30,{steps:8});
 const sprintBox=await sprintButton.boundingBox();
 await sprintButton.dispatchEvent('pointerdown',{pointerId:93,pointerType:'touch',isPrimary:true,button:0,buttons:1,clientX:sprintBox.x+sprintBox.width/2,clientY:sprintBox.y+sprintBox.height/2});
 await sprintButton.dispatchEvent('pointerup',{pointerId:93,pointerType:'touch',isPrimary:true,button:0,buttons:0,clientX:sprintBox.x+sprintBox.width/2,clientY:sprintBox.y+sprintBox.height/2});
 await page.waitForTimeout(850);
 const runState=await page.evaluate(()=>({player:window.__NAIJA_GAME__?.getPlayerState?.(),animation:window.__NAIJA_GAME__?.getHeroAnimationState?.(),pressed:document.querySelector('#sprint-button')?.getAttribute('aria-pressed')}));
 await page.mouse.up();
 if(!runState.player?.running||!runState.player?.sprintEnabled||runState.animation?.activeClip!=='Run'||runState.pressed!=='true')throw Error('Mobile sprint tap did not toggle Ara running animation: '+JSON.stringify(runState));
 await sprintButton.tap();
 const sprintOff=await page.evaluate(()=>({player:window.__NAIJA_GAME__?.getPlayerState?.(),pressed:document.querySelector('#sprint-button')?.getAttribute('aria-pressed')}));
 if(sprintOff.player?.sprintEnabled||sprintOff.pressed!=='false')throw Error('Second sprint tap did not disable sprint: '+JSON.stringify(sprintOff));
 if(!walkState.audio?.available)throw Error('Audio did not initialise after the first gameplay gesture: '+JSON.stringify(walkState.audio));
 for(const clip of ['Idle','Walk','Run','Jump','Jump start','Jump (in air)','Jump land','Vault over obstacle','Climb up ledge','Forward roll','Side dodge left','Side dodge right','Ara_Crouch','Ara_CrouchWalk'])if(!state.animations.includes(clip))throw Error('Missing animation '+clip+': '+state.animations.join(', '));
 const animationChecks=await page.evaluate(()=>{
  const g=window.__NAIJA_GAME__,play=window.__NAIJA_PLAY_HERO_ANIMATION__;
  const cases=[['Hero01_Walk','Walk'],['Hero01_Sprint','Run'],['Hero01_JumpStart','Jump start'],['Hero01_Jump','Jump (in air)'],['Hero01_Landing','Jump land'],['Hero01_VaultLow','Vault over obstacle'],['Hero01_Mantle','Climb up ledge'],['Hero01_Roll','Forward roll'],['Hero01_DodgeLeft','Side dodge left'],['Hero01_DodgeRight','Side dodge right']];
  return cases.map(([alias,expected])=>{const played=play(alias,1);return {alias,expected,played,activeClip:g.getHeroAnimationState().activeClip};});
 });
 const failedAnimations=animationChecks.filter(item=>!item.played||item.activeClip!==item.expected);
 if(failedAnimations.length)throw Error('Animation alias mapping failed: '+JSON.stringify(failedAnimations));
 await page.evaluate(()=>window.__NAIJA_PLAY_HERO_ANIMATION__?.('Hero01_Idle',1));
 await page.waitForTimeout(1250);
 const collisionProbe=await page.evaluate(()=>window.__NAIJA_GAME__?.debugProbeWorldCollisionForSmoke?.());
 if(!collisionProbe?.buildingBlocked||!collisionProbe?.roadwayClear||collisionProbe.corridorProxies<55)throw Error('Full environment collision proxy coverage failed: '+JSON.stringify(collisionProbe));
 const bulletCollision=await page.evaluate(()=>window.__NAIJA_GAME__?.debugProbeBulletCollisionForSmoke?.());
 if(!bulletCollision?.stoppedByBuilding||bulletCollision.endX>=bulletCollision.buildingBoundaryX)throw Error('Live Bullet movement did not stop at the building proxy: '+JSON.stringify(bulletCollision));
 await page.waitForTimeout(400);
 const crouchStarted=await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetCrouchedForSmoke?.(true));
 await page.waitForTimeout(1200);
 const crouchState=await page.evaluate(()=>({player:window.__NAIJA_GAME__?.getPlayerState?.(),physics:window.__NAIJA_GAME__?.getPhysicsState?.().player,animation:window.__NAIJA_GAME__?.getHeroAnimationState?.(),rig:window.__NAIJA_GAME__?.getHeroRigSnapshot?.()}));
 const standingHipsY=state.rig?.bones?.find(bone=>bone.name==='Hips')?.position?.[1];
 const crouchedHipsY=crouchState.rig?.bones?.find(bone=>bone.name==='Hips')?.position?.[1];
 const crouchedSpineX=crouchState.rig?.bones?.find(bone=>bone.name==='Spine2')?.rotation?.[0];
 if(!crouchStarted||!crouchState.player?.crouched||Math.abs(crouchState.physics?.capsuleHeight-1.22)>.01||crouchState.animation?.activeClip!=='Ara_Crouch'||!(crouchedHipsY<standingHipsY-.05)||Math.abs(crouchedSpineX)>15)throw Error('Ara crouch animation/capsule/rig pose failed: '+JSON.stringify({crouchState,standingHipsY,crouchedHipsY}));
 const crouchJoystick=await page.locator('#move-joystick').boundingBox();
 await page.mouse.move(crouchJoystick.x+crouchJoystick.width/2,crouchJoystick.y+crouchJoystick.height/2);
 await page.mouse.down();
 await page.mouse.move(crouchJoystick.x+crouchJoystick.width/2,crouchJoystick.y+crouchJoystick.height*.16,{steps:7});
 await page.waitForTimeout(650);
 const crouchWalkState=await page.evaluate(()=>({player:window.__NAIJA_GAME__?.getPlayerState?.(),physics:window.__NAIJA_GAME__?.getPhysicsState?.().player,animation:window.__NAIJA_GAME__?.getHeroAnimationState?.()}));
 await page.mouse.up();
 if(!crouchWalkState.player?.moving||!crouchWalkState.player?.crouched||Math.abs(crouchWalkState.physics?.capsuleHeight-1.22)>.01||crouchWalkState.animation?.activeClip!=='Ara_CrouchWalk')throw Error('Crouch-walking animation/controller failed: '+JSON.stringify(crouchWalkState));
 await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([-12.3,0,-82],90));
 const standBlocked=await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetCrouchedForSmoke?.(false));
 if(standBlocked!==false)throw Error('Crouch controller allowed standing inside an obstructed building footprint');
 await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0,0,0],0));
 const standRestored=await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetCrouchedForSmoke?.(false));
 const standState=await page.evaluate(()=>({player:window.__NAIJA_GAME__?.getPlayerState?.(),physics:window.__NAIJA_GAME__?.getPhysicsState?.().player}));
 if(!standRestored||standState.player?.crouched||Math.abs(standState.physics?.capsuleHeight-1.8)>.01)throw Error('Standing capsule did not restore after crouch: '+JSON.stringify(standState));
 const jumpPhysics=await page.evaluate(()=>window.__NAIJA_GAME__?.debugJumpPhysicsForSmoke?.());
 if(!jumpPhysics||jumpPhysics.airborne.position[1]<=0||!jumpPhysics.landed.grounded||jumpPhysics.landed.position[1]!==0)throw Error('Jump/landing physics check failed: '+JSON.stringify(jumpPhysics));
 if((jumpPhysics.vfx?.byType?.jump||0)<1||(jumpPhysics.vfx?.byType?.landing||0)<1)throw Error('Jump/landing VFX events did not fire: '+JSON.stringify(jumpPhysics.vfx));
 // Use the same Jump touch action as the player: at an obstacle it must parkour.
 await page.evaluate(()=>{window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0,0,0],0);});
 const jumpBox=await page.locator('#jump-button').boundingBox();
 await page.locator('#jump-button').dispatchEvent('pointerdown',{pointerId:90,pointerType:'touch',isPrimary:true,button:0,buttons:1,clientX:jumpBox.x+jumpBox.width/2,clientY:jumpBox.y+jumpBox.height/2});
 const jumpActionClip=await page.evaluate(()=>window.__NAIJA_GAME__?.getHeroAnimationState?.().activeClip);
 const parkour=await page.evaluate(()=>window.__NAIJA_GAME__?.debugAdvanceTraversalForSmoke?.(30));
 if(!parkour?.traversal?.lastTraversal||parkour.traversal.lastTraversal.type!=='step'||parkour.traversal.traversalsStarted<1||parkour.traversal.traversalsCompleted<1||parkour.player.position[1]<.3||jumpActionClip!=='Climb up ledge')throw Error('Jump touch action did not perform and complete nearby step parkour: '+JSON.stringify({parkour,jumpActionClip}));
 // Away from a traversal surface the same Jump button must perform an ordinary jump.
 await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0,0,45],0));
 const openJumpBox=await page.locator('#jump-button').boundingBox();
 await page.locator('#jump-button').dispatchEvent('pointerdown',{pointerId:91,pointerType:'touch',isPrimary:true,button:0,buttons:1,clientX:openJumpBox.x+openJumpBox.width/2,clientY:openJumpBox.y+openJumpBox.height/2});
 const normalJump=await page.evaluate(()=>window.__NAIJA_GAME__?.debugAdvanceTraversalForSmoke?.(7));
 if(!normalJump?.player||normalJump.player.grounded||normalJump.player.position[1]<.25)throw Error('Jump touch action did not fall back to an ordinary jump away from obstacles: '+JSON.stringify(normalJump));
 if(state.gate||state.picker)throw Error('Player import gate or old FBX picker remains visible');
 if(state.mainCharacterId!=='ara-female'||state.hero01Role!=='city-npc')throw Error('Character roles changed: '+JSON.stringify(state));
 await page.waitForFunction(()=>window.__NAIJA_GAME__?.getHeroNpcState?.()?.moved===true,null,{timeout:20000});
 const npc=await page.evaluate(()=>window.__NAIJA_GAME__?.getHeroNpcState?.());
 if(npc?.isPlayer!==false||npc?.rigged!==true)throw Error('Hero 01 NPC role broken: '+JSON.stringify(npc));
 const audio=await page.evaluate(()=>window.__NAIJA_GAME__?.getAudioState?.());
 if(!audio?.unlocked||audio.state!=='running'||audio.played?.footstep<1||audio.played?.jump<1||audio.played?.landing<1||audio.played?.parkour<1)throw Error('Player sound events did not unlock or fire from real gameplay actions: '+JSON.stringify(audio));
 const screenshot=await page.locator('#application').screenshot({animations:'disabled'});
 await mkdir('out',{recursive:true});
 await page.screenshot({path:'out/ara-player-smoke.png',fullPage:false});
 const vfx=await page.evaluate(()=>window.__NAIJA_GAME__?.getVfxState?.());
 if(vfx?.poolSize!==24||vfx.active>vfx.poolSize||vfx.byType?.dust<1||vfx.byType?.jump<1||vfx.byType?.landing<1||vfx.byType?.parkour<1)throw Error('Bounded player VFX events/pool failed: '+JSON.stringify(vfx));
 const relevantErrors=errors.filter(e=>!e.includes('ammo.wasm.js')&&!e.includes('Failed to load resource: net::ERR_EMPTY_RESPONSE')); if(relevantErrors.length)throw Error('Browser errors: '+relevantErrors.join(' | '));
 console.log(JSON.stringify({pass:true,state,walkState,reverseState,runState,sprintOff,animationChecks,collisionProbe,bulletCollision,crouchState,crouchWalkState,standBlocked,standState,jumpPhysics,parkour,jumpActionClip,normalJump,npc,audio,vfx,screenshotBytes:screenshot.length,browserErrors:errors},null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
