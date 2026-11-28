import './rpg-ui.css';
import { mountWorldMapUI } from './world-map-ui.js';

const views = {
  inventory: ['FIELD KIT', 'Inventory', '<div class="tiles"><article><b>01</b><strong>Supplies</strong><small>No items collected</small></article><article><b>02</b><strong>Key items</strong><small>No key items yet</small></article><article><b>03</b><strong>Resources</strong><small>0 collected</small></article><article><b>04</b><strong>Quick slots</strong><small>Tap a slot to select it</small></article></div>'],
  quests: ['JOURNAL', 'Missions', '<div class="mission"><small>MAIN STORY</small><b>A CITY WAKES</b><p>Explore the neighbourhood and learn your way around the city.</p><em>OBJECTIVE · Reach the marked location</em></div><div class="mission"><small>SIDE ACTIVITY</small><b>LOCAL CONNECTIONS</b><p>Meet people and discover places of interest.</p><em>AVAILABLE LATER</em></div>'],
  map: ['CITY NAVIGATION', 'District map', '<div class="map-large"><i></i><b>YOU</b><strong>◆</strong></div><p class="muted" id="map-active-district">YABA DISTRICT · MAP DATA PROTOTYPE</p>'],
  character: ['PLAYER PROFILE', 'Player', '<div class="profile"><b>AF</b><div><strong>ARA 3D FEMALE</strong><p>Main playable character</p><small>THE_FEMALE_EXECUTIVE · ARA 3D GEN</small></div></div><div class="mission character-import-card"><small>ONLY PLAYABLE CHARACTER</small><b>ARA 3D FEMALE · MAIN PLAYER</b><p>Ara is the only playable character. Hero 01 is a city NPC. The ready-made Female Executive character is bundled from Ara 3D Gen with a game rig and locomotion/parkour animations.</p><p id="player-character-status" role="status">Ara 3D Gen Female Executive · loading built-in character asset…</p></div><div class="stat">Player role <b>MAIN</b></div><div class="stat">Character slot <b>01</b></div>'],
  settings: ['SYSTEM', 'Settings', '<div class="setting">Data Saver <button data-setting="data-saver" aria-pressed="false">OFF</button></div><p class="muted">Loads nearby buildings first, slows background downloads and skips optional character downloads. Applies the next time you launch the game.</p><div class="setting">HUD visibility <button data-setting="hud" aria-pressed="true">ON</button></div><div class="setting">Reduced motion <button data-setting="motion" aria-pressed="false">OFF</button></div><div class="setting">Large touch controls <button data-setting="touch" aria-pressed="true">ON</button></div><div class="setting">Vehicle controls <button data-setting="vehicle-controls" data-mode="two-handed" aria-pressed="true">TWO-HANDED</button></div><p class="muted">Two-Handed uses left/right steering and separate accelerator/brake buttons. One-Handed uses the movement stick for steering and forward/reverse.</p>'],
  crew: ['CITY CREW', 'Companions', '<div class="mission"><small>ACTIVE ROSTER · MAXIMUM TWO</small><b>TECH SPECIALIST</b><p>Arrives from a district entry point. Follows, holds position and responds to field commands.</p><div class="tiles"><button data-companion-command="Summon" data-companion-id="tech">SUMMON</button><button data-companion-command="Follow" data-companion-id="tech">FOLLOW</button><button data-companion-command="Hold" data-companion-id="tech">HOLD</button><button data-companion-command="Dismiss" data-companion-id="tech">DISMISS</button></div></div><div class="mission"><small>TRANSPORT SUPPORT</small><b>DRIVER</b><p>Second companion slot. Walks in from a separate entry point; no instant teleport.</p><div class="tiles"><button data-companion-command="Summon" data-companion-id="driver">SUMMON</button><button data-companion-command="Regroup" data-companion-id="driver">REGROUP</button><button data-companion-command="RadioCall" data-companion-id="driver">RADIO</button><button data-companion-command="Dismiss" data-companion-id="driver">DISMISS</button></div></div><div class="tiles"><button data-companion-command="PointAhead" data-companion-id="tech">POINT AHEAD</button><button data-companion-command="AssistUp" data-companion-id="tech">ASSIST UP</button></div>']
};

