/**
 * Naija City world identity registry.
 * The map, exterior nameplates and enterability cues share these records.
 * Coordinates are authored world-space positions from existing game systems.
 */
const CATEGORY = {
  shop: { label: 'SHOP', symbol: '$' },
  home: { label: 'HOME', symbol: '⌂' },
  office: { label: 'OFFICE', symbol: '▦' },
  hotel: { label: 'HOTEL', symbol: 'H' },
  activity: { label: 'ACTIVITY', symbol: '★' },
  barber: { label: 'BARBER', symbol: '✂' },
  restaurant: { label: 'RESTAURANT', symbol: '♨' },
  bank: { label: 'BANK', symbol: '₦' },
  hospital: { label: 'HOSPITAL', symbol: '+' },
  public: { label: 'PUBLIC', symbol: 'P' },
  mechanic: { label: 'MECHANIC', symbol: '⚙' },
  pharmacy: { label: 'PHARMACY', symbol: '+' },
  fuel: { label: 'FUEL', symbol: 'F' },
  transport: { label: 'TRANSPORT', symbol: '↗' },
  service: { label: 'SERVICE', symbol: '⚙' },
  landmark: { label: 'LANDMARK', symbol: '◆' }
};

function safePosition(value) {
  return Array.isArray(value) && value.length >= 3 && value.slice(0, 3).every(Number.isFinite)
    ? value.slice(0, 3) : null;
}

export function buildWorldIdentityRecords({ stage08EState = {} } = {}) {
  const records = [];
  const add = record => {
    if (!record?.id || !record.name || !safePosition(record.position)) return;
    records.push({
      id: String(record.id), name: String(record.name), category: CATEGORY[record.category] ? record.category : 'landmark',
      position: safePosition(record.position), district: record.district || 'Lagos',
      enterable: Boolean(record.enterable), description: record.description || '',
      source: record.source || 'world', signage: record.signage !== false
    });
  };

  for (const building of stage08EState.buildings || []) {
    const id = String(building.id || '');
    const hero = Boolean(building.hero) || id === 'yaba-core-01';
    const kind = String(building.kind || '').toLowerCase();
    const match = id.match(/(\d+)$/);
    const ordinal = match ? match[1] : '';
    const category = kind.includes('residential') ? 'home'
      : kind.includes('office') ? 'office'
      : kind.includes('public') ? 'public'
      : kind.includes('mixed') || kind.includes('commercial') ? 'shop' : 'landmark';
    const name = hero ? (building.name || 'Computer Village Electronics Plaza')
      : (category === 'home' ? 'Yaba Residence ' : category === 'office' ? 'Yaba Office ' : 'Yaba Commercial ') + (ordinal || 'Block');
    add({
      id:'stage08E-' + id, name, category, position:building.position,
      signPosition:(()=>{const yaw=(Number(building.rotationY)||0)*Math.PI/180,depth=Number(building.size?.[2])||6.8;return [building.position[0]+Math.sin(yaw)*depth*.52,building.position[1]+(Number(building.size?.[1])||5)*.78,building.position[2]-Math.cos(yaw)*depth*.52];})(),
      district:'Yaba', enterable:false, source:'stage08E',
      description:'Exterior building · no enterable interior is currently authored for this structure.'
    });
  }

  // Existing named roadside destinations in the original Yaba starter area.
  add({ id:'yaba-street-kiosk', name:'Yaba Street Kiosk', category:'shop', position:[-5.5,0,-17], district:'Yaba', enterable:false, description:'Roadside vendor.' });
  add({ id:'yaba-bus-stop', name:'Yaba Bus Stop', category:'service', position:[5.8,0,-37], district:'Yaba', enterable:false, description:'Local transport stop.' });

  const unique = new Map();
  for (const record of records) if (!unique.has(record.id)) unique.set(record.id, record);
  return [...unique.values()];
}

