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
      <div class="brand"><span class="mark">N</span><div><b>NAIJA CITY</b><small data-genre="third-person open-world action RPG">THIRD-PERSON OPEN-WORLD ACTION RPG</small></div></div>
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
    <div class="tools"><button id="assets-toggle" aria-expanded="false" aria-controls="assets-panel">ASSETS</button><button id="perf-toggle" aria-expanded="false" aria-controls="perf-panel">PERF</button></div>
    <div class="touch" aria-label="Mobile game controls">
      <div class="stick" id="move-joystick" role="application" aria-label="Movement joystick"><i id="move-knob"></i><small>MOVE</small></div>
      <div class="actions">
        <button id="jump-button" aria-label="Jump or climb">↑<small>JUMP</small></button>
        <button id="sprint-button" aria-label="Toggle sprint" aria-pressed="false">»<small>SPRINT</small></button>
        <button id="crouch-button" aria-label="Toggle crouch" aria-pressed="false">↓<small>CROUCH</small></button>
        <button id="interact-button" aria-label="Interact">◎<small>INTERACT</small></button>
      </div>
    </div>
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
    const slot = event.target.closest('[data-slot]');
    if (slot) {
      root.querySelectorAll('[data-slot]').forEach(item => item.setAttribute('aria-pressed', String(item === slot)));
      showToast('Quick slot ' + slot.dataset.slot + ' is empty.');
      return;
    }
  });
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
    const items = Object.entries(economyState.inventory || {}).filter(([, count]) => Number(count) > 0);
    const rows = items.length
      ? items.map(([id, count], index) => `<article><b>${String(index + 1).padStart(2, '0')}</b><strong>${escapeMarkup(id.replaceAll('-', ' '))}</strong><small>QUANTITY · ${Math.floor(Number(count) || 0)}</small></article>`).join('')
      : '<article><b>01</b><strong>Supplies</strong><small>No purchased goods yet</small></article>';
    return `<div class="inventory-wallet"><span>AVAILABLE CASH</span><b>₦${Math.floor(Number(economyState.cash) || 0).toLocaleString('en-NG')}</b></div><div class="tiles">${rows}</div>`;
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
  return window.__NAIJA_RPG_UI__ = {
    stage: 7, ready: true, panels: Object.keys(views), setVitals, setDistrictLabel, setWorldActivity, setInteractionPrompt, setVehicleMode, setEconomy, showToast,
    open, close, requirePlayerCharacter, setPlayerCharacterReady, updateLoading, finishLoading,
    setVehicleControlsMode, getVehicleControlsMode:()=>vehicleControlsMode,
    setWorldMapData:worldMapUI.setData, setWorldMapPlayerPosition:worldMapUI.setPlayerPosition, getWorldMapState:worldMapUI.getState,
    isPlayerCharacterRequired: () => characterRequired
  };
}
