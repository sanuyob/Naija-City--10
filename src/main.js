import './style.css';
import { mountAssetInventory } from './asset-inventory.js';

// Mount the inventory before loading the heavier 3D engine so it always works independently.
window.__NAIJA_ASSET_INVENTORY__ = mountAssetInventory();

const statusLabel = document.getElementById('status');
const perfToggle = document.getElementById('perf-toggle');
const perfPanel = document.getElementById('perf-panel');
const assetStatusLabel = document.getElementById('asset-status');

async function start() {
  statusLabel.textContent = 'Loading driving scene…';
  // The PlayCanvas runtime is fetched only after the small page shell is ready.
  const { startGame } = await import('./game.js');
  await startGame({ statusLabel, perfToggle, perfPanel, assetStatusLabel });
}

start().catch(error => {
  console.error('Naija City Drive failed to start:', error);
  statusLabel.textContent = `Could not start the 3D scene: ${error.message}`;
});