export function createWorldSignage({ root, camera, canvas } = {}) {
  if (!root || !camera || !canvas) throw new Error('World signage requires the HUD root, camera and game canvas.');
  const layer = document.createElement('div');
  layer.className = 'world-signage-layer';
  layer.setAttribute('aria-hidden', 'true');
  root.appendChild(layer);
  let records = [];
  let nodes = new Map();
  const screen = { x: 0, y: 0, z: 0 };
  const rect = { left: 0, top: 0, width: 1, height: 1 };
  const v = { x: 0, y: 0, z: 0, sub(rhs) { this.x-=rhs.x;this.y-=rhs.y;this.z-=rhs.z;return this; }, length() { return Math.hypot(this.x,this.y,this.z); }, normalize() { const n=this.length()||1;this.x/=n;this.y/=n;this.z/=n;return this; }, dot(rhs) { return this.x*rhs.x+this.y*rhs.y+this.z*rhs.z; } };

  function setRecords(next = []) {
    records = next.filter(item => item.signage !== false && item.position?.length === 3);
    layer.replaceChildren();
    nodes.clear();
    for (const item of records) {
      const node = document.createElement('div');
      node.className = 'world-signage';
      node.hidden = true;
      node.dataset.category = item.category;
      const symbol = CATEGORY[item.category]?.symbol || '◆';
      node.innerHTML = '<span class="world-signage-symbol"></span><span class="world-signage-copy"><b></b><small></small></span><i></i>';
      node.querySelector('.world-signage-symbol').textContent = symbol;
      node.querySelector('b').textContent = item.name;
      node.querySelector('small').textContent = item.enterable ? 'OPEN TO ENTER' : CATEGORY[item.category]?.label || 'LOCATION';
      layer.appendChild(node);
      nodes.set(item.id, node);
    }
  }

  function update(playerPosition) {
    if (!Array.isArray(playerPosition)) return;
    rect.left = canvas.getBoundingClientRect().left;
    rect.top = canvas.getBoundingClientRect().top;
    rect.width = canvas.getBoundingClientRect().width;
    rect.height = canvas.getBoundingClientRect().height;
    const cameraPosition = camera.getPosition();
    v.x = camera.forward.x; v.y = camera.forward.y; v.z = camera.forward.z;
    const candidates = records.map(item => {
      const distance = Math.hypot(playerPosition[0]-item.position[0], playerPosition[2]-item.position[2]);
      return { item, distance };
    }).filter(entry => entry.distance < 82).sort((a,b)=>a.distance-b.distance).slice(0, 8);
    const visible = new Set();
    for (const entry of candidates) {
      const item = entry.item;
      const node = nodes.get(item.id);
      if (!node) continue;
      const anchor=item.signPosition||[item.position[0],item.position[1]+(item.category==='home'?4.0:5.0),item.position[2]];
      const target = { x:anchor[0], y:anchor[1], z:anchor[2] };
      const dx=target.x-cameraPosition.x,dy=target.y-cameraPosition.y,dz=target.z-cameraPosition.z;
      const depth=Math.hypot(dx,dy,dz);
      const facing=(dx*v.x+dy*v.y+dz*v.z)/(depth||1);
      if (facing < .42) continue;
      camera.camera.worldToScreen(target, screen);
      const x=screen.x/canvas.width*rect.width;
      const y=(canvas.height-screen.y)/canvas.height*rect.height;
      if (!Number.isFinite(x)||!Number.isFinite(y)||x<12||x>rect.width-12||y<18||y>rect.height-22) continue;
      node.style.transform = 'translate3d('+(rect.left+x)+'px,'+(rect.top+y)+'px,0) translate(-50%,-100%)';
      node.style.opacity = String(Math.max(.48,Math.min(1,1-entry.distance/105)));
      node.hidden = false;
      visible.add(item.id);
    }
    for (const [id,node] of nodes) if (!visible.has(id)) node.hidden = true;
  }

  function destroy() { layer.remove(); nodes.clear(); records=[]; }
  return { setRecords, update, destroy };
}

export const WORLD_MAP_CATEGORY_META = CATEGORY;
