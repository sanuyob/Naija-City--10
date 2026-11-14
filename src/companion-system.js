import * as pc from 'playcanvas';

const ROSTER = [
  {id:'tech',name:'Tech Specialist',tint:[0.84,0.94,1.0],spawn:[-24,0,-28],side:-1},
  {id:'driver',name:'Driver',tint:[1.0,0.90,0.72],spawn:[24,0,-46],side:1}
];
const COMMANDS = new Set(['Follow','Hold','Regroup','PointAhead','RadioCall','AssistUp','Dismiss']);

/**
 * Deterministic two-slot companion prototype. Actors walk in from fixed district
 * entry points; there is no teleport-to-player shortcut or combat AI.
 */
export function createCompanionSystem({app,playerController,heroCharacter,obstacles=[],maxActive=2,onStatus}={}) {
  if(!app||!playerController||typeof heroCharacter?.createInstance!=='function') {
    throw new Error('Companion system requires app, player controller and Hero 01 instance factory');
  }
  const cap=Math.max(0,Math.min(2,maxActive));
  const actors=new Map();
  let accumulator=0,commandsIssued=0,updates=0,lastMessage='';
  const message=value=>{lastMessage=value;onStatus?.(value);};

  function play(actor,clip) {
    if(!actor.root?.anim||!actor.clipNames.has(clip)) return false;
    try { actor.root.anim.baseLayer.transition(clip,0.16);actor.activeClip=clip;return true; }
    catch(error){console.warn('Companion animation transition failed:',clip,error);return false;}
  }
  function summon(roleId) {
    const roster=ROSTER.find(item=>item.id===roleId);
    if(!roster)return false;
    if(actors.has(roleId)){message(roster.name+' is already active.');return true;}
    if(actors.size>=cap){message('Maximum of two active companions reached.');return false;}
    const root=heroCharacter.createInstance('NaijaCityCompanion_'+roster.id,roster.tint);
    root.setPosition(...roster.spawn);root.setLocalScale(0.98,0.98,0.98);app.root.addChild(root);
    const actor={...roster,root,command:'Follow',state:'approaching',activeClip:'Hero01_Idle',commandTimer:0,distance:Infinity,target:roster.spawn.slice(),clipNames:new Set(heroCharacter.clipNames||[])};
    actors.set(roleId,actor);play(actor,'Hero01_Idle');
    message(roster.name+' is walking in from the district entry.');return true;
  }
  function dismiss(roleId) {
    const actor=actors.get(roleId);if(!actor)return false;
    actor.root.destroy();actors.delete(roleId);message(actor.name+' has been dismissed.');return true;
  }
  function command(roleId,action) {
    if(action==='Summon')return summon(roleId);
    const actor=actors.get(roleId);
    if(!actor){message('Summon this companion before issuing commands.');return false;}
    if(!COMMANDS.has(action))return false;
    commandsIssued++;
    if(action==='Dismiss')return dismiss(roleId);
    actor.command=action;actor.commandTimer=0;
    if(action==='Follow'){actor.state='following';play(actor,'Hero01_Idle');message(actor.name+' is following.');}
    else if(action==='Hold'){actor.state='holding';play(actor,'Hero01_Idle');message(actor.name+' will hold position.');}
    else if(action==='Regroup'){actor.state='regrouping';play(actor,'Hero01_SquadRegroup');message(actor.name+' is regrouping.');}
    else if(action==='PointAhead'){actor.state='command-action';actor.commandTimer=1.45;play(actor,'Hero01_SquadPointAhead');message(actor.name+' acknowledged: point ahead.');}
    else if(action==='RadioCall'){actor.state='command-action';actor.commandTimer=1.6;play(actor,'Hero01_SquadRadioCall');message(actor.name+' is responding over radio.');}
    else if(action==='AssistUp'){actor.state='command-action';actor.commandTimer=1.8;play(actor,'Hero01_SquadAssistUp');message(actor.name+' is ready to assist.');}
    return true;
  }
  function targetFor(actor,player) {
    const [px,,pz]=player.position,yaw=(player.facingYaw||0)*Math.PI/180;
    const side=actor.side*(actor.command==='Regroup'?1.35:2.2),back=actor.command==='Regroup'?1.9:2.9;
    return [px-Math.sin(yaw)*back+Math.cos(yaw)*side,0,pz+Math.cos(yaw)*back+Math.sin(yaw)*side];
  }
  function avoidObstacles(x,z) {
    let ax=0,az=0;
    for(const item of obstacles){
      const p=item.entity?.getPosition?.();if(!p)continue;
      const s=item.entity.getLocalScale(),dx=x-p.x,dz=z-p.z;
      const nx=dx/(Math.abs(s.x)*0.5+0.7),nz=dz/(Math.abs(s.z)*0.5+0.7),length=Math.hypot(nx,nz);
      if(length<1){const safe=length||0.001;ax+=nx/safe*(1-length)*1.25;az+=nz/safe*(1-length)*1.25;}
    }
    return [ax,az];
  }
  function update(dt) {
    accumulator+=Math.max(0,Math.min(dt,0.05));
    if(accumulator<0.10)return;
    const step=accumulator;accumulator=0;updates++;
    const player=playerController.getState();
    for(const actor of actors.values()){
      if(actor.commandTimer>0){
        actor.commandTimer=Math.max(0,actor.commandTimer-step);
        if(actor.commandTimer===0&&actor.state==='command-action'){actor.state='following';actor.command='Follow';play(actor,'Hero01_Idle');}
      }
      if(actor.state==='holding'||actor.state==='command-action')continue;
      const target=targetFor(actor,player);actor.target=target;
      const p=actor.root.getPosition(),dx=target[0]-p.x,dz=target[2]-p.z,distance=Math.hypot(dx,dz);
      actor.distance=distance;
      if(distance>110){actor.state='unavailable';play(actor,'Hero01_Idle');continue;}
      if(actor.state==='unavailable')actor.state='approaching';
      if(distance>0.85){
        const [avoidX,avoidZ]=avoidObstacles(p.x,p.z);
        const mx=dx+avoidX*1.8,mz=dz+avoidZ*1.8,length=Math.hypot(mx,mz)||1;
        const speed=distance>9?4.2:2.8,travel=Math.min(distance,speed*step);
        actor.root.setPosition(p.x+mx/length*travel,0,p.z+mz/length*travel);
        actor.root.setEulerAngles(0,Math.atan2(mx,-mz)*180/Math.PI,0);
        actor.state=distance>3?'approaching':'following';
        play(actor,distance>9&&actor.clipNames.has('Hero01_Run')?'Hero01_Run':'Hero01_Walk');
      } else {actor.state='following';play(actor,'Hero01_Idle');}
    }
  }
  function destroy(){for(const actor of actors.values())actor.root.destroy();actors.clear();}
  return {
    summon,command,update,destroy,
    getState:()=>({
      stage:'companion-prototype',maxActive:cap,activeCount:actors.size,commandsIssued,
      commands:Array.from(COMMANDS),
      roster:ROSTER.map(item=>({id:item.id,name:item.name,active:actors.has(item.id),state:actors.get(item.id)?.state||'inactive',command:actors.get(item.id)?.command||null,distance:Number.isFinite(actors.get(item.id)?.distance)?actors.get(item.id).distance:null,activeClip:actors.get(item.id)?.activeClip||null})),
      lastMessage
    })
  };
}
