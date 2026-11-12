import './rpg-ui.css';

const views = {
  inventory: ['FIELD KIT', 'Inventory', '<div class="tiles"><article><b>01</b><strong>Supplies</strong><small>No items collected</small></article><article><b>02</b><strong>Key items</strong><small>No key items yet</small></article><article><b>03</b><strong>Resources</strong><small>0 collected</small></article><article><b>04</b><strong>Quick slots</strong><small>Tap a slot to select it</small></article></div>'],
  quests: ['JOURNAL', 'Missions', '<div class="mission"><small>MAIN STORY</small><b>A CITY WAKES</b><p>Explore the neighbourhood and learn your way around the city.</p><em>OBJECTIVE · Reach the marked location</em></div><div class="mission"><small>SIDE ACTIVITY</small><b>LOCAL CONNECTIONS</b><p>Meet people and discover places of interest.</p><em>AVAILABLE LATER</em></div>'],
  map: ['CITY NAVIGATION', 'District map', '<div class="map-large"><i></i><b>YOU</b><strong>◆</strong></div><p class="muted">YABA DISTRICT · MAP DATA PROTOTYPE</p>'],
  character: ['PLAYER PROFILE', 'Character', '<div class="profile"><b>NC</b><div><strong>ROOKIE</strong><p>Level 01 · City newcomer</p><small>0 / 100 XP TO LEVEL 02</small></div></div><div class="stat">Strength <b>01</b></div><div class="stat">Mobility <b>01</b></div><div class="stat">Awareness <b>01</b></div><div class="stat">Street reputation <b>00</b></div>'],
  settings: ['SYSTEM', 'Settings', '<div class="setting">HUD visibility <button data-setting="hud" aria-pressed="true">ON</button></div><div class="setting">Reduced motion <button data-setting="motion" aria-pressed="false">OFF</button></div><div class="setting">Large touch controls <button data-setting="touch" aria-pressed="true">ON</button></div><p class="muted">Landscape-first controls. Gameplay settings are expanded in later stages.</p>']
};

export function mountRPGInterface() {
  const root = document.getElementById('rpg-interface');
  if (!root) throw new Error('Missing RPG interface root');
  root.innerHTML = `
    <header class="topbar">
      <div class="brand"><span class="mark">N</span><div><b>NAIJA CITY</b><small data-genre="third-person open-world action RPG">THIRD-PERSON OPEN-WORLD ACTION RPG</small></div></div>
      <div class="district"><small>CURRENT DISTRICT</small><b>YABA · LAGOS</b></div>
      <button class="menu" data-open="pause" aria-label="Pause game">Ⅱ<small>PAUSE</small></button>
    </header>
    <section class="status" aria-label="Player status">
      <div class="player-status"><b>LVL 01</b><span>ROOKIE · CITY NEWCOMER</span><small>100 XP TO NEXT LEVEL</small></div>
      <label>HEALTH <b id="hud-health-value">100</b><i class="meter"><i id="hud-health-fill" style="width:100%"></i></i></label>
      <label>STAMINA <b id="hud-stamina-value">100</b><i class="meter stamina"><i id="hud-stamina-fill" style="width:100%"></i></i></label>
      <small class="player-state" id="hud-player-state">STATUS · READY</small>
    </section>
    <section class="minimap" aria-label="Minimap">
      <div>LOCAL AREA <b>YABA</b></div>
      <div class="mini-map"><i></i><span></span><strong>◆</strong></div>
      <small class="compass">N　·　NE　·　E　·　SE</small>
    </section>
    <section class="objective"><small>● CURRENT OBJECTIVE</small><b>Explore the neighbourhood</b><span>Find your place in the city.</span></section>
    <div class="tools"><button id="assets-toggle" aria-expanded="false" aria-controls="assets-panel">ASSETS</button><button id="perf-toggle" aria-expanded="false" aria-controls="perf-panel">PERF</button></div>
    <div class="touch" aria-label="Mobile game controls">
      <div class="stick" id="move-joystick" role="application" aria-label="Movement joystick"><i id="move-knob"></i><small>MOVE</small></div>
      <div class="actions">
        <button id="jump-button" aria-label="Jump">↑<small>JUMP</small></button>
        <button id="sprint-button" aria-label="Hold to sprint">»<small>SPRINT</small></button>
        <button id="crouch-button" aria-label="Toggle crouch" aria-pressed="false">↓<small>CROUCH</small></button>
        <button id="interact-button" aria-label="Interact">◎<small>INTERACT</small></button>
      </div>
    </div>
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
    <section class="pause" id="rpg-pause" hidden><div class="pause-card"><div class="brand"><span class="mark">N</span><div><b>NAIJA CITY</b><small>PAUSED</small></div></div><h2>Take a moment.</h2><p>Your city is waiting.</p><button class="resume" data-resume>RESUME GAME　→</button><div class="pause-links" aria-label="Game menus"><button data-open="inventory">INVENTORY</button><button data-open="quests">MISSIONS</button><button data-open="map">CITY MAP</button><button data-open="character">PLAYER</button></div><button data-open="settings">SETTINGS</button><small>NAIJA CITY · PAUSED</small></div></section>
  `;

  let paused = false;
  window.__NAIJA_RPG_PAUSED__ = false;
  const panel = root.querySelector('#rpg-panel');
  const pause = root.querySelector('#rpg-pause');
  const toast = root.querySelector('#hud-toast');
  const open = name => {
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
    root.querySelector('#panel-content').innerHTML = view[2];
    panel.hidden = false;
    pause.hidden = true;
  };
  const close = () => {
    paused = false;
    window.__NAIJA_RPG_PAUSED__ = false;
    panel.hidden = true;
    pause.hidden = true;
  };
  root.addEventListener('click', event => {
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
      const enabled = setting.getAttribute('aria-pressed') !== 'true';
      setting.setAttribute('aria-pressed', String(enabled));
      setting.textContent = enabled ? 'ON' : 'OFF';
      if (setting.dataset.setting === 'hud') root.classList.toggle('hud-hidden', !enabled);
      if (setting.dataset.setting === 'motion') root.classList.toggle('reduced-motion', enabled);
      if (setting.dataset.setting === 'touch') root.classList.toggle('large-touch', enabled);
      return;
    }
    const slot = event.target.closest('[data-slot]');
    if (slot) showToast('Quick slot ' + slot.dataset.slot + ' is empty.');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!pause.hidden || !panel.hidden) close();
      else open('pause');
    }
  });

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
    root.querySelector('#hud-player-state').textContent = 'STATUS · ' + (state.crouched ? 'CROUCHED' : state.running ? 'SPRINTING' : state.moving ? 'MOVING' : 'READY');
  }
  return window.__NAIJA_RPG_UI__ = {
    stage: 7, ready: true, panels: Object.keys(views), setVitals, showToast,
    open, close
  };
}
