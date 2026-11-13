const INVENTORY = [
  { title: 'STAGE 08D SEMI-PHOTOREAL BUILDING REALISM', items: [
    ['Original Yaba shopfronts upgraded', '32'], ['Expansion commercial buildings upgraded', '8'],
    ['Residential buildings upgraded', '8'], ['Shared PBR material families', '10'],
    ['Shared procedural albedo / normal / gloss maps', '13 maps (512² + 256²)'],
    ['Original business-sign variants', '4'], ['Separate plaster, concrete, roof, steel and tinted-glass maps', 'Shared'],
    ['Modular facade details', 'Runtime diagnostic']
  ]},
  { title: 'STAGE 08C NIGERIAN STREET INFRASTRUCTURE', items: [
    ['Utility poles and overhead service wire spans', '16 poles / 42 wire runs'],
    ['Distributor-road streetlight assemblies', '16'], ['Kerbs and storm-water drain covers', 'Extended network'],
    ['Raised speed-table approaches and tactile paving', '12'], ['Junction and district sign assemblies', '8'],
    ['Pocket-park benches, bins and planters', '3 parks'], ['Bus shelters', '2'],
    ['Static roadside market stalls', '2'], ['Static street-detail meshes', 'Runtime diagnostic']
  ]},
  { title: 'STAGE 08B NIGERIAN BUILDING DETAIL', items: [
    ['Detailed commercial shopfronts', '8'], ['Residential facade upgrades', '8'],
    ['Projecting shop awnings and fascia', '8 / 8'], ['Roller shutters and security doors', '8 / 8'],
    ['Residential balconies and open balustrades', '8'], ['Window security grilles', '8'],
    ['External AC condensers', '8'], ['Rooftop water tanks', '16'],
    ['Shared architectural material families', '11']
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
    <p class="asset-note">Stage 08D adds shared procedural PBR surface maps and modular architectural dressing across all 48 building bodies: 32 original Yaba shops, 8 expansion shops and 8 homes. The pass adds weathered plaster, painted concrete, tinted glazing, metal finishes, business signs, rainwater details and residential entry/window treatment. Buildings remain replaceable procedural plot assets rather than scanned or individually authored high-detail GLBs.</p>
    <p class="asset-note asset-missing"><strong>Still not in this build:</strong> production rigged humanoid GLB, motion-capture animation clips, robust final building collision, stairs/slopes, foot IK, pedestrians, keke, motorcycles, buses, detailed shop interiors, individually authored high-detail building GLBs, baked unique per-building 2K/4K PBR texture sets and advanced traffic AI.</p>
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
