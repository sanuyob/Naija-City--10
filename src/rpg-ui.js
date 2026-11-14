import './rpg-ui.css';
import { importPlayerCharacter } from './character-importer.js';
import { clearSavedPlayerCharacter } from './player-character-store.js';

const views = {
  inventory: ['FIELD KIT', 'Inventory', '<div class="tiles"><article><b>01</b><strong>Supplies</strong><small>No items collected</small></article><article><b>02</b><strong>Key items</strong><small>No key items yet</small></article><article><b>03</b><strong>Resources</strong><small>0 collected</small></article><article><b>04</b><strong>Quick slots</strong><small>Tap a slot to select it</small></article></div>'],
  quests: ['JOURNAL', 'Missions', '<div class="mission"><small>MAIN STORY</small><b>A CITY WAKES</b><p>Explore the neighbourhood and learn your way around the city.</p><em>OBJECTIVE · Reach the marked location</em></div><div class="mission"><small>SIDE ACTIVITY</small><b>LOCAL CONNECTIONS</b><p>Meet people and discover places of interest.</p><em>AVAILABLE LATER</em></div>'],
  map: ['CITY NAVIGATION', 'District map', '<div class="map-large"><i></i><b>YOU</b><strong>◆</strong></div><p class="muted">YABA DISTRICT · MAP DATA PROTOTYPE</p>'],
  character: ['PLAYER PROFILE', 'Character', '<div class="profile"><b>NC</b><div><strong>ROOKIE</strong><p>Level 01 · City newcomer</p><small>0 / 100 XP TO LEVEL 02</small></div></div><div class="character-roster" id="character-roster"><article class="character-card" data-player-card="hero01"><div class="character-number">01</div><div class="character-info"><small>AVAILABLE · BUNDLED</small><b>HERO 01</b><p>Original Naija City player</p><em data-player-main>MAIN CHARACTER</em></div><div class="character-actions"><button data-player-action="switch" data-player-id="hero01">SWITCH TO</button><button data-player-action="main" data-player-id="hero01">SET AS MAIN</button></div></article><article class="character-card is-locked" data-player-card="ara-female"><div class="character-number">02</div><div class="character-info"><small data-player-status="ara-female">SECOND SLOT · IMPORT REQUIRED</small><b>ARA 3D FEMALE</b><p>The_Female_Executive from Ara 3D Gen</p><em data-player-main>SECOND CHARACTER</em></div><div class="character-actions"><button data-player-action="switch" data-player-id="ara-female" disabled>SWITCH TO</button><button data-player-action="main" data-player-id="ara-female" disabled>SET AS MAIN</button></div></article></div><div class="mission character-import-card"><small>ADD SECOND CHARACTER</small><b>ARA 3D GEN · FEMALE PLAYER</b><p>Choose The_Female_Executive.fbx once. It is converted and saved as your second character on this device. Hero 01 stays available, and you can switch between both at any time.</p><form id="player-character-form"><label for="player-character-file">ARA CHARACTER FBX</label><input id="player-character-file" type="file" accept=".fbx,application/octet-stream" required><button id="player-character-import" type="submit">ADD TO CHARACTER ROSTER</button></form><p id="player-character-status" role="status">Your roster is stored in this browser on this device.</p><button id="player-character-reset" type="button">REMOVE ARA FROM ROSTER</button></div><div class="stat">Strength <b>01</b></div><div class="stat">Mobility <b>01</b></div><div class="stat">Awareness <b>01</b></div><div class="stat">Street reputation <b>00</b></div>'],
  settings: ['SYSTEM', 'Settings', '<div class="setting">HUD visibility <button data-setting="hud" aria-pressed="true">ON</button></div><div class="setting">Reduced motion <button data-setting="motion" aria-pressed="false">OFF</button></div><div class="setting">Large touch controls <button data-setting="touch" aria-pressed="true">ON</button></div><p class="muted">Landscape-first controls. Gameplay settings are expanded in later stages.</p>'],
  crew: ['CITY CREW', 'Companions', '<div class="mission"><small>ACTIVE ROSTER · MAXIMUM TWO</small><b>TECH SPECIALIST</b><p>Arrives from a district entry point. Follows, holds position and responds to field commands.</p><div class="tiles"><button data-companion-command="Summon" data-companion-id="tech">SUMMON</button><button data-companion-command="Follow" data-companion-id="tech">FOLLOW</button><button data-companion-command="Hold" data-companion-id="tech">HOLD</button><button data-companion-command="Dismiss" data-companion-id="tech">DISMISS</button></div></div><div class="mission"><small>TRANSPORT SUPPORT</small><b>DRIVER</b><p>Second companion slot. Walks in from a separate entry point; no instant teleport.</p><div class="tiles"><button data-companion-command="Summon" data-companion-id="driver">SUMMON</button><button data-companion-command="Regroup" data-companion-id="driver">REGROUP</button><button data-companion-command="RadioCall" data-companion-id="driver">RADIO</button><button data-companion-command="Dismiss" data-companion-id="driver">DISMISS</button></div></div><div class="tiles"><button data-companion-command="PointAhead" data-companion-id="tech">POINT AHEAD</button><button data-companion-command="AssistUp" data-companion-id="tech">ASSIST UP</button></div>']
};

