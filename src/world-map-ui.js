const CATEGORY = {
  shop:{label:'SHOP',symbol:'$',color:'#e5c27d'}, home:{label:'HOME',symbol:'⌂',color:'#9bc6e8'},
  office:{label:'OFFICE',symbol:'▦',color:'#8bc9b1'}, hotel:{label:'HOTEL',symbol:'H',color:'#e9a97d'},
  activity:{label:'ACTIVITY',symbol:'★',color:'#d9a7e8'}, barber:{label:'BARBER',symbol:'✂',color:'#e9a2b5'},
  restaurant:{label:'RESTAURANT',symbol:'♨',color:'#e6a56e'}, bank:{label:'BANK',symbol:'₦',color:'#9eb7e8'},
  hospital:{label:'HOSPITAL',symbol:'+',color:'#e58e9a'}, public:{label:'PUBLIC',symbol:'P',color:'#c7c5a2'},
  mechanic:{label:'MECHANIC',symbol:'⚙',color:'#a7c6d8'}, pharmacy:{label:'PHARMACY',symbol:'+',color:'#a4d5bd'},
  fuel:{label:'FUEL',symbol:'F',color:'#e4d07b'}, transport:{label:'TRANSPORT',symbol:'↗',color:'#9ac9d8'},
  service:{label:'SERVICE',symbol:'⚙',color:'#a7c6d8'}, landmark:{label:'LANDMARK',symbol:'◆',color:'#d8d9c4'}
};

