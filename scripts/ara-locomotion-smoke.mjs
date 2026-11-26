import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { getAraGaitStance } from '../src/ara-gait-contact.js';

const port = 4191;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;

function measureSoleSlide(trace, side, mode, startAt = 5) {
  let previous = null;
  let maxStep = 0;
  let totalStep = 0;
  let pairs = 0;
  let contacts = 0;
  let maxSpeed = 0;
  let totalSpeed = 0;
  let signedSlideTotal = 0;
  let signedSlideCount = 0;
  let worstPair = null;
  const contactSpeeds = [];
  const gaitClip=mode==='walk'?'Walk':'Run';
  // Walk markers are calibrated within 1 cm of the ground; the faster run clip
  // has up to 2.5 cm vertical marker offset. Horizontal planted-step limit stays 1 cm.
  const contactTolerance=mode==='walk'?.010:.025;
  for (const sample of trace.slice(startAt)) {
    const progress = Number(sample.activeStateProgress);
    if (!Number.isFinite(progress)) { previous = null; continue; }
    const stance=getAraGaitStance(gaitClip,progress);
    // The controller applies one pelvis translation per frame and chooses
    // the load-bearing support shoe. Measure only that actively corrected
    // shoe; the other stance foot is released for its swing transition.
    if (!stance[side]||sample.footLock?.supportSide!==side) { previous = null; continue; }
    const y = sample.groundY;
    const candidates=[
      {kind:'toe',point:sample.limbs?.[`${side}SoleToe`]},
      {kind:'heel',point:sample.limbs?.[`${side}SoleHeel`]}
    ].filter(item=>item.point?.every(Number.isFinite)&&Number.isFinite(y)&&Math.abs(item.point[1]-y)<=contactTolerance);
    candidates.sort((a,b)=>Math.abs(a.point[1]-y)-Math.abs(b.point[1]-y));
    const contact=candidates[0];
    if (!contact) { previous=null; continue; }
    const point=contact.point;
    contacts++;
    if (previous && (sample.time - previous.time > 0.034 || Math.floor(progress)!==Math.floor(previous.progress))) previous = null;
    if (previous && previous.kind === contact.kind) {
      const verticalDrift = Math.abs(point[1] - previous.point[1]);
      const dt = Math.max(1e-5, sample.time - previous.time);
      const rootDeltaX = sample.position[0] - previous.root[0];
      const rootDeltaZ = sample.position[2] - previous.root[2];
      const rootDistance = Math.hypot(rootDeltaX, rootDeltaZ);
      let opposingSpeed = 0;
      if (rootDistance > 1e-5 && verticalDrift < 0.006) {
        const moveX = rootDeltaX / rootDistance;
        const moveZ = rootDeltaZ / rootDistance;
        const localX = (point[0] - previous.point[0] - rootDeltaX) / dt;
        const localZ = (point[2] - previous.point[2] - rootDeltaZ) / dt;
        opposingSpeed = -(localX * moveX + localZ * moveZ);
        if (opposingSpeed > 0.05) {
          const previousRate = previous.rate || sample.locomotionPlaybackRates?.[mode] || 1;
          const currentRate = sample.locomotionPlaybackRates?.[mode] || previousRate;
          contactSpeeds.push(opposingSpeed / Math.max(0.01, (previousRate + currentRate) * 0.5));
        }
      }
      if (verticalDrift < 0.006 && opposingSpeed > 0.35) {
        const distance = Math.hypot(point[0] - previous.point[0], point[2] - previous.point[2]);
        const speed = distance / dt;
        const moveX = rootDeltaX / Math.max(1e-5, rootDistance);
        const moveZ = rootDeltaZ / Math.max(1e-5, rootDistance);
        const signedSlide = ((point[0] - previous.point[0]) * moveX +
          (point[2] - previous.point[2]) * moveZ) / dt;
        signedSlideTotal += signedSlide;
        signedSlideCount++;
        if (distance > maxStep) worstPair={distance:Number(distance.toFixed(4)),dt:Number(dt.toFixed(4)),previousTime:previous.time,time:sample.time,previousProgress:previous.progress,progress:sample.activeStateProgress,previousClipTime:previous.clipTime,clipTime:sample.activeStateCurrentTime,clipDuration:sample.activeStateDuration,kind:contact.kind,previousFootLock:previous.footLock,footLock:sample.footLock,footLockState:sample.footLockState,previousFacingYaw:previous.facingYaw,facingYaw:sample.facingYaw,previousPoint:previous.point,point,otherToe:sample.limbs?.[`${side}SoleToe`],otherHeel:sample.limbs?.[`${side}SoleHeel`],groundY:sample.groundY,rootDelta:[rootDeltaX,rootDeltaZ],verticalDrift,opposingSpeed:Number(opposingSpeed.toFixed(3))};
        maxStep = Math.max(maxStep, distance);
        maxSpeed = Math.max(maxSpeed, speed);
        totalStep += distance;
        totalSpeed += speed;
        pairs++;
      } else {
        previous = null;
      }
    }
    if (contact) previous = {kind:contact.kind,point,time:sample.time,root:sample.position,facingYaw:sample.facingYaw,footLock:sample.footLock,footLockState:sample.footLockState,
      rate:sample.locomotionPlaybackRates?.[mode]||1,progress:sample.activeStateProgress,clipTime:sample.activeStateCurrentTime};
  }
  const sortedSpeeds=contactSpeeds.slice().sort((a,b)=>a-b);
  return {
    contacts, pairs,
    maxStepM:Number(maxStep.toFixed(4)), meanStepM:Number((pairs?totalStep/pairs:0).toFixed(4)),
    maxSlideSpeedMps:Number(maxSpeed.toFixed(3)), meanSlideSpeedMps:Number((pairs?totalSpeed/pairs:0).toFixed(3)),
    meanSignedSlideMps:Number((signedSlideCount?signedSlideTotal/signedSlideCount:0).toFixed(3)),
    contactSpeedMeanMps:Number((contactSpeeds.length?contactSpeeds.reduce((a,b)=>a+b,0)/contactSpeeds.length:0).toFixed(3)),
    measuredContactSpeedMps:Number((sortedSpeeds.length?sortedSpeeds[Math.floor(sortedSpeeds.length/2)]:0).toFixed(3)),
    contactSpeedSamples:contactSpeeds.length, worstPair
  };
}
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error(`Vite exited with ${server.exitCode}`);
    await delay(300);
  }
  if (!ready) throw new Error('Vite preview did not start');

  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${origin}?smoke=ara-locomotion`, { waitUntil: 'networkidle' });
  try {
    await page.waitForFunction(() => window.__NAIJA_GAME__?.ready && window.__NAIJA_GAME__?.playerCharacterReady, null, { timeout: 120000 });
  } catch (error) {
    const startup = await page.evaluate(() => ({
      gameApiPresent: Boolean(window.__NAIJA_GAME__),
      gameReady: Boolean(window.__NAIJA_GAME__?.ready),
      playerCharacterReady: Boolean(window.__NAIJA_GAME__?.playerCharacterReady),
      characterLoadError: window.__NAIJA_GAME__?.characterLoadError || null,
      status: document.querySelector('#status')?.textContent || null,
      assetStatus: document.querySelector('#asset-status')?.textContent || null,
      characterGate: document.querySelector('#rpg-interface')?.classList.contains('character-required') || false
    }));
    throw new Error('Naija City did not reach player-ready state: ' + JSON.stringify({ startup, browserErrors: errors, cause: error.message }));
  }
  const patrolState = await page.evaluate(() => window.__NAIJA_GAME__?.getPolicePatrolState?.());
  if (patrolState?.state !== 'active' || !patrolState.officerLoaded || !patrolState.carLoaded ||
      patrolState.assetMode !== 'offline-procedural' || patrolState.externalRequests !== 0) {
    throw new Error('Local police patrol must initialise without third-party model requests: ' + JSON.stringify(patrolState));
  }

  async function sampleGait(mode) {
    await page.evaluate(() => window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0, 0, 0], 0));
    await page.keyboard.down('w');
    if (mode === 'run') await page.keyboard.down('Shift');
    let result;
    try {
      result = await page.evaluate(() => window.__NAIJA_GAME__.debugAdvanceLocomotionForSmoke(360, 1 / 60));
    } finally {
      await page.keyboard.up('w');
      if (mode === 'run') await page.keyboard.up('Shift');
    }
    const trace = result.trace || [];
    const expected = mode === 'run' ? 'Run' : 'Walk';
    const targetSpeed = mode === 'run' ? 7.2 : 1.55;
    const stable = trace.filter(sample => sample.clip === expected && sample.moving && sample.grounded &&
      sample.horizontalSpeed >= targetSpeed * 0.88);
    if (stable.length < 80) throw new Error(`${mode} did not hold a stable grounded locomotion state: ${JSON.stringify({ stable: stable.length, last: result.player })}`);
    const playback = stable.at(-1)?.locomotionPlaybackRates?.[mode] || 1;
    const left = measureSoleSlide(stable, 'left', mode);
    const right = measureSoleSlide(stable, 'right', mode);
    const speeds = stable.map(sample => sample.horizontalSpeed).filter(Number.isFinite);
    const evaluator = await page.evaluate(() => window.__NAIJA_GAME__.getHeroAnimationState?.().evaluatorClips || []);
    return {
      mode,
      expectedClip: expected,
      actualClip: stable.at(-1)?.clip,
      activeState: stable.at(-1)?.activeState,
      activeStateDuration: stable.at(-1)?.activeStateDuration,
      activeStateCurrentTime: stable.at(-1)?.activeStateCurrentTime,
      sampleCount: stable.length,
      horizontalSpeedMps: Number((speeds.reduce((a, b) => a + b, 0) / Math.max(1, speeds.length)).toFixed(3)),
      playbackRate: Number((playback || 0).toFixed(3)),
      leftSole: left,
      rightSole: right,
      evaluator: evaluator.filter(clip => clip.playing)
    };
  }

  const walk = await sampleGait('walk');
  const run = await sampleGait('run');
  for (const report of [walk, run]) {
    if (report.activeState !== report.expectedClip || report.leftSole.contacts < 10 || report.rightSole.contacts < 10 || report.leftSole.pairs < 4 || report.rightSole.pairs < 4 || report.leftSole.pairs + report.rightSole.pairs < 10) {
      throw new Error(`${report.mode} failed to produce measurable sole contact: ${JSON.stringify(report)}`);
    }
    const maxAllowedStep = report.mode === 'walk' ? 0.010 : 0.010;
    if (Math.max(report.leftSole.maxStepM, report.rightSole.maxStepM) > maxAllowedStep) throw new Error(`${report.mode} planted-sole slide exceeded ${maxAllowedStep}m: ${JSON.stringify({left:report.leftSole,right:report.rightSole})}`);
    const maxSlideSpeed=report.mode==='walk'?.60:.60;
    if(Math.max(report.leftSole.maxSlideSpeedMps,report.rightSole.maxSlideSpeedMps)>maxSlideSpeed)throw new Error(`${report.mode} stance speed error exceeded ${maxSlideSpeed}m/s: ${JSON.stringify({left:report.leftSole,right:report.rightSole})}`);
  }
  if (errors.length) throw new Error(`Browser runtime errors: ${errors.join(' | ')}`);
  const rigInfo=await page.evaluate(()=>({metadata:window.__NAIJA_GAME__?.characterMetadata,markers:window.__NAIJA_GAME__?.getHeroSoleMarkerInfo?.(),animation:window.__NAIJA_GAME__?.getHeroAnimationState?.(),footLock:window.__NAIJA_GAME__?.getHeroFootLockState?.()}));
  console.log(JSON.stringify({ pass: true, walk, run, rigInfo, browserErrors: errors }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
