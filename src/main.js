import './style.css';
import { mountAssetInventory } from './asset-inventory.js';
import { mountRPGInterface } from './rpg-ui.js';
window.__NAIJA_RPG_UI__ = mountRPGInterface();
window.__NAIJA_ASSET_INVENTORY__ = mountAssetInventory();
const statusLabel=document.getElementById('status')||document.createElement('div');
const perfToggle=document.getElementById('perf-toggle');
const perfPanel=document.getElementById('perf-panel');
const assetStatusLabel=document.getElementById('asset-status');
// Start the required player download before the game engine module is imported.
// The loader reuses this cached response instead of issuing a second request.
const araPlayerBundle='assets/hero/Ara_Female_Executive_Animated_Ladder_Mobile.glb.gz';
const araPlayerUrl=new URL(araPlayerBundle,new URL(import.meta.env.BASE_URL||'/',window.location.origin));
window.__NAIJA_ARA_PRELOAD__={url:araPlayerBundle,promise:fetch(araPlayerUrl,{cache:'force-cache'}).then(async response=>{
  if(!response.ok)throw new Error('Ara player bundle HTTP '+response.status);
  return {buffer:await response.arrayBuffer(),transferBytes:Number(response.headers.get('content-length'))||0,contentEncoding:String(response.headers.get('content-encoding')||'').toLowerCase()};
}).catch(error=>{console.warn('Early Ara player download failed; the character loader will retry.',error);return null;})};
async function start(){statusLabel.textContent='Loading the city simulation…';const {startGame}=await import('./game.js');await startGame({statusLabel,perfToggle,perfPanel,assetStatusLabel});}
start().catch(error=>{console.error('Naija City failed to start:',error);statusLabel.textContent='Could not start the 3D scene: '+error.message;assetStatusLabel.textContent='Environment startup failed — see browser diagnostics.';assetStatusLabel.dataset.state='error';});