export function mountWorldMapUI(root) {
  const overlay=document.createElement('section');
  overlay.id='world-map-overlay';
  overlay.className='world-map-overlay';
  overlay.hidden=true;
  overlay.innerHTML=`
    <header class="world-map-header"><div><small>NAIJA CITY · CITY ATLAS</small><h2>WORLD MAP</h2></div><button type="button" data-map-close aria-label="Close map">×</button></header>
    <div class="world-map-toolbar">
      <label>SEARCH CITY<input id="world-map-search" type="search" placeholder="Find a place or district…" autocomplete="off"></label>
      <div class="world-map-filters" role="group" aria-label="Filter map locations">
        <button data-map-filter="all" class="active">ALL</button><button data-map-filter="shop">SHOPS</button><button data-map-filter="home">HOMES</button><button data-map-filter="office">OFFICES</button><button data-map-filter="hotel">HOTELS</button><button data-map-filter="activity">ACTIVITIES</button><button data-map-filter="service">SERVICES</button><button data-map-filter="restaurant">FOOD</button><button data-map-filter="bank">BANKS</button><button data-map-filter="hospital">HEALTH</button><button data-map-filter="public">PUBLIC</button><button data-map-filter="mechanic">MECHANICS</button><button data-map-filter="fuel">FUEL</button><button data-map-filter="transport">TRANSPORT</button><button data-map-filter="barber">BARBERS</button><button data-map-filter="pharmacy">PHARMACY</button><button data-map-filter="landmark">LANDMARKS</button>
      </div>
    </div>
    <div class="world-map-layout">
      <div class="world-map-frame"><canvas id="city-world-map" width="1100" height="760" aria-label="Interactive Naija City map. Pan, zoom and select locations."></canvas>
        <div class="world-map-zoom"><button data-map-action="zoom-in" aria-label="Zoom in">+</button><button data-map-action="zoom-out" aria-label="Zoom out">−</button><button data-map-action="recenter" aria-label="Center on player">◎</button></div><span class="world-map-north">N ↑</span>
      </div>
      <aside class="world-map-info"><small id="world-map-district">CITY OVERVIEW</small><h3 id="world-map-place-title">Select a location</h3><p id="world-map-place-description">Choose a map symbol to inspect a destination.</p><div class="world-map-status" id="world-map-place-status">MAP LOCATION</div><button id="world-map-set-waypoint" disabled>SET GPS DESTINATION</button><div class="world-map-distance" id="world-map-distance">Your position is shown by the white arrow.</div><div class="world-map-legend"><b>MAP LEGEND</b><span><i class="legend-enterable"></i> Enterable building</span><span><i class="legend-exterior"></i> Exterior-only location</span><span><i class="legend-player"></i> Your position</span><span><i class="legend-waypoint"></i> GPS destination</span></div></aside>
    </div>
    <footer class="world-map-footer">CITY ATLAS · SCHEMATIC ROAD VIEW · NORTH UP <span>DRAG TO PAN · PINCH/WHEEL TO ZOOM</span></footer>`;
  root.appendChild(overlay);

  const canvas=overlay.querySelector('#city-world-map'),ctx=canvas.getContext('2d');
  const search=overlay.querySelector('#world-map-search');
  let records=[],player=[-6.1,.12,-40],heading=0,filter='all',query='',zoom=1,pan={x:0,y:0},selected=null,waypoint=null,drag=null;
  const bounds={minX:-120,maxX:120,minZ:-200,maxZ:500},districts=[
    {name:'YABA',x:0,z:-5,rx:68,rz:155},
    {name:'IKEJA',x:0,z:320,rx:110,rz:150}
  ];
  function visible(){return records.filter(r=>(filter==='all'||r.category===filter)&&(!query||(r.name+' '+r.district+' '+r.category).toLowerCase().includes(query)));}
  function transform(){
    const w=canvas.width,h=canvas.height,m=42;
    const scale=Math.min((w-m*2)/(bounds.maxX-bounds.minX),(h-m*2)/(bounds.maxZ-bounds.minZ))*zoom;
    return {scale,left:(w-(bounds.maxX-bounds.minX)*scale)/2+pan.x,top:(h-(bounds.maxZ-bounds.minZ)*scale)/2+pan.y};
  }
  function point(x,z,t){return {x:t.left+(x-bounds.minX)*t.scale,y:t.top+(bounds.maxZ-z)*t.scale};}
  function updateInfo(){
    const name=overlay.querySelector('#world-map-place-title');if(!name)return;
    const noResults=!selected&&visible().length===0;
    name.textContent=selected?.name||(noResults?'No matching locations':'Select a location');
    overlay.querySelector('#world-map-district').textContent=selected?selected.district.toUpperCase()+' · '+selected.category.toUpperCase():'CITY OVERVIEW';
    overlay.querySelector('#world-map-place-description').textContent=selected?.description||(noResults?'No '+(query||filter)+' locations are registered in the current city build yet.':'Choose a map symbol to inspect a destination.');
    const status=overlay.querySelector('#world-map-place-status');status.textContent=selected?(selected.enterable?'ENTERABLE BUILDING':'EXTERIOR LOCATION'):'MAP LOCATION';status.classList.toggle('is-enterable',Boolean(selected?.enterable));
    overlay.querySelector('#world-map-set-waypoint').disabled=!selected;
    const distance=overlay.querySelector('#world-map-distance');
    if(selected){const d=Math.hypot(player[0]-selected.position[0],player[2]-selected.position[2]);distance.textContent='DISTANCE · '+(d>=1000?(d/1000).toFixed(2)+' km':Math.round(d)+' m');}
    else distance.textContent=waypoint?'GPS · '+waypoint.name:'Your position is shown by the white arrow.';
  }
  function draw(){
    if(overlay.hidden)return;
    const w=canvas.width,h=canvas.height,t=transform();
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#101d1a';ctx.fillRect(0,0,w,h);
    const xy=(x,z)=>point(x,z,t);
    // Subtle topographic grid and district footprints.
    ctx.strokeStyle='rgba(210,220,210,.045)';ctx.lineWidth=1;
    for(let x=0;x<w;x+=55){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=0;y<h;y+=55){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    for(const d of districts){const p=xy(d.x,d.z);ctx.beginPath();ctx.ellipse(p.x,p.y,d.rx*t.scale,d.rz*t.scale,0,0,Math.PI*2);ctx.fillStyle='rgba(77,111,83,.14)';ctx.fill();ctx.strokeStyle='rgba(143,174,135,.2)';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='rgba(210,220,201,.62)';ctx.font='600 14px Arial';ctx.textAlign='center';ctx.fillText(d.name,p.x,p.y-d.rz*t.scale-10);}
    // Local block grids show the structure of each authored neighbourhood.
    for(const d of districts)for(let k=-2;k<=2;k++){let a=xy(d.x-95,d.z+k*42),b=xy(d.x+95,d.z+k*42);ctx.strokeStyle='rgba(190,198,174,.24)';ctx.lineWidth=Math.max(1.3,4*t.scale);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();a=xy(d.x+k*42,d.z-95);b=xy(d.x+k*42,d.z+95);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    // Major bridge spans are measured from the existing Stage 08K road data.
    ctx.strokeStyle='rgba(215,184,120,.68)';ctx.lineWidth=Math.max(2,13*t.scale);let a=xy(705,-700),b=xy(705,-1900);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();a=xy(1159,-724);b=xy(1453,-724);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    if(waypoint){a=xy(player[0],player[2]);b=xy(waypoint.position[0],waypoint.position[2]);ctx.setLineDash([9,8]);ctx.strokeStyle='#ffc76d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);}
    const shown=visible(),clusters=new Map();
    for(const item of shown){const p=xy(item.position[0],item.position[2]);if(p.x<8||p.x>w-8||p.y<8||p.y>h-8)continue;const key=Math.floor(p.x/30)+':'+Math.floor(p.y/30);if(!clusters.has(key))clusters.set(key,[]);clusters.get(key).push({item,p});}
    for(const group of clusters.values()){
      if(group.length>1){const cx=group.reduce((n,v)=>n+v.p.x,0)/group.length,cy=group.reduce((n,v)=>n+v.p.y,0)/group.length,r=Math.min(23,13+Math.log2(group.length)*2);ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#172820';ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle='#e5c27d';ctx.stroke();ctx.fillStyle='#f2e4c6';ctx.font='700 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(group.length),cx,cy);continue;}
      const {item,p}=group[0],meta=CATEGORY[item.category]||CATEGORY.landmark,r=selected?.id===item.id?12:8;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=meta.color;ctx.fill();ctx.lineWidth=item.enterable?3:1.5;ctx.strokeStyle=item.enterable?'#eaffef':'#18231e';ctx.stroke();ctx.fillStyle='#13201b';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(meta.symbol,p.x,p.y+.5);if(selected?.id===item.id){ctx.beginPath();ctx.arc(p.x,p.y,16,0,Math.PI*2);ctx.strokeStyle='#fff0b8';ctx.lineWidth=2;ctx.stroke();}
    }
    const pp=xy(player[0],player[2]);ctx.save();ctx.translate(pp.x,pp.y);ctx.rotate(heading);ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(9,10);ctx.lineTo(0,6);ctx.lineTo(-9,10);ctx.closePath();ctx.fillStyle='#f7f6ed';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#18231e';ctx.stroke();ctx.restore();
    if(waypoint){const p=xy(waypoint.position[0],waypoint.position[2]);ctx.beginPath();ctx.arc(p.x,p.y,13,0,Math.PI*2);ctx.strokeStyle='#ffc76d';ctx.lineWidth=3;ctx.stroke();}
    updateInfo();
  }
  function open(){overlay.hidden=false;window.__NAIJA_RPG_PAUSED__=true;draw();}
  function close(){overlay.hidden=true;window.__NAIJA_RPG_PAUSED__=false;}
  function setData(next){records=Array.isArray(next)?next:[];draw();return records.length;}
  function setPlayerPosition(next,nextHeading=heading){if(Array.isArray(next)&&next.length>=3)player=next.slice(0,3);if(Number.isFinite(nextHeading))heading=nextHeading;draw();}
  function setWaypoint(){if(!selected)return;waypoint=selected;window.__NAIJA_SET_WAYPOINT__?.(selected);updateInfo();draw();window.__NAIJA_RPG_UI__?.showToast?.('GPS DESTINATION · '+selected.name.toUpperCase());}
  overlay.addEventListener('click',e=>{
    if(e.target.closest('[data-map-close]')){close();return;}
    const f=e.target.closest('[data-map-filter]');if(f){filter=f.dataset.mapFilter;overlay.querySelectorAll('[data-map-filter]').forEach(b=>b.classList.toggle('active',b===f));draw();return;}
    const act=e.target.closest('[data-map-action]');if(act){if(act.dataset.mapAction==='zoom-in')zoom=Math.min(10,zoom*1.25);if(act.dataset.mapAction==='zoom-out')zoom=Math.max(.65,zoom/1.25);if(act.dataset.mapAction==='recenter'){zoom=1;pan={x:0,y:0};}draw();return;}
    if(e.target.closest('#world-map-set-waypoint'))setWaypoint();
  });
  search.addEventListener('input',()=>{query=search.value.trim().toLowerCase();selected=null;draw();});
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y,moved:false};canvas.setPointerCapture?.(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;if(drag.moved){pan.x=drag.px+dx*1.5;pan.y=drag.py+dy*1.5;draw();}});
  canvas.addEventListener('pointerup',e=>{if(!drag)return;if(!drag.moved){const r=canvas.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*canvas.width,py=(e.clientY-r.top)/r.height*canvas.height,t=transform(),groups=new Map();for(const item of visible()){const p=point(item.position[0],item.position[2],t);if(p.x<8||p.x>canvas.width-8||p.y<8||p.y>canvas.height-8)continue;const key=Math.floor(p.x/30)+':'+Math.floor(p.y/30);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({item,p});}const hits=[...groups.values()].map(group=>({group,x:group.reduce((n,v)=>n+v.p.x,0)/group.length,y:group.reduce((n,v)=>n+v.p.y,0)/group.length})).sort((a,b)=>Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py));const hit=hits[0];if(hit&&Math.hypot(hit.x-px,hit.y-py)<26){if(hit.group.length>1){const factor=1.8;zoom=Math.min(10,zoom*factor);pan.x=canvas.width/2-(hit.x-canvas.width/2)*factor;pan.y=canvas.height/2-(hit.y-canvas.height/2)*factor;selected=null;}else selected=hit.group[0].item;}else selected=null;draw();}drag=null;});
  canvas.addEventListener('pointercancel',()=>{drag=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.65,Math.min(4,zoom*(e.deltaY<0?1.12:.89)));draw();},{passive:false});
  return {open,close,setData,setPlayerPosition,setWaypoint,getState:()=>({count:records.length,visible:visible().length,filter,zoom,heading,selected:selected?.id||null,waypoint:waypoint?.id||null})};
}