export function mountRPGInterface() {
  const root = document.getElementById('rpg-interface');
  if (!root) throw new Error('Missing RPG interface root');
  root.innerHTML = `
    <header class="topbar">
      <div class="brand"><span class="mark">N</span><div><b>NAIJA CITY</b><small data-genre="third-person open-world action RPG">THIRD-PERSON OPEN-WORLD ACTION RPG</small></div></div>
      <div class="district"><small>CURRENT DISTRICT</small><b>YABA · LAGOS</b></div>
      <button id="character-switch-button" class="character-switch-button" type="button" aria-label="Switch player character" title="Quick character switch" disabled>⇄<small>SWAP</small></button>
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
    <section class="objective"><small>● CURRENT OBJECTIVE</small><b>Explore the neighbourhood</b><span>Find your place in the city.</span><small id="hud-world-activity" class="world-live-status">CITY LIFE · 10 PEDESTRIANS · CREW 0/2</small></section>
    <div class="tools"><button id="assets-toggle" aria-expanded="false" aria-controls="assets-panel">ASSETS</button><button id="perf-toggle" aria-expanded="false" aria-controls="perf-panel">PERF</button></div>
    <div class="touch" aria-label="Mobile game controls">
      <div class="stick" id="move-joystick" role="application" aria-label="Movement joystick"><i id="move-knob"></i><small>MOVE</small></div>
      <div class="actions">
        <button id="jump-button" aria-label="Jump">↑<small>JUMP</small></button>
        <button id="sprint-button" aria-label="Hold to sprint">»<small>SPRINT</small></button>
        <button id="crouch-button" aria-label="Toggle crouch" aria-pressed="false">↓<small>CROUCH</small></button>
        <button id="parkour-button" aria-label="Parkour traversal">◇<small>PARKOUR</small></button>
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
    <section class="pause" id="rpg-pause" hidden><div class="pause-card"><div class="brand"><span class="mark">N</span><div><b>NAIJA CITY</b><small>PAUSED</small></div></div><h2>Take a moment.</h2><p>Your city is waiting.</p><button class="resume" data-resume>RESUME GAME　→</button><div class="pause-links" aria-label="Game menus"><button data-open="inventory">INVENTORY</button><button data-open="quests">MISSIONS</button><button data-open="map">CITY MAP</button><button data-open="character">PLAYER</button><button data-open="crew">CREW</button></div><button data-open="settings">SETTINGS</button><small>NAIJA CITY · PAUSED</small></div></section>
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
    if (name === 'character') {
      window.__NAIJA_GAME__?.getCharacterRoster?.().then(setCharacterRoster).catch(() => {});
    }
    panel.hidden = false;
    pause.hidden = true;
  };
  const close = () => {
    paused = false;
    window.__NAIJA_RPG_PAUSED__ = false;
    panel.hidden = true;
    pause.hidden = true;
  };
  root.addEventListener('submit', async event => {
    const form = event.target.closest('#player-character-form');
    if (!form) return;
    event.preventDefault();
    const file = form.querySelector('#player-character-file')?.files?.[0];
    const button = form.querySelector('#player-character-import');
    const status = form.querySelector('#player-character-status');
    if (!file) { showToast('Choose the Ara FBX file first.'); return; }
    button.disabled = true;
    try {
      status.textContent = 'Preparing character import…';
      const metadata = await importPlayerCharacter(file, message => { status.textContent = message; });
      status.textContent = 'Added to second slot · ' + metadata.boneCount + ' bones · ' +
        metadata.animationNames.join(', ') + ' · ' + (metadata.glbBytes / 1048576).toFixed(1) +
        ' MB. Hero 01 remains your main character.';
      button.textContent = 'UPDATE ARA CHARACTER';
      button.disabled = false;
      await window.__NAIJA_REFRESH_CHARACTERS__?.();
      const roster = await window.__NAIJA_GAME__?.getCharacterRoster?.();
      setCharacterRoster(roster);
      showToast('Ara added as your second character.');
    } catch (error) {
      status.textContent = 'Import failed: ' + (error?.message || error);
      button.disabled = false;
      showToast('Character import failed. See the Player panel.');
    }
  });

  root.addEventListener('click', async event => {
    const importButton = event.target.closest('#player-character-import');
    if (importButton?.dataset.reloadPlayer === 'true') {
      importButton.dataset.reloadPlayer = 'false';
      return;
    }
    const playerAction = event.target.closest('[data-player-action]');
    if (playerAction) {
      const id = playerAction.dataset.playerId;
      const makeMain = playerAction.dataset.playerAction === 'main';
      playerAction.disabled = true;
      try {
        const result = await window.__NAIJA_SWITCH_PLAYER__?.(id, makeMain);
        if (!result?.ok) showToast(result?.message || 'Character switch failed.');
        else showToast(result.displayName + (makeMain ? ' is now your main character.' : ' switched in.'));
        const roster = await window.__NAIJA_GAME__?.getCharacterRoster?.();
        setCharacterRoster(roster);
      } catch (error) {
        showToast(error?.message || 'Character switch failed.');
      } finally {
        playerAction.disabled = false;
      }
      return;
    }
    if (event.target.closest('#character-switch-button')) {
      const button = event.target.closest('#character-switch-button');
      button.disabled = true;
      try {
        const result = await window.__NAIJA_SWITCH_PLAYER__?.();
        if (!result?.ok) showToast(result?.message || 'Quick switch unavailable.');
        else showToast('Switched to ' + result.displayName + '.');
        const roster = await window.__NAIJA_GAME__?.getCharacterRoster?.();
        setCharacterRoster(roster);
      } finally {
        const roster = await window.__NAIJA_GAME__?.getCharacterRoster?.();
        button.disabled = !roster?.characters?.some(item => item.id === 'ara-female' && item.available);
      }
      return;
    }
    if (event.target.closest('#player-character-reset')) {
      const button = event.target.closest('#player-character-reset');
      button.disabled = true;
      try {
        await clearSavedPlayerCharacter();
        showToast('Ara removed. Hero 01 restored. Reloading…');
        window.location.reload();
      } catch (error) {
        button.disabled = false;
        showToast('Could not reset character: ' + (error?.message || error));
      }
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
    const target = event.target.closest('[data-open]');
    if (target) { open(target.dataset.open); return; }
    if (event.target.closest('[data-close]') || event.target.closest('[data-resume]')) { close(); return; }
    if (event.target.closest('#parkour-button')) {
      const started=window.__NAIJA_TRAVERSE__?.()===true;
      showToast(started?'Parkour move started.':'Face a marked obstacle, ledge, ladder or wall.');
      return;
    }
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
    if (slot) {
      root.querySelectorAll('[data-slot]').forEach(item => item.setAttribute('aria-pressed', String(item === slot)));
      showToast('Quick slot ' + slot.dataset.slot + ' is empty.');
      return;
    }
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
  function setWorldActivity(state={}) {
    const el=root.querySelector('#hud-world-activity');
    if(el)el.textContent='CITY LIFE · '+(state.pedestrians??0)+' PEDESTRIANS · CREW '+(state.companions??0)+'/2';
  }
  function setCharacterRoster(roster={}) {
    const cards=root.querySelectorAll('[data-player-card]');
    cards.forEach(card=>{
      const id=card.dataset.playerCard;
      const data=roster.characters?.find(item=>item.id===id);
      if(!data)return;
      card.classList.toggle('is-active',!!data.active);
      card.classList.toggle('is-main',!!data.isMain);
      card.classList.toggle('is-locked',!data.available);
      card.querySelectorAll('[data-player-action]').forEach(button=>{
        button.disabled=!data.available || (!!data.active && button.dataset.playerAction==='switch');
        button.textContent=button.dataset.playerAction==='main'
          ? (data.isMain?'MAIN CHARACTER':'SET AS MAIN')
          : (data.active?'CURRENTLY ACTIVE':'SWITCH TO');
      });
      const status=card.querySelector('[data-player-status]');
      if(status)status.textContent=data.available
        ? (data.active?'CURRENTLY PLAYING':data.isMain?'SAVED MAIN CHARACTER':'READY TO SWITCH')
        : 'SECOND SLOT · IMPORT REQUIRED';
      const main=card.querySelector('[data-player-main]');
      if(main)main.textContent=data.isMain?'MAIN CHARACTER':'AVAILABLE IN ROSTER';
    });
    const quick=root.querySelector('#character-switch-button');
    if(quick)quick.disabled=!(roster.characters||[]).some(item=>item.id==='ara-female'&&item.available);
  }
  return window.__NAIJA_RPG_UI__ = {
    stage: 7, ready: true, panels: Object.keys(views), setVitals, setWorldActivity, setCharacterRoster, showToast,
    open, close
  };
}
