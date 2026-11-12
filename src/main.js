import './style.css';

const statusLabel = document.getElementById('status');
const perfToggle = document.getElementById('perf-toggle');
const perfPanel = document.getElementById('perf-panel');

async function start() {
  statusLabel.textContent = 'Loading driving scene…';
  // The PlayCanvas runtime is fetched only after the small page shell is ready.
  const { startGame } = await import('./game.js');
  await startGame({ statusLabel, perfToggle, perfPanel });
}

start().catch(error => {
  console.error('Naija City Drive failed to start:', error);
  statusLabel.textContent = `Could not start the 3D scene: ${error.message}`;
});