export function mountRPGInterface() {
  const root = document.getElementById('rpg-interface');
  if (!root) throw new Error('Missing RPG interface root');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  const networkSuggestsDataSaver = Boolean(connection?.saveData) || /^(slow-2g|2g)$/i.test(connection?.effectiveType || '') || (Number(connection?.downlink) > 0 && Number(connection.downlink) < 1.2);
  let savedDataSaverPreference = null;
  try {
    const stored = localStorage.getItem('naijaCityDataSaver');
    if (stored === 'true' || stored === 'false') savedDataSaverPreference = stored === 'true';
  } catch {}
  let dataSaverEnabled = savedDataSaverPreference ?? networkSuggestsDataSaver;
  window.__NAIJA_DATA_SAVER__ = { enabled: dataSaverEnabled, explicit: savedDataSaverPreference !== null };
  root.innerHTML = `
    <section class="city-loading" id="city-loading" role="status" aria-live="polite">
      <div class="loading-mark">N</div>
      <small>OPEN WORLD · LAGOS, NIGERIA</small>
      <h1>NAIJA CITY</h1>
      <p id="city-loading-label">Preparing your city…</p>
      <div class="loading-track"><i id="city-loading-fill"></i></div>
      <span id="city-loading-count">Loading environment assets</span>
    </section>
    <header class="topbar">
      <div class="brand"><span class="mark">N</span><div><b>NAIJA CITY</b><small data-genre="open-world FPS/RPG">OPEN-WORLD FPS / RPG</small></div></div>
      <div class="district"><small>CURRENT DISTRICT</small><b id="current-district-label">YABA · LAGOS</b></div>
      <button class="menu" data-open="pause" aria-label="Pause game">Ⅱ<small>PAUSE</small></button>
    </header>
    <section class="status" aria-label="Player status">
      <div class="player-status"><b>LVL 01</b><span>ARA FEMALE · MAIN PLAYER</span><small>100 XP TO NEXT LEVEL</small></div>
      <div class="wallet-row"><span>WALLET</span><b id="hud-wallet-value">₦5,000</b><small id="hud-inventory-count">BAG · 0</small></div>
      <label>HEALTH <b id="hud-health-value">100</b><i class="meter"><i id="hud-health-fill" style="width:100%"></i></i></label>
      <label>STAMINA <b id="hud-stamina-value">100</b><i class="meter stamina"><i id="hud-stamina-fill" style="width:100%"></i></i></label>
      <small class="player-state" id="hud-player-state">STATUS · READY</small><small class="interaction-prompt" id="hud-interaction-prompt" hidden></small>
    </section>
    <section class="minimap" aria-label="Minimap">
      <div>LOCAL AREA <b id="local-area-label">YABA</b></div>
      <div class="mini-map"><i></i><span></span><strong>◆</strong></div>
      <small class="compass">N　·　NE　·　E　·　SE</small><small class="gps-readout" id="hud-gps-label">NO GPS DESTINATION</small>
    </section>
    <button id="camera-view-toggle" class="camera-view-toggle" type="button" data-mode="third-person" aria-pressed="false" aria-label="Switch to first-person view">VIEW · 3P</button><div class="tools"><button id="assets-toggle" aria-expanded="false" aria-controls="assets-panel">ASSETS</button><button id="perf-toggle" aria-expanded="false" aria-controls="perf-panel">PERF</button></div>
    <div class="fps-reticle" aria-hidden="true"><i></i></div>
    <div class="touch" aria-label="Mobile game controls">
      <div class="stick" id="move-joystick" role="application" aria-label="Movement joystick"><i id="move-knob"></i><small>MOVE</small></div>
      <div class="actions">
        <button id="jump-button" aria-label="Jump or climb">↑<small>JUMP</small></button>
        <button id="sprint-button" aria-label="Toggle sprint" aria-pressed="false">»<small>SPRINT</small></button>
        <button id="crouch-button" aria-label="Toggle crouch" aria-pressed="false">↓<small>CROUCH</small></button>
        <button id="interact-button" aria-label="Interact">◎<small>INTERACT</small></button>
        <button id="spar-button" aria-label="Friendly sparring">✦<small>SPAR</small></button>
      </div>
    </div>
    <section class="drone-controls" id="drone-controls" aria-label="Scout drone controls" hidden>
      <div class="drone-readout"><small>REMOTE SCOUT LINK</small><b>DRONE CAMERA</b><span id="drone-battery-label">BATTERY · 100%</span><i class="drone-battery-track"><i id="drone-battery-fill"></i></i><span id="drone-altitude-label">ALTITUDE · 3.2 M</span></div>
      <div class="drone-joystick" id="drone-joystick" role="application" aria-label="Drone flight joystick"><i id="drone-knob"></i><small>FLIGHT</small></div>
      <div class="drone-actions" aria-label="Drone flight and camera controls">
        <button type="button" data-drone-action="ascend">↑<small>UP</small></button>
        <button type="button" data-drone-action="descend">↓<small>DOWN</small></button>
        <button type="button" data-drone-action="turn-left">↶<small>YAW L</small></button>
        <button type="button" data-drone-action="turn-right">↷<small>YAW R</small></button>
        <button type="button" data-drone-action="scan">⌕<small>SCAN</small></button>
        <button type="button" data-drone-action="recall">⌂<small>RECALL</small></button>
      </div>
    </section>
    <section class="cctv-controls" id="cctv-controls" aria-label="Remote CCTV controls" hidden>
      <div class="cctv-readout"><small>NAIJA CITY · REMOTE SURVEILLANCE</small><b id="cctv-camera-name">CCTV CAMERA</b><span id="cctv-camera-meta">LIVE · NETWORK LINK</span><i class="cctv-signal-track"><i id="cctv-signal-fill"></i></i><span id="cctv-camera-signal">SIGNAL · 92%</span></div>
      <div class="cctv-left-controls">
        <button type="button" data-cctv-action="previous">◀<small>PREV CAM</small></button>
        <button type="button" data-cctv-action="scan">⌕<small>SCAN AREA</small></button>
        <button type="button" data-cctv-action="next">▶<small>NEXT CAM</small></button>
        <button type="button" data-cctv-action="close">×<small>EXIT FEED</small></button>
      </div>
      <div class="cctv-ptz-controls" aria-label="Pan, tilt and zoom controls">
        <button type="button" data-cctv-hold="pan-left">←<small>PAN L</small></button>
        <button type="button" data-cctv-hold="tilt-up">↑<small>TILT UP</small></button>
        <button type="button" data-cctv-hold="tilt-down">↓<small>TILT DN</small></button>
        <button type="button" data-cctv-hold="pan-right">→<small>PAN R</small></button>
        <button type="button" data-cctv-zoom="out">−<small>ZOOM</small></button>
        <button type="button" data-cctv-zoom="in">+<small>ZOOM</small></button>
      </div>
    </section>
    <section class="vehicle-controls" id="vehicle-controls" aria-label="Vehicle driving controls" hidden>
      <div class="vehicle-readout" id="vehicle-status">
        <b id="vehicle-speed">0 km/h</b>
        <span id="vehicle-temp">ENGINE 77°C</span>
        <span id="vehicle-fuel">FUEL 100%</span>
      </div>
      <button id="drive-exit" type="button" aria-label="Exit vehicle">EXIT</button>
      <div class="drive-steering" aria-label="Steering">
        <button id="drive-left" type="button" aria-label="Steer left">←<small>LEFT</small></button>
        <button id="drive-right" type="button" aria-label="Steer right">→<small>RIGHT</small></button>
      </div>
      <div class="drive-pedals" aria-label="Accelerator and brake">
        <button id="drive-accelerate" type="button" aria-label="Accelerate">↑<small>ACCELERATE</small></button>
        <button id="drive-brake" type="button" aria-label="Brake or reverse">↓<small>BRAKE / REVERSE</small></button>
      </div>
    </section>
    <div class="quick-slots" aria-label="Quick access slots">
      <button data-slot="1" aria-label="Quick slot 1"><b>1</b><small>EMPTY</small></button>
      <button data-slot="2" aria-label="Quick slot 2"><b>2</b><small>EMPTY</small></button>
      <button data-slot="3" aria-label="Quick slot 3"><b>3</b><small>EMPTY</small></button>
      <button data-slot="4" aria-label="Quick slot 4"><b>4</b><small>EMPTY</small></button>
    </div>
    <nav class="nav" aria-label="Game menus">
      <button data-open="inventory">▦<small>INVENTORY</small></button>
      <button data-open="quests">≡<small>MISSIONS</small></button>
      <button data-open="map">⌖<small>MAP</small></button>
      <button data-open="character">♙<small>PLAYER</small></button>
    </nav>
    <div class="hud-toast" id="hud-toast" role="status" aria-live="polite"></div>
    <section class="panel" id="rpg-panel" hidden><header><div><small id="panel-kicker"></small><h2 id="panel-title"></h2></div><button data-close aria-label="Close panel">×</button></header><div id="panel-content"></div><footer>NAIJA CITY <span>STAGE 07 · LANDSCAPE HUD</span></footer></section>
    <section class="pause" id="rpg-pause" hidden><div class="pause-card"><div class="brand"><span class="mark">N</span><div><b>NAIJA CITY</b><small>PAUSED</small></div></div><h2>Take a moment.</h2><p>Your city is waiting.</p><button class="resume" data-resume>RESUME GAME　→</button><div class="pause-links" aria-label="Game menus"><button data-open="inventory">INVENTORY</button><button data-open="quests">MISSIONS</button><button data-open="map">CITY MAP</button><button data-open="character">PLAYER</button><button data-open="crew">CREW</button></div><button data-open="settings">SETTINGS</button><small>NAIJA CITY · PAUSED</small></div></section>
  `;

  let paused = false;
  let characterRequired = false;
  let vehicleControlsMode = 'two-handed';
  let activeDistrict = 'YABA';
  let activeRegion = 'LAGOS';
  let economyState = { cash:5000, inventory:{} };
  const worldMapUI = mountWorldMapUI(root);
  window.__NAIJA_RPG_PAUSED__ = false;
  const panel = root.querySelector('#rpg-panel');
  const pause = root.querySelector('#rpg-pause');
  const toast = root.querySelector('#hud-toast');
  const loadingScreen = root.querySelector('#city-loading');
  const updateLoading = progress => {
    const percent=Math.max(0,Math.min(100,Number(progress?.percent)||0));
    root.querySelector('#city-loading-fill').style.width=percent+'%';
    root.querySelector('#city-loading-label').textContent=progress?.label||'Preparing streets, buildings and characters…';
    const total=Number(progress?.total)||0,completed=Number(progress?.completed)||0;
    const loadedMiB=Number(progress?.bytes)>0?(Number(progress.bytes)/1048576).toFixed(1)+' MiB':'';
    root.querySelector('#city-loading-count').textContent=total
      ? completed+' / '+total+' NEARBY BUILDINGS READY'+(loadedMiB?' · '+loadedMiB:'')
      : 'Loading essential game assets';
  };
  const finishLoading = () => {
    if(!loadingScreen)return;
    loadingScreen.classList.add('complete');
    root.querySelector('#city-loading-label').textContent='Your starting area is ready';
    root.querySelector('#city-loading-count').textContent='ENTER YABA · THE REST STREAMS AS YOU EXPLORE';
    loadingScreen.hidden=true;
  };
  const open = name => {
    if (characterRequired && name !== 'character') name = 'character';
    if (name === 'map') { paused=true; window.__NAIJA_RPG_PAUSED__=true; panel.hidden=true; pause.hidden=true; worldMapUI.open(); return; }
    worldMapUI.close();
    if (name === 'pause') {
      paused = true;
      window.__NAIJA_RPG_PAUSED__ = true;
      pause.hidden = false;
      panel.hidden = true;
      return;
    }
    const view = views[name];
    if (!view) return;
    root.querySelector('#panel-kicker').textContent = view[0];
    root.querySelector('#panel-title').textContent = view[1];
    root.querySelector('#panel-content').innerHTML = name === 'inventory' ? renderInventory() : view[2];
    if (name === 'settings') {
      const dataSaverButton = root.querySelector('[data-setting=\"data-saver\"]');
      if (dataSaverButton) { dataSaverButton.setAttribute('aria-pressed', String(dataSaverEnabled)); dataSaverButton.textContent = dataSaverEnabled ? 'ON' : 'OFF'; }
    }
    panel.hidden = false;
    pause.hidden = true;
  };
  const requirePlayerCharacter = message => {
    characterRequired = true;
    root.classList.add('character-required');
    root.querySelectorAll('#jump-button,#sprint-button,#crouch-button,#interact-button').forEach(button => { button.disabled = true; });
    root.querySelector('#move-joystick')?.setAttribute('aria-disabled', 'true');
    open('character');
    const status = root.querySelector('#player-character-status');
    if (status) status.textContent = message || 'Import The_Female_Executive.fbx to enable gameplay.';
    return true;
  };
  const setPlayerCharacterReady = () => {
    characterRequired = false;
    root.classList.remove('character-required');
    root.querySelectorAll('#jump-button,#sprint-button,#crouch-button,#interact-button').forEach(button => { button.disabled = false; });
    root.querySelector('#move-joystick')?.removeAttribute('aria-disabled');
    return true;
  };
  const close = () => {
    if (characterRequired) { open('character'); showToast('Install Ara 3D Female before starting gameplay.'); return; }
    paused = false;
    window.__NAIJA_RPG_PAUSED__ = false;
    panel.hidden = true;
    pause.hidden = true;
  };
  root.addEventListener('click', async event => {
    const cctvAction = event.target.closest('[data-cctv-action]');
    if (cctvAction) {
      const action = cctvAction.dataset.cctvAction;
      const system = window.__NAIJA_SURVEILLANCE__;
      if (action === 'previous') system?.cycleCamera?.(-1);
      else if (action === 'next') system?.cycleCamera?.(1);
      else if (action === 'scan') system?.scanActiveCamera?.();
      else if (action === 'close') system?.closeFeed?.();
      return;
    }
    const zoomControl = event.target.closest('[data-cctv-zoom]');
    if (zoomControl) {
      window.__NAIJA_SURVEILLANCE__?.setZoom?.(zoomControl.dataset.cctvZoom === 'in' ? 1 : -1);
      return;
    }
    const droneAction = event.target.closest('[data-drone-action]');
    if (droneAction) {
      const action = droneAction.dataset.droneAction;
      const equipment = window.__NAIJA_FIELD_EQUIPMENT__;
      if (action === 'recall') {
        equipment?.recallScoutDrone?.();
        setDroneState(equipment?.getDroneState?.());
      } else if (action === 'scan') {
        window.__NAIJA_SURVEILLANCE__?.scanFromDrone?.(equipment?.getDroneState?.());
      }
      return;
    }
    const viewToggle = event.target.closest('#camera-view-toggle');
    if (viewToggle) {
      const nextMode = viewToggle.dataset.mode === 'first-person' ? 'third-person' : 'first-person';
      const accepted = window.__NAIJA_SET_CAMERA_MODE__?.(nextMode);
      if (!accepted) showToast('Camera view is not available yet.');
      return;
    }
    const companionButton = event.target.closest('[data-companion-command]');
    if (companionButton) {
      const command = companionButton.dataset.companionCommand;
      const roleId = companionButton.dataset.companionId;
      const accepted = window.__NAIJA_COMPANION_COMMAND__?.(roleId, command);
      showToast(accepted ? (command + ' · ' + roleId) : 'Companion command not available.');
      return;
    }
    if (event.target.closest('[data-map-close]')) { worldMapUI.close(); paused=false; return; }
    if (event.target.closest('.minimap')) { paused=true; window.__NAIJA_RPG_PAUSED__=true; worldMapUI.open(); return; }
    const target = event.target.closest('[data-open]');
    if (target) { open(target.dataset.open); return; }
    if (event.target.closest('[data-close]') || event.target.closest('[data-resume]')) { close(); return; }
    if (event.target.closest('#interact-button')) {
      showToast('Checking nearby…');
      window.__NAIJA_INTERACT__?.();
      return;
    }
    if (event.target.closest('#spar-button')) {
      const result = window.__NAIJA_NPC_SPAR__?.();
      if (!result?.ok) showToast(result?.reason === 'cooldown' ? 'Sparring cooldown · wait a moment' : 'Move closer to a district NPC to spar');
      return;
    }
    const setting = event.target.closest('[data-setting]');
    if (setting) {
      if(setting.dataset.setting==='vehicle-controls'){
        setVehicleControlsMode(vehicleControlsMode==='two-handed'?'one-handed':'two-handed');
        return;
      }
      const enabled = setting.getAttribute('aria-pressed') !== 'true';
      setting.setAttribute('aria-pressed', String(enabled));
      setting.textContent = enabled ? 'ON' : 'OFF';
      if (setting.dataset.setting === 'hud') root.classList.toggle('hud-hidden', !enabled);
      if (setting.dataset.setting === 'motion') root.classList.toggle('reduced-motion', enabled);
      if (setting.dataset.setting === 'touch') root.classList.toggle('large-touch', enabled);
      return;
    }
    const gearAction = event.target.closest('[data-gear-action]');
    if (gearAction) {
      const system = window.__NAIJA_FIELD_EQUIPMENT__;
      const action = gearAction.dataset.gearAction;
      const itemId = gearAction.dataset.gearId;
      const result = system?.[action]?.(itemId);
      refreshEquipmentUI();
      setDroneState(system?.getDroneState?.());
      return;
    }
    const slot = event.target.closest('[data-slot]');
    if (slot) {
      const result = window.__NAIJA_FIELD_EQUIPMENT__?.equipSlot?.(slot.dataset.slot);
      refreshEquipmentUI();
      return;
    }
  });
  const droneStick = root.querySelector('#drone-joystick');
  const droneKnob = root.querySelector('#drone-knob');
  let droneStickPointer = null;
  let droneVerticalPointer = null;
  let droneYawPointer = null;
  let cctvHoldPointer = null;
  const readDroneStick = event => {
    if (!droneStick) return;
    const rect = droneStick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.36);
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, radius / length);
    const x = dx / radius * scale;
    const y = -dy / radius * scale;
    if (droneKnob) droneKnob.style.transform = 'translate(' + (dx * scale) + 'px,' + (dy * scale) + 'px)';
    window.__NAIJA_FIELD_EQUIPMENT__?.setDroneInput?.(x, y);
  };
  const resetDroneStick = () => {
    droneStickPointer = null;
    if (droneKnob) droneKnob.style.transform = 'translate(0,0)';
    window.__NAIJA_FIELD_EQUIPMENT__?.setDroneInput?.(0, 0);
  };
  droneStick?.addEventListener('pointerdown', event => {
    event.preventDefault();
    droneStickPointer = event.pointerId;
    droneStick.setPointerCapture?.(event.pointerId);
    readDroneStick(event);
  });
  droneStick?.addEventListener('pointermove', event => {
    if (event.pointerId === droneStickPointer) { event.preventDefault(); readDroneStick(event); }
  });
  droneStick?.addEventListener('pointerup', event => { if (event.pointerId === droneStickPointer) resetDroneStick(); });
  droneStick?.addEventListener('pointercancel', resetDroneStick);
  droneStick?.addEventListener('lostpointercapture', resetDroneStick);
  root.addEventListener('pointerdown', event => {
    const droneAction = event.target.closest('[data-drone-action]')?.dataset.droneAction;
    if (droneAction === 'ascend' || droneAction === 'descend') {
      event.preventDefault();
      droneVerticalPointer = event.pointerId;
      window.__NAIJA_FIELD_EQUIPMENT__?.setDroneVertical?.(droneAction === 'ascend' ? 1 : -1);
      return;
    }
    if (droneAction === 'turn-left' || droneAction === 'turn-right') {
      event.preventDefault();
      droneYawPointer = event.pointerId;
      window.__NAIJA_FIELD_EQUIPMENT__?.setDronePan?.(droneAction === 'turn-left' ? -1 : 1);
      return;
    }
    const cctvHold = event.target.closest('[data-cctv-hold]')?.dataset.cctvHold;
    if (cctvHold) {
      event.preventDefault();
      cctvHoldPointer = event.pointerId;
      const pan = cctvHold === 'pan-left' ? -1 : cctvHold === 'pan-right' ? 1 : 0;
      const tilt = cctvHold === 'tilt-up' ? 1 : cctvHold === 'tilt-down' ? -1 : 0;
      window.__NAIJA_SURVEILLANCE__?.setPanInput?.(pan, tilt);
    }
  });
  const releaseRemoteControls = event => {
    const matches = pointer => pointer !== null && (event?.pointerId === undefined || event.pointerId === pointer);
    if (matches(droneVerticalPointer)) {
      droneVerticalPointer = null;
      window.__NAIJA_FIELD_EQUIPMENT__?.setDroneVertical?.(0);
    }
    if (matches(droneYawPointer)) {
      droneYawPointer = null;
      window.__NAIJA_FIELD_EQUIPMENT__?.setDronePan?.(0);
    }
    if (matches(cctvHoldPointer)) {
      cctvHoldPointer = null;
      window.__NAIJA_SURVEILLANCE__?.setPanInput?.(0, 0);
    }
  };
  window.addEventListener('pointerup', releaseRemoteControls, true);
  window.addEventListener('pointercancel', releaseRemoteControls, true);

  // Handle Data Saver in the capture phase so this persistent system setting
  // is applied even when another interface layer intercepts menu bubbling.
  document.addEventListener('click', event => {
    const setting = event.target.closest('[data-setting]');
    if (setting?.dataset.setting !== 'data-saver') return;
    event.preventDefault();
    event.stopPropagation();
    dataSaverEnabled = setting.getAttribute('aria-pressed') !== 'true';
    window.__NAIJA_DATA_SAVER__ = { enabled: dataSaverEnabled, explicit: true };
    setting.setAttribute('aria-pressed', String(dataSaverEnabled));
    setting.textContent = dataSaverEnabled ? 'ON' : 'OFF';
    try { localStorage.setItem('naijaCityDataSaver', String(dataSaverEnabled)); } catch {}
    showToast(dataSaverEnabled ? 'Data Saver ON · applies next launch' : 'Data Saver OFF · applies next launch');
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!pause.hidden || !panel.hidden) close();
      else open('pause');
    }
  });

  const escapeMarkup = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function renderInventory() {
    const goods = Object.entries(economyState.inventory || {}).filter(([, count]) => Number(count) > 0);
    const goodsRows = goods.length
      ? goods.map(([id, count], index) => '<article><b>' + String(index + 1).padStart(2, '0') + '</b><strong>' + escapeMarkup(id.replaceAll('-', ' ')) + '</strong><small>QUANTITY · ' + Math.floor(Number(count) || 0) + '</small></article>').join('')
      : '<article><b>01</b><strong>Supplies</strong><small>No purchased goods yet</small></article>';
    const equipment = window.__NAIJA_FIELD_EQUIPMENT__?.getState?.();
    const gearRows = equipment?.items?.length
      ? equipment.items.map(item => {
          const cooldown = item.cooldownRemaining > 0 ? 'READY IN ' + item.cooldownRemaining.toFixed(1) + 'S' : 'READY';
          const equipped = item.equipped ? ' · EQUIPPED' : '';
          const cannotEquip = item.count <= 0 && !item.equipped ? ' disabled' : '';
          const unavailable = item.count <= 0 ? ' disabled' : '';
          const equipLabel = item.equipped ? 'STOW' : 'EQUIP';
          return '<article class="gear-card"><div class="gear-card-heading"><b>' + escapeMarkup(item.shortName) + '</b><strong>' + escapeMarkup(item.name) + '</strong></div>' +
            '<small>' + escapeMarkup(item.description) + '</small><small>QTY · ' + item.count + ' · ' + cooldown + equipped + '</small>' +
            '<div class="gear-actions"><button type="button" data-gear-action="equip" data-gear-id="' + escapeMarkup(item.id) + '"' + cannotEquip + '>' + equipLabel + '</button>' +
            '<button type="button" data-gear-action="activate" data-gear-id="' + escapeMarkup(item.id) + '"' + unavailable + '>USE</button>' +
            '<button type="button" data-gear-action="drop" data-gear-id="' + escapeMarkup(item.id) + '"' + unavailable + '>DROP</button></div></article>';
        }).join('')
      : '<article><strong>Field equipment is loading</strong><small>Start the game to initialise the field kit.</small></article>';
    return '<div class="inventory-wallet"><span>AVAILABLE CASH</span><b>₦' + Math.floor(Number(economyState.cash) || 0).toLocaleString('en-NG') + '</b></div>' +
      '<section class="field-equipment-list"><div class="field-section-heading"><b>FIELD EQUIPMENT</b><small>UTILITY GEAR · 4 QUICK SLOTS</small></div><div class="gear-grid">' + gearRows + '</div></section>' +
      '<section><div class="field-section-heading"><b>STORES & SUPPLIES</b></div><div class="tiles">' + goodsRows + '</div></section>';
  }

  function setDroneState(state = null) {
    const drone = state || window.__NAIJA_FIELD_EQUIPMENT__?.getDroneState?.() || { active: false };
    const active = Boolean(drone.active);
    root.classList.toggle('drone-active', active);
    const controls = root.querySelector('#drone-controls');
    if (controls) controls.hidden = !active;
    const battery = Math.max(0, Math.min(100, Number(drone.battery) || 0));
    const label = root.querySelector('#drone-battery-label');
    const fill = root.querySelector('#drone-battery-fill');
    const altitude = root.querySelector('#drone-altitude-label');
    if (label) label.textContent = 'BATTERY · ' + Math.round(battery) + '%';
    if (fill) fill.style.width = battery + '%';
    if (altitude && active) altitude.textContent = 'ALTITUDE · ' + (Number(drone.altitudeMetres) || 0).toFixed(1) + ' M';
    return drone;
  }

  function setCctvState(state = null) {
    const feed = state?.activeFeed || null;
    const active = Boolean(feed?.type === 'cctv');
    root.classList.toggle('cctv-active', active);
    const controls = root.querySelector('#cctv-controls');
    if (controls) controls.hidden = !active;
    if (!active) return null;
    const cameraName = root.querySelector('#cctv-camera-name');
    const cameraMeta = root.querySelector('#cctv-camera-meta');
    const signal = root.querySelector('#cctv-camera-signal');
    const fill = root.querySelector('#cctv-signal-fill');
    if (cameraName) cameraName.textContent = feed.name || 'CCTV CAMERA';
    if (cameraMeta) cameraMeta.textContent = 'CAM ' + (feed.cameraNumber || 1) + '/' + (feed.cameraCount || 1) + ' · ' + String(feed.district || 'CITY').toUpperCase() + ' · LIVE';
    if (signal) signal.textContent = 'SIGNAL · ' + Math.round(feed.signalPercent || 0) + '%';
    if (fill) fill.style.width = Math.max(0, Math.min(100, Number(feed.signalPercent) || 0)) + '%';
    return feed;
  }

  function refreshEquipmentUI(state = null) {
    const equipment = state || window.__NAIJA_FIELD_EQUIPMENT__?.getState?.();
    const slots = equipment?.quickSlots || [];
    root.querySelectorAll('[data-slot]').forEach(button => {
      const slot = slots.find(item => String(item.slot) === String(button.dataset.slot));
      const label = button.querySelector('small');
      if (label) label.textContent = slot?.count > 0 ? slot.shortName : 'EMPTY';
      button.setAttribute('aria-pressed', String(Boolean(slot?.equipped)));
      button.setAttribute('aria-label', 'Quick slot ' + button.dataset.slot + (slot?.count > 0 ? ' · ' + slot.name + ' · quantity ' + slot.count : ' · empty'));
      button.title = slot?.count > 0 ? slot.name : 'Empty quick slot';
      button.disabled = !slot || slot.count <= 0;
    });
    if (!panel.hidden && root.querySelector('#panel-title')?.textContent === 'Inventory') {
      root.querySelector('#panel-content').innerHTML = renderInventory();
    }
    return equipment || null;
  }
  function setEconomy(state = {}) {
    economyState = {
      cash: Number.isFinite(state.cash) ? Math.max(0, state.cash) : economyState.cash,
      inventory: state.inventory && typeof state.inventory === 'object' ? { ...state.inventory } : economyState.inventory
    };
    const cash = root.querySelector('#hud-wallet-value');
    if (cash) cash.textContent = '₦' + Math.floor(economyState.cash).toLocaleString('en-NG');
    const count = root.querySelector('#hud-inventory-count');
    if (count) count.textContent = 'BAG · ' + Object.values(economyState.inventory).reduce((sum, value) => sum + Math.max(0, Math.floor(Number(value) || 0)), 0);
    if (!panel.hidden && root.querySelector('#panel-title')?.textContent === 'Inventory') root.querySelector('#panel-content').innerHTML = renderInventory();
    return { cash: economyState.cash, inventory: { ...economyState.inventory } };
  }
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('visible'), 2200);
  }
  function setVitals(state) {
    const health = Math.max(0, Math.min(100, Math.round(state.health ?? 100)));
    const stamina = Math.max(0, Math.min(100, Math.round(state.stamina ?? 100)));
    root.querySelector('#hud-health-value').textContent = health;
    root.querySelector('#hud-stamina-value').textContent = stamina;
    root.querySelector('#hud-health-fill').style.width = health + '%';
    root.querySelector('#hud-stamina-fill').style.width = stamina + '%';
    const label = state.downed ? 'DOWNED' : state.state === 'recovering' ? 'RECOVERING' : state.crouched ? 'CROUCHED' : state.running ? 'SPRINTING' : state.moving ? 'MOVING' : 'READY';
    root.querySelector('#hud-player-state').textContent = 'STATUS · ' + label;
  }
  function setDistrictLabel(district='YABA', region='LAGOS') {
    const nextDistrict = String(district || 'YABA').toUpperCase();
    const nextRegion = String(region || 'LAGOS').toUpperCase();
    if (activeDistrict === nextDistrict && activeRegion === nextRegion) return;
    activeDistrict = nextDistrict; activeRegion = nextRegion;
    root.querySelector('#current-district-label').textContent = nextDistrict + ' · ' + nextRegion;
    root.querySelector('#local-area-label').textContent = nextDistrict;
    const mapLabel = root.querySelector('#map-active-district');
    if (mapLabel) mapLabel.textContent = nextDistrict + ' DISTRICT · ' + nextRegion;
  }
  function setWorldActivity() { /* Compatibility hook; no centre-screen population banner. */ }
  function setInteractionPrompt(info) {
    const prompt = root.querySelector('#hud-interaction-prompt');
    if (!prompt) return;
    const active = Boolean(info?.available && info?.prompt);
    prompt.hidden = !active;
    prompt.textContent = active ? info.prompt : '';
  }
  function setVehicleControlsMode(mode='two-handed') {
    vehicleControlsMode=mode==='one-handed'?'one-handed':'two-handed';
    root.classList.toggle('vehicle-controls-one-handed',vehicleControlsMode==='one-handed');
    const button=root.querySelector('[data-setting="vehicle-controls"]');
    if(button){
      button.dataset.mode=vehicleControlsMode;
      button.textContent=vehicleControlsMode==='two-handed'?'TWO-HANDED':'ONE-HANDED';
      button.setAttribute('aria-pressed',String(vehicleControlsMode==='two-handed'));
    }
    return vehicleControlsMode;
  }
  function setVehicleMode(active, state = {}) {
    const driving = Boolean(active);
    root.classList.toggle('in-vehicle', driving);
    const controls = root.querySelector('#vehicle-controls');
    if (controls) controls.hidden = !driving;
    if (!driving) return;
    const speed = root.querySelector('#vehicle-speed');
    const temp = root.querySelector('#vehicle-temp');
    const fuel = root.querySelector('#vehicle-fuel');
    if (speed) speed.textContent = Math.round(Math.abs(state.speedKmh || 0)) + ' km/h';
    if (temp) {
      const temperature = Math.round(state.engineTempC || 77);
      temp.textContent = 'ENGINE ' + temperature + '°C';
      temp.dataset.state = temperature > 108 ? 'hot' : temperature > 98 ? 'warm' : 'normal';
    }
    if (fuel) fuel.textContent = 'FUEL ' + Math.round(state.fuelPercent ?? 100) + '%';
  }
  function setCameraMode(mode) {
    const firstPerson = mode === 'first-person';
    const button = root.querySelector('#camera-view-toggle');
    if (button) {
      button.dataset.mode = firstPerson ? 'first-person' : 'third-person';
      button.textContent = firstPerson ? 'VIEW · 1P' : 'VIEW · 3P';
      button.setAttribute('aria-pressed', String(firstPerson));
      button.setAttribute('aria-label', firstPerson ? 'Switch to third-person view' : 'Switch to first-person view');
    }
    root.classList.toggle('camera-first-person', firstPerson);
    return true;
  }

  return window.__NAIJA_RPG_UI__ = {
    stage: 7, ready: true, panels: Object.keys(views), setVitals, setCameraMode, setDistrictLabel, setWorldActivity, setInteractionPrompt, setVehicleMode, setEconomy, showToast,
    open, close, requirePlayerCharacter, setPlayerCharacterReady, updateLoading, finishLoading,
    setVehicleControlsMode, getVehicleControlsMode:()=>vehicleControlsMode,
    setWorldMapData:worldMapUI.setData, setWorldMapPlayerPosition:worldMapUI.setPlayerPosition, getWorldMapState:worldMapUI.getState,
    isPlayerCharacterRequired: () => characterRequired,
    refreshEquipmentUI,
    setDroneState,
    setCctvState
  };
}
