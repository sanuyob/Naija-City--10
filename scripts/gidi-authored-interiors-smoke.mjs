import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port=4184, origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
const spaces=[
  {id:'fresh-cut',center:[325,.25,-1810],outside:[314.5,.06,-1810],inside:[316.5,1,-1810],floorY:.06,roof:'FC_ARCH_CEILING_ROOF_SLAB',yaw:-90,axis:'x'},
  {id:'mide-tech-hub',center:[565,.35,-1830],outside:[550.5,.165,-1830],inside:[553,1,-1830],floorY:.165,roof:'MIDE_TECH_HUB_BLOCKOUT_ROOF',yaw:-90,axis:'x'},
  {id:'grand-hotel-lobby',center:[870,.45,-2068],outside:[870,.24,-2054.5],inside:[870,1,-2057],floorY:.24,roof:'YABA_NEIGHBORHOOD_HOTEL_BLOCKOUT_ROOF',yaw:0,axis:'z'},
  {id:'grand-hotel-guestroom-01',center:[855.5,.45,-2081],outside:[855.5,.24,-2076.5],inside:[855.5,1,-2079.5],floorY:.24,roof:'YABA_NEIGHBORHOOD_HOTEL_BLOCKOUT_ROOF',yaw:0,axis:'z'},
  {id:'player-home',center:[300,1.55,-2110],outside:[300,1.23,-2100.8],inside:[300,2,-2103],floorY:1.23,roof:'PLAYER_HOME_ROOF',yaw:0,axis:'z'}
];
try{
  let ready=false;
  for(let i=0;i<70;i++){try{if((await fetch(origin)).ok){ready=true;break;}}catch{}if(server.exitCode!==null)throw new Error('Vite exited '+server.exitCode);await delay(400);}
  assert.ok(ready,'Vite preview server starts');
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:480,height:270},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
  await page.goto(origin+'?smoke=1&gidi-authored-interiors=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__NAIJA_GAME__?.ready===true,null,{timeout:120000});
  const initialGidi=await page.evaluate(()=>window.__NAIJA_GAME__.getGidiState());
  assert.equal(initialGidi.infrastructureLoaded,false,'GIDI infrastructure must stay unloaded while the player starts in Yaba');
  await page.evaluate(()=>window.__NAIJA_GAME__.debugLoadGidiForSmoke([100,0,-445]));
  await page.waitForFunction(()=>window.__NAIJA_GAME__?.getGidiState?.()?.infrastructureLoaded===true,null,{timeout:60000});
  const reports=[];
  for(const space of spaces){
    await page.evaluate(position=>window.__NAIJA_GAME__.debugLoadGidiForSmoke(position),space.center);
    await page.waitForFunction(id=>{
      const g=window.__NAIJA_GAME__;
      return g?.getGidiState?.()?.fullCells>0 && g?.getGidiAuthoredInteriorsState?.()?.activeColliderSets>0 && g?.getGidiAuthoredInteriorsState?.()?.currentInterior===id;
    },space.id,{timeout:90000});
    await page.waitForFunction(name=>window.__NAIJA_GAME__?.debugGetGidiNamedEntityForSmoke?.(name)?.matches?.length>0,space.roof,{timeout:30000});
    const inside=await page.evaluate(({space})=>{
      const g=window.__NAIJA_GAME__;
      const floor=g.getGroundProbe([space.center[0],space.floorY+3,space.center[2]],[space.center[0],space.floorY-1,space.center[2]]);
      const door=g.getGroundProbe(space.outside,space.inside);
      return {interiors:g.getGidiAuthoredInteriorsState(),streamer:g.getGidiState(),roof:g.debugGetGidiNamedEntityForSmoke(space.roof),floor,door};
    },{space});
    assert.equal(inside.interiors.currentInterior,space.id,space.id+' is detected as occupied');
    assert.ok(inside.interiors.hiddenRoofNodes.includes(space.roof),space.id+' roof override is hidden');
    assert.ok(inside.roof.matches.some(match=>match.enabled===false),space.id+' actual streamed roof node is disabled');
    assert.ok(inside.floor?.id?.includes(space.id==='grand-hotel-guestroom-01'?'grand-hotel-lobby:floor':space.id+':floor'),space.id+' floor ray hits the authored floor collider: '+JSON.stringify(inside.floor));
    assert.equal(inside.door,null,space.id+' entrance ray passes through the open doorway: '+JSON.stringify(inside.door));
    const walk=await page.evaluate(({position,yaw,axis})=>{
      const g=window.__NAIJA_GAME__;
      g.debugSetPlayerForSmoke(position,0);
      g.debugUpdateGidiInteriorsForSmoke(position);
      g.debugSetPlayerInputForSmoke(axis==='x'?1:0,axis==='z'?-1:0,false);
      const trace=g.debugAdvanceCharacterSimulationForSmoke(120,1/60);
      g.debugSetPlayerInputForSmoke(0,0,false);
      g.debugUpdateGidiInteriorsForSmoke(trace.player.position);
      return {position:trace.player.position,grounded:trace.player.grounded,interior:g.getGidiAuthoredInteriorsState()};
    },{position:space.outside,yaw:space.yaw,axis:space.axis});
    assert.equal(walk.interior.currentInterior,space.id,space.id+' is physically reached by walking through its entrance: '+JSON.stringify(walk));
    const movedAcross=space.axis==='x'?walk.position[0]>space.outside[0]+1.2:walk.position[2]<space.outside[2]-1.2;
    assert.ok(movedAcross,space.id+' player advanced through the doorway: '+JSON.stringify(walk));
    let meetingRoomWalk=null;
    let bathroomWalk=null;
    if(space.id==='mide-tech-hub'){
      meetingRoomWalk=await page.evaluate(()=>{
        const g=window.__NAIJA_GAME__;
        const doorway=g.getGroundProbe([570.9,1,-1832.2],[570.9,1,-1829.2]);
        g.debugSetPlayerForSmoke([570.9,.165,-1832.2],0);
        g.debugSetPlayerInputForSmoke(0,1,false);
        const trace=g.debugAdvanceCharacterSimulationForSmoke(120,1/60);
        g.debugSetPlayerInputForSmoke(0,0,false);
        return {doorway,position:trace.player.position,grounded:trace.player.grounded};
      });
      assert.equal(meetingRoomWalk.doorway,null,'Mide meeting-room door opening is clear');
      assert.ok(meetingRoomWalk.position[2]>-1831.2&&meetingRoomWalk.position[2]<-1825.8,'player can walk through Mide meeting-room doorway: '+JSON.stringify(meetingRoomWalk));
    }
    if(space.id==='player-home'){
      bathroomWalk=await page.evaluate(()=>{
        const g=window.__NAIJA_GAME__;
        const doorway=g.getGroundProbe([306.35,2,-2113.2],[306.35,2,-2116.2]);
        g.debugSetPlayerForSmoke([306.35,1.23,-2113.2],0);
        g.debugSetPlayerInputForSmoke(0,-1,false);
        const trace=g.debugAdvanceCharacterSimulationForSmoke(120,1/60);
        g.debugSetPlayerInputForSmoke(0,0,false);
        return {doorway,position:trace.player.position,grounded:trace.player.grounded};
      });
      assert.equal(bathroomWalk.doorway,null,'player home bathroom doorway is clear');
      assert.ok(bathroomWalk.position[2]<-2114.3&&bathroomWalk.position[2]>-2118.4,'player can walk through player-home bathroom doorway: '+JSON.stringify(bathroomWalk));
    }
    let outside=await page.evaluate(name=>window.__NAIJA_GAME__.debugGetGidiNamedEntityForSmoke(name),space.roof);
    let exitState=await page.evaluate(()=>window.__NAIJA_GAME__.getGidiAuthoredInteriorsState());
    if(space.id==='grand-hotel-guestroom-01'){
      const hotelLobby=[855.5,.24,-2076.5];
      await page.evaluate(position=>{const g=window.__NAIJA_GAME__;g.debugSetPlayerForSmoke(position,0);g.debugUpdateGidiInteriorsForSmoke(position);},hotelLobby);
      exitState=await page.evaluate(()=>window.__NAIJA_GAME__.getGidiAuthoredInteriorsState());
      outside=await page.evaluate(name=>window.__NAIJA_GAME__.debugGetGidiNamedEntityForSmoke(name),space.roof);
      assert.equal(exitState.currentInterior,'grand-hotel-lobby','leaving guest room returns to lobby, not outside the hotel');
      assert.ok(outside.matches.some(match=>match.enabled===false),'hotel roof remains hidden while still inside lobby');
      const hotelOutside=[870,.24,-2053];
      await page.evaluate(position=>{const g=window.__NAIJA_GAME__;g.debugSetPlayerForSmoke(position,0);g.debugUpdateGidiInteriorsForSmoke(position);},hotelOutside);
      outside=await page.evaluate(name=>window.__NAIJA_GAME__.debugGetGidiNamedEntityForSmoke(name),space.roof);
      exitState=await page.evaluate(()=>window.__NAIJA_GAME__.getGidiAuthoredInteriorsState());
    }else{
      await page.evaluate(position=>{const g=window.__NAIJA_GAME__;g.debugSetPlayerForSmoke(position,0);g.debugUpdateGidiInteriorsForSmoke(position);},space.outside);
      outside=await page.evaluate(name=>window.__NAIJA_GAME__.debugGetGidiNamedEntityForSmoke(name),space.roof);
      exitState=await page.evaluate(()=>window.__NAIJA_GAME__.getGidiAuthoredInteriorsState());
    }
    assert.ok(outside.matches.some(match=>match.enabled===true),space.id+' roof becomes visible after leaving the full building');
    reports.push({id:space.id,loadedCells:inside.streamer.loadedCells,activeColliderSets:inside.interiors.activeColliderSets,activeColliderCount:inside.interiors.activeColliderCount,roofNode:space.roof,roofHidden:inside.roof.matches.some(match=>!match.enabled),floorCollider:inside.floor.id,doorwayClear:inside.door===null,walkedThroughEntrance:true,walkedPosition:walk.position,meetingRoomWalk,bathroomWalk,roofRestoredOutside:outside.matches.some(match=>match.enabled),exitInterior:exitState.currentInterior});
  }
  assert.deepEqual(errors,[],'browser errors: '+errors.join('; '));
  console.log(JSON.stringify({pass:true,spaces:reports,browserErrors:errors},null,2));
}catch(error){
  console.error(error.stack||error);
  if(browser)for(const context of browser.contexts())for(const page of context.pages())try{console.error('DEBUG',JSON.stringify(await page.evaluate(()=>({gidi:window.__NAIJA_GAME__?.getGidiState?.(),interiors:window.__NAIJA_GAME__?.getGidiAuthoredInteriorsState?.(),player:window.__NAIJA_GAME__?.getPlayerState?.(),status:document.querySelector('#status')?.textContent}))));}catch{}
  process.exitCode=1;
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
