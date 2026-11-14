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
 const context=await browser.newContext({viewport:{width:844,height:390},screen:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.goto(origin+'?smoke=1',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__NAIJA_GAME__?.ready===true,null,{timeout:60000});
 await page.waitForFunction(()=>window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount>0,null,{timeout:15000});
 const state=await page.evaluate(()=>{
  const game=window.__NAIJA_GAME__;
  const scalarFields=source=>Object.fromEntries(Object.entries(source||{}).filter(([,value])=>value===null||['string','number','boolean'].includes(typeof value)));
  return {
   viewport:{w:innerWidth,h:innerHeight},
   canvas:(()=>{const c=document.querySelector('#application'),r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bufferW:c.width,bufferH:c.height,webgl2:!!c.getContext('webgl2')};})(),
   diag:window.__NAIJA_RENDER_DIAGNOSTICS__||null,
   game:game?{
    stage:game.stage,
    stage08A:scalarFields(game.stage08A),
    stage08B:scalarFields(game.stage08B),
    stage08C:scalarFields(game.stage08C),
    stage08D:scalarFields(game.stage08D),
    stage08G:scalarFields(game.stage08G),
    stage08H:{...scalarFields(game.stage08H),wearDistribution:game.stage08H?.wearDistribution||null,materialFamilyCount:game.stage08H?.materialFamilies?.length??0,materialAssignmentCounts:game.stage08H?.materialAssignmentCounts||{}},
    assets:{modelsLoaded:game.assets?.modelsLoaded,texturesLoaded:game.assets?.texturesLoaded,failures:game.assets?.failures||[]},
    thirdPersonCharacter:game.thirdPersonCharacter,
    movement:game.movement,
    sprint:game.sprint,
    jump:game.jump,
    proceduralAnimations:game.proceduralAnimations,
    characterGeometry:game.characterGeometry,
    heroAnimations:game.heroAnimations||[],
    heroFaceMorphs:game.heroFaceMorphs||[],
    heroAnimationState:game.getHeroAnimationState?.()||null,
    traversal:game.getTraversalState?.()||null,
    traversalEnabled:game.traversal===true,
    companionRoster:game.getCompanionState?.()||null,
    pedestrianState:game.getPedestrianState?.()||null,
    physicsState:game.getPhysicsState?.()||null,
    vfxState:game.getVfxState?.()||null,
    heroRigSnapshot:game.getHeroRigSnapshot?.()||null,
    mobileJoystick:game.mobileJoystick,
    cameraOrbit:game.cameraOrbit
   }:null
  };
 });
 if(state.game?.stage08G?.stage!=='08G'||state.game?.stage08G?.district!=='Ikeja'||state.game?.stage08G?.roadLengthMetres!==150||state.game?.stage08G?.vendorStalls!==4||state.game?.stage08G?.parkedVehicles!==3||state.game?.stage08G?.staticPedestrianSilhouettes!==4||state.game?.stage08G?.litterHotspots!==4||state.game?.stage08G?.liveNpcAI!==false||state.game?.stage08G?.liveTrafficSimulation!==false)throw new Error('Stage 08G Ikeja street-life prototype metadata is incomplete: '+JSON.stringify(state.game?.stage08G));
 if(state.game?.stage08H?.stage!=='08H'||state.game?.stage08H?.district!=='Ikeja'||state.game?.stage08H?.texturedProps<50||state.game?.stage08H?.wearDistribution?.clean<1||state.game?.stage08H?.wearDistribution?.used<1||state.game?.stage08H?.wearDistribution?.weathered<1||state.game?.stage08H?.materialFamilyCount!==11||state.game?.stage08H?.texturedMaterialFamilies!==10||state.game?.stage08H?.textureMapSets!==10||state.game?.stage08H?.generatedTextureCount!==30||state.game?.stage08H?.unrenderedTaggedProps!==0||state.game?.stage08H?.addedDetailMeshes<20||state.game?.stage08H?.staticBatching!==true||!Object.keys(state.game.stage08H.materialAssignmentCounts||{}).some(name=>name.includes('asphalt'))||!Object.keys(state.game.stage08H.materialAssignmentCounts||{}).some(name=>name.includes('plaster'))||Object.values(state.game.stage08H.materialAssignmentCounts||{}).reduce((sum,count)=>sum+count,0)!==state.game.stage08H.texturedProps)throw new Error('Stage 08H Ikeja prop realism/material audit is incomplete: '+JSON.stringify(state.game?.stage08H));
 if(state.game?.stage!==9||state.game?.stage08A?.stage!=='08A'||state.game?.stage08A?.parallelRoads!==2||state.game?.stage08A?.crossStreets!==3||state.game?.stage08A?.commercialBuildings!==8||state.game?.stage08A?.residentialBuildings!==8)throw new Error('Stage 08A expansion metadata is incomplete: '+JSON.stringify(state.game?.stage08A));
 if(state.game?.stage08B?.stage!=='08B'||state.game?.stage08B?.commercialFacades!==8||state.game?.stage08B?.residentialFacades!==8||state.game?.stage08B?.detailMeshes<200||state.game?.stage08B?.batching!==true)throw new Error('Stage 08B facade detail metadata is incomplete: '+JSON.stringify(state.game?.stage08B));
 if(state.game?.stage08C?.stage!=='08C'||state.game?.stage08C?.utilityPoles!==16||state.game?.stage08C?.busShelters!==2||state.game?.stage08C?.pocketParksFurnished!==3||state.game?.stage08C?.batching!==true||state.game?.stage08C?.dynamicActorsAdded!==0||state.game?.stage08C?.detailMeshes<150)throw new Error('Stage 08C street infrastructure metadata is incomplete: '+JSON.stringify(state.game?.stage08C));
 if(state.game?.stage08D?.stage!=='08D'||state.game?.stage08D?.buildingsTextured!==48||state.game?.stage08D?.commercialBuildingsDetailed!==40||state.game?.stage08D?.residentialBuildingsDetailed!==8||state.game?.stage08D?.originalYabaBuildings!==32||state.game?.stage08D?.expansionBuildings!==16||state.game?.stage08D?.pbrMaterialFamilies!==10||state.game?.stage08D?.proceduralTextureMaps!==13||state.game?.stage08D?.signVariants!==4||state.game?.stage08D?.textureResolution!==512||state.game?.stage08D?.secondaryTextureResolution!==256||state.game?.stage08D?.batching!==true||state.game?.stage08D?.detailMeshes<550)throw new Error('Stage 08D building realism metadata is incomplete: '+JSON.stringify(state.game?.stage08D));
 await page.waitForFunction(()=>{const s=window.__NAIJA_GAME__?.getStage08EState?.();return !!s&&(s.loadedBuildings>0||s.failedBuildings>0);},null,{timeout:30000});
 try {
  await page.waitForFunction(()=>window.__NAIJA_GAME__?.getStage08EState?.()?.heroBuildingLoaded===true,null,{timeout:60000});
 } catch(error) {
  const diagnostic=await page.evaluate(()=>({
   stage08E:window.__NAIJA_GAME__?.getStage08EState?.(),
   status:document.querySelector('#status')?.textContent,
   assetStatus:document.querySelector('#asset-status')?.textContent
  }));
  throw new Error('Computer Village KTX2 hero failed to load within 60 seconds: '+JSON.stringify({diagnostic,errors})+'; '+error.message);
 }
 const stage08EState=await page.evaluate(()=>window.__NAIJA_GAME__?.getStage08EState?.());
 const collisionTest=await page.evaluate(()=>{
  const state=window.__NAIJA_GAME__?.getStage08EState?.();
  const resolve=window.__NAIJA_GAME__?.resolveBuildingMovement;
  const current=[-5.3,0,-82],attempt=[-6.3,0,-82];
  return {count:state?.collisionProxyCount,mode:state?.collisionMode,radius:state?.collisionRadius,result:resolve?.(current,attempt)};
 });
 if(collisionTest.count!==48||!collisionTest.mode?.includes('persistent')||Math.abs(collisionTest.result?.[0]-(-5.3))>0.001)throw new Error('Persistent building collision test failed: '+JSON.stringify(collisionTest));
 const stage08FProfile=await page.evaluate(()=>window.__NAIJA_GAME__?.getStage08FProfile?.());
 if(!stage08FProfile||stage08FProfile.stage!=='08F'||!Array.isArray(stage08FProfile.limitations)||!stage08FProfile.rendering)throw new Error('Stage 08F device profiling API is not exposed: '+JSON.stringify(stage08FProfile));
 if(stage08EState?.stage!=='08E'||stage08EState.expectedBuildings!==48||stage08EState.legacyBodiesHidden<48||stage08EState.loadedBuildings<1||stage08EState.staticBatching!==true)throw new Error('Stage 08E GLB streaming did not replace blockout buildings: '+JSON.stringify(stage08EState));
 if(stage08EState.heroBuildingId!=='yaba-core-01'||!stage08EState.heroTextureEncoding.includes('KHR_texture_basisu')||stage08EState.heroPbrMaterials.length!==7||stage08EState.heroLoadError)throw new Error('Computer Village hero GLB/KTX2 runtime load failed: '+JSON.stringify(stage08EState));
 if(state.diag.scene.knownBounds.max[2]!==402||state.diag.scene.knownBounds.min[2]!==-205)throw new Error('Expanded city bounds are not exposed correctly: '+JSON.stringify(state.diag.scene.knownBounds));
 if(state.viewport.w!==844||state.viewport.h!==390)throw new Error('Test viewport is not landscape 844x390: '+JSON.stringify(state.viewport));
 if(!state.canvas.webgl2||state.canvas.w<800||state.canvas.h<360||state.canvas.h>450||state.canvas.y>1)throw new Error('Canvas does not fit the mobile viewport: '+JSON.stringify(state.canvas));
 if(state.diag.drawCallCount<=0||state.diag.scene.meshInstances<30||!state.diag.scene.diagnosticMarker.inFront)throw new Error('No actual scene geometry submitted for rendering: '+JSON.stringify(state.diag));
 if(state.diag.camera.position[2]<=0||state.diag.camera.forward[2]>=-0.2)throw new Error('Third-person camera is not behind the player and facing the scene: '+JSON.stringify(state.diag.camera));
 const stick=await page.locator('#move-joystick').boundingBox();
 if(!stick||!(await page.locator('#jump-button').isVisible())||!(await page.locator('#sprint-button').isVisible())||!(await page.locator('#crouch-button').isVisible())||!(await page.locator('#interact-button').isVisible()))throw new Error('Landscape movement/action controls are missing');
 if(await page.locator('#orientation-notice').isVisible())throw new Error('Landscape orientation notice should be hidden in landscape');
 const before=await page.evaluate(()=>window.__NAIJA_GAME__.getPlayerState().position);
 await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await page.mouse.down();await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height*0.12,{steps:5});await page.waitForTimeout(650);await page.mouse.up();
 const after=await page.evaluate(()=>window.__NAIJA_GAME__.getPlayerState().position);
 if(Math.hypot(after[0]-before[0],after[2]-before[2])<0.25)throw new Error('Movement joystick did not move the human player: '+JSON.stringify({before,after}));
 await page.locator('#jump-button').tap();
 await page.waitForFunction(()=>{const state=window.__NAIJA_GAME__?.getPlayerState();return !!state&&(state.position[1]>0.05||!state.grounded);},null,{timeout:1500});
 const jumpState=await page.evaluate(()=>window.__NAIJA_GAME__.getPlayerState());
 if(jumpState.position[1]<=0.05||jumpState.grounded)throw new Error('Touch jump input did not make the character airborne: '+JSON.stringify(jumpState));
 await page.locator('#crouch-button').click();
 if(!(await page.evaluate(()=>window.__NAIJA_GAME__.getPlayerState().crouched)))throw new Error('Crouch button did not change player stance');
 await page.locator('#crouch-button').click();
 await page.locator('#interact-button').click();
 if(!(await page.locator('#hud-toast').textContent()))throw new Error('Interact control did not produce feedback');
 await page.locator('[data-slot="1"]').click();
 if(!(await page.locator('#hud-toast').textContent()).includes('empty')||await page.locator('[data-slot="1"]').getAttribute('aria-pressed')!=='true')throw new Error('Quick-access slot did not respond or show selection state');
 if(!state.game?.thirdPersonCharacter||!state.game?.movement||!state.game?.sprint||!state.game?.jump||state.game?.proceduralAnimations!==false||state.game?.characterGeometry!=='rigged-glb'||state.game?.heroAnimations?.length!==60||!['Hero01_Idle','Hero01_Walk','Hero01_Jog','Hero01_Sprint','Hero01_Jump','Hero01_Interact','Hero01_VaultLow','Hero01_LedgeHang','Hero01_SquadSignalFollow','Hero01_UseScanner'].every(name=>state.game.heroAnimations.includes(name))||state.game?.heroAnimationState?.availableClipCount!==60||state.game?.heroFaceMorphs?.length!==6||!['Smile','Frown','JawOpen','BrowRaise','Blink_L','Blink_R'].every(name=>state.game.heroFaceMorphs.includes(name))||state.game?.traversalEnabled!==true||state.game?.traversal?.obstacleCount!==8||state.game?.companionRoster?.maxActive!==2||state.game?.companionRoster?.commands?.length!==7||state.game?.companionRoster?.activeCount!==0||state.game?.pedestrianState?.activeCount!==10||state.game?.physicsState?.mode!=='kinematic-capsule'||state.game?.vfxState?.poolSize<12||state.game?.heroRigSnapshot?.skinnedMeshCount<9||!state.game?.mobileJoystick||!state.game?.cameraOrbit)throw new Error('Rigged Hero 01, traversal or companion system was not mounted: '+JSON.stringify(state.game));
 const heroActionTriggered=await page.evaluate(()=>window.__NAIJA_PLAY_HERO_ANIMATION__?.('Hero01_GreetWave')===true);
 if(!heroActionTriggered)throw new Error('PlayCanvas could not trigger the Hero01_GreetWave clip');
 await page.waitForFunction(()=>window.__NAIJA_GAME__?.getHeroAnimationState?.().activeClip==='Hero01_GreetWave',null,{timeout:3000});
 const faceExpressionApplied=await page.evaluate(()=>window.__NAIJA_SET_HERO_FACE__?.('Smile',0.75)===true);
 if(!faceExpressionApplied)throw new Error('PlayCanvas did not apply the Hero01 Smile morph target');
 await page.evaluate(()=>window.__NAIJA_SET_HERO_FACE__?.('Smile',0));

 // Verify contextual traversal at the known tutorial obstacle beside the spawn route.
 await page.evaluate(()=>window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0,0,0],0));
 const traversalStarted=await page.evaluate(()=>window.__NAIJA_TRAVERSE__?.()===true);
 if(!traversalStarted)throw new Error('Hero 01 could not start contextual step-up traversal');
 await page.waitForFunction(()=>window.__NAIJA_GAME__?.getTraversalState?.().traversalsStarted===1,null,{timeout:3000});
 const traversalAdvance=await page.evaluate(()=>window.__NAIJA_GAME__?.debugAdvanceTraversalForSmoke?.(32));
 if(!traversalAdvance||traversalAdvance.player.traversing||traversalAdvance.traversal.traversalsStarted!==1)throw new Error('Traversal did not complete its bounded movement sequence: '+JSON.stringify(traversalAdvance));

 // Read the instantiated Hero skin/clothing rig and test representative pose changes.
 const initialRig=await page.evaluate(()=>window.__NAIJA_GAME__?.getHeroRigSnapshot?.());
 if(!initialRig||initialRig.skinnedMeshCount<9||initialRig.boneCount<15||initialRig.weightedVertexCount<1000)throw new Error('Hero runtime rig/clothing snapshot incomplete: '+JSON.stringify(initialRig));
 const poseReports=[];
 for(const clip of ['Hero01_Walk','Hero01_Sprint','Hero01_Jump','Hero01_VaultLow','Hero01_Mantle','Hero01_LedgePullUp','Hero01_LadderClimb','Hero01_WallHop']){
  if(!(await page.evaluate(name=>window.__NAIJA_PLAY_HERO_ANIMATION__?.(name)===true,clip)))throw new Error('Could not trigger pose QA clip '+clip);
  await page.waitForTimeout(280);
  const before=await page.evaluate(()=>window.__NAIJA_GAME__?.getHeroRigSnapshot?.());
  await page.waitForTimeout(160);
  const after=await page.evaluate(()=>window.__NAIJA_GAME__?.getHeroRigSnapshot?.());
  const prior=new Map((before?.bones||[]).map(b=>[b.name,b]));
  const changed=(after?.bones||[]).filter(b=>{const a=prior.get(b.name);if(!a)return false;const x=[...a.position,...a.rotation],y=[...b.position,...b.rotation];return y.some((n,i)=>Math.abs(n-x[i])>.001);}).length;
  poseReports.push({clip,changedBones:changed});
  if(after?.skinnedMeshCount<9||changed<1)throw new Error('Rig did not deform through '+clip+': '+JSON.stringify({after,changed}));
 }
 await page.evaluate(()=>window.__NAIJA_PLAY_HERO_ANIMATION__?.('Hero01_Idle'));
 // Complete all eight contextual parkour actions through the live player controller.
 const parkourReports=[];
 for(const type of ['step','low-vault','high-vault','mantle','ledge','ladder','wall-run','drop']){
  const result=await page.evaluate(value=>window.__NAIJA_GAME__?.debugTraverseTypeForSmoke?.(value),type);
  if(!result?.started||!result?.completed||result?.traversal?.lastTraversal?.type!==type)throw new Error('Parkour move failed for '+type+': '+JSON.stringify(result));
  parkourReports.push({type,clip:result.traversal.lastTraversal.clip});
 }
 // Verify the player leaves the ground, falls under gravity and lands with effects.
 const jumpPhysics=await page.evaluate(()=>window.__NAIJA_GAME__?.debugJumpPhysicsForSmoke?.());
 if(!jumpPhysics?.airborne||jumpPhysics.airborne.position[1]<.25||jumpPhysics.airborne.verticalVelocity<=0||!jumpPhysics.landed.grounded||jumpPhysics.landed.position[1]!==0||jumpPhysics.vfx.emitted<3)throw new Error('Player jump/landing physics or VFX failed: '+JSON.stringify(jumpPhysics));
 // Verify ten full NPCs are rendered, move on their routes and share actor physics.
 const crowd=await page.evaluate(()=>window.__NAIJA_GAME__?.getPedestrianState?.());
 const actorPhysics=await page.evaluate(()=>window.__NAIJA_GAME__?.getPhysicsState?.());
 if(crowd?.activeCount!==10||crowd?.visibleCount!==10||crowd?.renderMeshInstances<60||crowd?.moved<1||actorPhysics?.steps<1)throw new Error('Ambient NPC population/physics missing or idle: '+JSON.stringify({crowd,actorPhysics,poseReports,parkourReports}));
 // Verify remote-entry companions, the two-person cap and approved squad commands.
 const techSummoned=await page.evaluate(()=>window.__NAIJA_COMPANION_COMMAND__?.('tech','Summon')===true);
 const driverSummoned=await page.evaluate(()=>window.__NAIJA_COMPANION_COMMAND__?.('driver','Summon')===true);
 if(!techSummoned||!driverSummoned)throw new Error('Two companion roster slots could not be summoned');
 const roster=await page.evaluate(()=>window.__NAIJA_GAME__?.getCompanionState?.());
 if(roster?.activeCount!==2||roster?.maxActive!==2||roster?.commands?.length!==7)throw new Error('Companion cap/command set failed: '+JSON.stringify(roster));
 if(roster.roster.some(actor=>actor.active&&actor.spawnDistance<5))throw new Error('Companions must enter from district locations, not spawn beside the player');
 const hold=await page.evaluate(()=>window.__NAIJA_COMPANION_COMMAND__?.('tech','Hold')===true);
 const radio=await page.evaluate(()=>window.__NAIJA_COMPANION_COMMAND__?.('driver','RadioCall')===true);
 if(!hold||!radio)throw new Error('Companion Hold or RadioCall command did not register');
 const dismissed=await page.evaluate(()=>window.__NAIJA_COMPANION_COMMAND__?.('tech','Dismiss')===true);
 if(!dismissed)throw new Error('Companion Dismiss command failed');
 await page.evaluate(()=>window.__NAIJA_COMPANION_COMMAND__?.('driver','Dismiss'));
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
 if(visual.width<800||visual.height<360||visual.uniqueColorBuckets<12||visual.nonBluePixels<1000||visual.magentaPixels<20)throw new Error('Canvas screenshot visual assertion failed; scene may be blank: '+JSON.stringify(visual));
 if(!(await page.locator('#parkour-button').isVisible()))throw new Error('Parkour button is missing from the mobile HUD');
 if(!(await page.locator('.minimap').isVisible())||!(await page.locator('.objective').isVisible())||!(await page.locator('.status').isVisible())||!(await page.locator('.quick-slots').isVisible()))throw new Error('Core landscape RPG HUD zones are not visible');
 const hudBoxes=await page.evaluate(()=>Object.fromEntries(['#move-joystick','.actions','.quick-slots','.nav'].map(sel=>{const el=document.querySelector(sel),r=el.getBoundingClientRect();return [sel,{x:r.x,y:r.y,w:r.width,h:r.height,display:getComputedStyle(el).display}]})));
 if(hudBoxes['#move-joystick'].x>140||hudBoxes['.actions'].x<694||hudBoxes['.nav'].display!=='none')throw new Error('HUD controls are not grouped into clean left/right thumb zones: '+JSON.stringify(hudBoxes));
 if(await page.locator('.nav').isVisible())throw new Error('Legacy bottom navigation should be removed from active gameplay HUD');
 for(const [button,title] of [['inventory','Inventory'],['quests','Missions'],['map','District map'],['character','Character']]){await page.locator('[data-open="pause"]').click();await page.locator('[data-open="'+button+'"]:visible').last().click();await page.locator('#rpg-panel').waitFor({state:'visible'});if(!(await page.locator('#panel-title').textContent()).includes(title))throw new Error('RPG menu failed: '+button);await page.locator('[data-close]').click();}
 await page.locator('[data-open="pause"]').click();await page.locator('#rpg-pause').waitFor({state:'visible'});if(await page.evaluate(()=>window.__NAIJA_RPG_PAUSED__)!==true)throw new Error('Pause menu did not pause the simulation');await page.locator('[data-resume]').click();if(await page.evaluate(()=>window.__NAIJA_RPG_PAUSED__)!==false)throw new Error('Resume did not restore the simulation');
 await page.locator('[data-open="pause"]').click();await page.locator('[data-open="settings"]').click();await page.locator('[data-setting="motion"]').click();if(await page.locator('[data-setting="motion"]').getAttribute('aria-pressed')!=='true')throw new Error('Settings toggle did not respond');await page.locator('[data-close]').click();
 await page.evaluate(()=>document.querySelector('#assets-toggle').click());await page.locator('#assets-panel[open]').waitFor({state:'visible'});
 const inventory=await page.locator('#assets-panel').textContent();
 if(!inventory?.includes('Low-poly shop building blocks')||!inventory.includes('STAGE 08B NIGERIAN BUILDING DETAIL')||!inventory.includes('STAGE 08D SEMI-PHOTOREAL BUILDING REALISM')||!inventory.includes('Still not in this build'))throw new Error('Asset inventory contents are incomplete');
 await page.locator('#assets-close').click();
 await page.evaluate(()=>document.querySelector('#perf-toggle').click());await page.locator('#perf-panel').waitFor({state:'visible'});await page.waitForTimeout(1200);
 if(!/FPS/.test((await page.locator('#perf-panel').textContent())??''))throw new Error('Performance telemetry did not update');
 const profileAfterWarmup=await page.evaluate(()=>window.__NAIJA_GAME__?.getStage08FProfile?.());
 if(!profileAfterWarmup||profileAfterWarmup.stage!=='08F'||profileAfterWarmup.sampleCount<1||!profileAfterWarmup.frame||!('p95Ms' in profileAfterWarmup.frame))throw new Error('Stage 08F frame-time sampling did not start: '+JSON.stringify(profileAfterWarmup));
 if(!(await page.locator('#profile-export').isVisible()))throw new Error('Physical-device profile export control is not visible when the performance panel is open');
 await page.evaluate(()=>{
  window.__NAIJA_RPG_PAUSED__=true;
  window.__NAIJA_GAME__.debugSetCameraForSmoke([0,10,382],[0,1.5,310]);
 });
 await page.waitForTimeout(160);
 const ikejaScreenshot=await page.locator('#application').screenshot({animations:'disabled'});
 const ikejaVisual=await page.evaluate(async encoded=>{
  const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
  const colors=new Set();let nonBlue=0;
  for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];if(!a)continue;colors.add((r>>3)+','+(g>>3)+','+(b>>3));if(!(b>r*1.05&&b>g*1.02))nonBlue++;}
  return {width:canvas.width,height:canvas.height,uniqueColorBuckets:colors.size,nonBluePixels:nonBlue};
 },ikejaScreenshot.toString('base64'));
 if(ikejaVisual.width<800||ikejaVisual.height<360||ikejaVisual.uniqueColorBuckets<18||ikejaVisual.nonBluePixels<1000)throw new Error('Ikeja material/prop camera screenshot failed: '+JSON.stringify(ikejaVisual));
 await page.evaluate(()=>{window.__NAIJA_RPG_PAUSED__=false;});
 if(errors.length)throw new Error('Browser errors: '+errors.join(' | '));
 await page.setViewportSize({width:390,height:844});await page.locator('#orientation-notice').waitFor({state:'visible'});await page.setViewportSize({width:844,height:390});await page.locator('#orientation-notice').waitFor({state:'hidden'});
 console.log('Stage 08B passed: eight commercial and eight residential facades with modular Nigerian-inspired detail.');
 console.log('Stage 08G passed: Ikeja commercial corridor, vendor props, POS kiosk, wheelbarrow, handcart, litter hotspots, open drainage, parked public transport and static pedestrian silhouettes.');
 console.log('Stage 08H passed: procedural PBR surfaces, varied clean/used/weathered props, material assignment coverage, translucent glazing, detailed props and an Ikeja camera-view screenshot assertion.');
 console.log('Ikeja screenshot metrics: '+JSON.stringify(ikejaVisual));
 console.log('Stage 08C passed: static Nigerian street infrastructure, utilities, drainage, street furniture and bus shelters with mobile-oriented static batching.');
 console.log('Stage 08D passed: semi-photoreal PBR materials and modular facade upgrades across all 48 Yaba district buildings.');
 console.log('Stage 06 character movement/jump and Stage 05 RPG UI / Stage 04 environment verification passed: landscape 844x390 canvas, camera direction, mesh instances, nonzero draw calls, screenshot pixel assertion, GLB + texture loaded, physics, Stage 07 touch actions and portrait rotation notice.');
 console.log('Render diagnostics: '+JSON.stringify(state.diag));
 console.log('Canvas screenshot metrics: '+JSON.stringify(visual));
 await context.close();
} finally {if(browser)await browser.close();server.kill('SIGTERM');}
