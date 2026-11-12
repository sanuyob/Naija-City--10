import './style.css';
import { mountAssetInventory } from './asset-inventory.js';
import { mountRPGInterface } from './rpg-ui.js';
window.__NAIJA_ASSET_INVENTORY__ = mountAssetInventory();
window.__NAIJA_RPG_UI__ = mountRPGInterface();
const statusLabel=document.getElementById('status')||document.createElement('div');
const perfToggle=document.getElementById('perf-toggle');
const perfPanel=document.getElementById('perf-panel');
const assetStatusLabel=document.getElementById('asset-status');
async function start(){statusLabel.textContent='Loading the city simulation…';const {startGame}=await import('./game.js');await startGame({statusLabel,perfToggle,perfPanel,assetStatusLabel});}
start().catch(error=>{console.error('Naija City failed to start:',error);statusLabel.textContent='Could not start the 3D scene: '+error.message;assetStatusLabel.textContent='Environment startup failed — see browser diagnostics.';assetStatusLabel.dataset.state='error';});