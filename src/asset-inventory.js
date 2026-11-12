const INVENTORY = [
  { title: 'ROAD & STREET', items: [
    ['Road surfaces', '2'], ['Sidewalks / footpaths', '2'], ['Junction kerbs', '2'],
    ['Lane dashes', '16'], ['Zebra-crossing stripes', '18'], ['Stop lines', '2'],
    ['Junction centre marking', '1']
  ]},
  { title: 'BUILDINGS & ROADSIDE', items: [
    ['Low-poly shop building blocks', '32'], ['Roadside kiosk', '1'], ['Kiosk awning', '1'],
    ['Bus-stop components (post, sign, bench)', '3']
  ]},
  { title: 'STREET FURNITURE', items: [
    ['Drain covers', '10'], ['Drain grates', '10'], ['Streetlight assemblies', '3'],
    ['Junction bollards', '4']
  ]},
  { title: 'VEHICLES & TRAFFIC', items: [
    ['Player car', '1'], ['Scripted AI traffic cars', '6'], ['Imported diagnostic GLB model', '1'],
    ['Traffic signal poles / heads', '2 / 2'], ['Traffic signal lamps', '6']
  ]},
  { title: 'PHYSICS & GAME SYSTEMS', items: [
    ['Raycast vehicle wheels', '4'], ['Physical traffic colliders', '6'],
    ['Vehicle physics', 'Ammo.js / Bullet'], ['External texture map', '1'], ['Traffic control', '2-phase signals']
  ]}
];

export function mountAssetInventory() {
  const toggle = document.getElementById('assets-toggle');
  const panel = document.getElementById('assets-panel');
  const close = document.getElementById('assets-close');
  const content = document.getElementById('assets-content');
  if (!toggle || !panel || !close || !content) return null;

  content.innerHTML = INVENTORY.map(group => `
    <section class="asset-group">
      <h3>${group.title}</h3>
      ${group.items.map(([name, count]) => `
        <div class="asset-row"><span>${name}</span><strong>${count}</strong></div>
      `).join('')}
    </section>
  `).join('') + `
    <p class="asset-note">The current scene combines procedural low-poly geometry with one imported GLB diagnostic model and a separately loaded texture. The shop buildings remain blockout shapes, not detailed storefront models.</p>
    <p class="asset-note asset-missing"><strong>Not in this build:</strong> pedestrians, keke, motorcycles, buses, detailed shop interiors, production GLB/FBX models, detailed texture libraries, vehicle audio and advanced traffic AI.</p>
  `;

  const setOpen = open => {
    if (open && !panel.open) panel.showModal();
    if (!open && panel.open) panel.close();
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!panel.open));
  close.addEventListener('click', () => setOpen(false));
  panel.addEventListener('click', event => {
    if (event.target === panel) setOpen(false);
  });
  panel.addEventListener('close', () => toggle.setAttribute('aria-expanded', 'false'));
  return INVENTORY.map(group => ({ category: group.title, items: group.items.map(([name, count]) => ({ name, count })) }));
}
