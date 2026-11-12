const INVENTORY = [
  { title: 'STAGE 08B NIGERIAN BUILDING DETAIL', items: [
    ['Detailed commercial shopfronts', '8'], ['Residential facade upgrades', '8'],
    ['Projecting shop awnings and fascia', '8 / 8'], ['Roller shutters and security doors', '8 / 8'],
    ['Residential balconies and open balustrades', '8'], ['Window security grilles', '8'],
    ['External AC condensers', '8'], ['Rooftop water tanks', '16'],
    ['Shared architectural material families', '12']
  ]},
  { title: 'STAGE 08A CITY EXPANSION', items: [
    ['Expanded playable ground footprint (approx.)', '96 × 374 m'],
    ['Connected parallel distributor roads', '2'], ['New cross streets', '3'],
    ['Central avenue extensions', '2'], ['Commercial neighbourhood buildings', '8'],
    ['Residential neighbourhood buildings', '8'], ['Pocket parks', '3']
  ]},
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
  { title: 'PLAYER & TRAFFIC', items: [
    ['Procedural human player', '1'], ['Scripted AI traffic cars', '6'], ['Imported diagnostic GLB model', '1'],
    ['Traffic signal poles / heads', '2 / 2'], ['Traffic signal lamps', '6']
  ]},
  { title: 'STAGE 06 CHARACTER SYSTEM', items: [
    ['Walk / run movement', 'Active'], ['Sprint and jump', 'Active'],
    ['Procedural gait animation', 'Active'], ['Orbit-follow camera', 'Active'],
    ['Mobile joystick / action buttons', 'Active'], ['External diagnostic texture map', '1']
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
    <p class="asset-note">Stage 08A adds connected road extensions, commercial and residential blockout buildings, and pocket parks. Buildings are still procedural blockout geometry, not final detailed architecture. The player is now a lightweight human character built from primitive meshes with procedural movement animations. The imported GLB is still a diagnostic asset, not the player model. Shop buildings remain blockout shapes, not detailed storefront models.</p>
    <p class="asset-note asset-missing"><strong>Not in this build:</strong> production rigged humanoid GLB, motion-capture animation clips, robust building collision, stairs/slopes, foot IK, pedestrians, keke, motorcycles, buses, detailed shop interiors, baked PBR texture libraries, readable business-name signage, detailed shop interiors and advanced traffic AI.</p>
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
