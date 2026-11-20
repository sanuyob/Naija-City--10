import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4209;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;

try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error(`Vite exited with ${server.exitCode}`);
    await delay(250);
  }
  if (!ready) throw new Error('The local preview did not start.');

  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${origin}/?smoke=character-simulation`, { waitUntil: 'domcontentloaded', timeout: 25_000 });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.ready && window.__NAIJA_GAME__?.playerCharacterReady, null, { timeout: 60_000 });

  const initial = await page.evaluate(() => {
    const game = window.__NAIJA_GAME__;
    return { player: game.getPlayerState(), rig: game.getHeroRigSnapshot(), pedestrians: game.getPedestrianState(), simulation: game.getCharacterSimulationState() };
  });
  if (initial.rig.boneCount < 60 || initial.rig.skinnedMeshCount < 1 || initial.player.health !== 100 || initial.player.stamina !== 100) {
    throw new Error(`Character baseline is invalid: ${JSON.stringify({ rig: initial.rig, player: initial.player })}`);
  }

  // A* route construction and pedestrian behaviour ticks run in the real Yaba scene.
  await page.waitForFunction(() => {
    const state = window.__NAIJA_GAME__?.getPedestrianState?.();
    return state?.navigation?.queries >= 10 && state?.behaviourTicks >= 10 && state?.moved > 0;
  }, null, { timeout: 20_000 });
  const navigation = await page.evaluate(() => window.__NAIJA_GAME__.getPedestrianState());
  if (navigation.navigation.pathsFound < 8 || navigation.navigation.pathsFailed > 2 || navigation.pathRequests < 8) {
    throw new Error(`NPC route planning did not initialise cleanly: ${JSON.stringify(navigation.navigation)}`);
  }

  // The rigged pedestrian should see the player when directly placed in its view cone.
  await page.evaluate(() => window.__NAIJA_GAME__.debugSetPlayerForSmoke([-5.82, 0, -12], 0));
  await page.waitForFunction(() => (window.__NAIJA_GAME__?.getPedestrianState?.().sightings || 0) > 0, null, { timeout: 8_000 });
  const awareness = await page.evaluate(() => window.__NAIJA_GAME__.getPedestrianState());
  if (!awareness.heroNpc?.senses?.visible && !awareness.roster.some(actor => actor.senses?.visible)) {
    throw new Error(`NPC vision did not detect the player: ${JSON.stringify(awareness.heroNpc)}`);
  }

  // Interactable registry and touch interact action.
  await page.evaluate(() => window.__NAIJA_GAME__.debugSetPlayerForSmoke([-3.9, 0, -17], 0));
  const nearest = await page.evaluate(() => window.__NAIJA_GAME__.getInteractionState());
  await page.waitForFunction(() => {
    const prompt = document.querySelector('#hud-interaction-prompt');
    return prompt && !prompt.hidden && prompt.textContent.includes('STREET KIOSK');
  }, null, { timeout: 4_000 });
  if (nearest.nearest?.id !== 'yaba-street-kiosk' || !nearest.nearest.available) {
    throw new Error(`Nearby kiosk was not presented as interactable: ${JSON.stringify(nearest.nearest)}`);
  }
  await page.evaluate(() => window.__NAIJA_INTERACT__());
  const kioskInteraction = await page.evaluate(() => window.__NAIJA_GAME__.getInteractionState());
  if (kioskInteraction.interactions !== 1 || kioskInteraction.lastInteraction?.id !== 'yaba-street-kiosk') {
    throw new Error(`Kiosk interaction did not complete: ${JSON.stringify(kioskInteraction)}`);
  }
  await page.evaluate(() => window.__NAIJA_GAME__.debugSetPlayerForSmoke([6.3, 0, -37.5], 180));
  const busStop = await page.evaluate(() => window.__NAIJA_GAME__.getInteractionState());
  if (busStop.nearest?.id !== 'yaba-bus-stop' || !busStop.nearest.available) {
    throw new Error(`Bus-stop interaction was blocked or out of range: ${JSON.stringify(busStop.nearest)}`);
  }
  await page.evaluate(() => window.__NAIJA_INTERACT__());
  const interaction = await page.evaluate(() => window.__NAIJA_GAME__.getInteractionState());
  if (interaction.interactions !== 2 || interaction.lastInteraction?.id !== 'yaba-bus-stop') {
    throw new Error(`Bus-stop interaction did not complete: ${JSON.stringify(interaction)}`);
  }

  // Real 34-channel facial layer: expression and viseme smoothing.
  await page.evaluate(() => window.__NAIJA_GAME__.debugSetFaceExpressionForSmoke('happy', 1));
  await page.evaluate(() => window.__NAIJA_GAME__.debugAdvanceCharacterSimulationForSmoke(60, 1 / 60));
  const face = await page.evaluate(() => window.__NAIJA_GAME__.getCharacterSimulationState().facial);
  if (face.expression !== 'happy' || !face.activeChannels.includes('mouthSmile')) {
    throw new Error(`Facial expression did not reach its morph targets: ${JSON.stringify(face)}`);
  }
  const visemeAccepted = await page.evaluate(() => window.__NAIJA_GAME__.debugSetFaceVisemeForSmoke('aa', .8));
  await page.evaluate(() => window.__NAIJA_GAME__.debugAdvanceCharacterSimulationForSmoke(18, 1 / 60));
  const speakingFace = await page.evaluate(() => window.__NAIJA_GAME__.getCharacterSimulationState().facial);
  if (!visemeAccepted || speakingFace.viseme !== 'viseme_aa') throw new Error(`Facial viseme did not activate: ${JSON.stringify(speakingFace)}`);

  // Invulnerability, lethal/downed, and recovery loop using deterministic simulation steps.
  const nonLethal = await page.evaluate(() => window.__NAIJA_GAME__.debugApplyPlayerDamageForSmoke(35, { knockback: 0 }));
  if (!nonLethal.applied || nonLethal.health !== 65) throw new Error(`Non-lethal damage failed: ${JSON.stringify(nonLethal)}`);
  await page.evaluate(() => window.__NAIJA_GAME__.debugAdvanceCharacterSimulationForSmoke(48, 1 / 60));
  const lethal = await page.evaluate(() => window.__NAIJA_GAME__.debugApplyPlayerDamageForSmoke(100, { knockback: 0 }));
  const downed = await page.evaluate(() => window.__NAIJA_GAME__.getPlayerState());
  if (!lethal.applied || !lethal.downed || downed.health !== 0 || downed.controlEnabled !== false) {
    throw new Error(`Downed state did not lock player controls: ${JSON.stringify({ lethal, downed })}`);
  }
  const recovery = await page.evaluate(() => window.__NAIJA_GAME__.debugRecoverPlayerForSmoke({ health: 45, stamina: 20 }));
  if (!recovery.applied || recovery.health !== 45 || recovery.stamina !== 20) throw new Error(`Recovery did not restore vitals: ${JSON.stringify(recovery)}`);
  await page.evaluate(() => window.__NAIJA_GAME__.debugAdvanceCharacterSimulationForSmoke(96, 1 / 60));
  const recovered = await page.evaluate(() => window.__NAIJA_GAME__.getPlayerState());
  if (recovered.health !== 45 || recovered.stamina < 20 || recovered.stamina > 45 || recovered.state !== 'ready' || !recovered.controlEnabled) {
    throw new Error(`Recovery did not finish cleanly: ${JSON.stringify(recovered)}`);
  }

  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(JSON.stringify({
    baseline: { bones: initial.rig.boneCount, skinnedMeshes: initial.rig.skinnedMeshCount, morphs: face.supportedMorphCount, pedestrianCount: initial.pedestrians.activeCount },
    navigation: { queries: navigation.navigation.queries, pathsFound: navigation.navigation.pathsFound, pathsFailed: navigation.navigation.pathsFailed, pedestrianMoves: navigation.moved },
    perception: { sightings: awareness.sightings, heroNpc: awareness.heroNpc?.senses },
    interaction: { count: interaction.interactions, kiosk: kioskInteraction.lastInteraction?.id, busStop: interaction.lastInteraction?.id },
    facial: { expression: face.expression, activeChannels: face.activeChannels, viseme: speakingFace.viseme },
    vitals: { nonLethalHealth: nonLethal.health, downed: lethal.downed, recoveredHealth: recovered.health, recoveredStamina: recovered.stamina, finalState: recovered.state },
    browserErrors: errors
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
