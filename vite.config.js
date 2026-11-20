import { defineConfig } from 'vite';

// The standalone PlayCanvas runtime is intentionally kept as a lazy game chunk.
// CI enforces a 1,560 KiB maximum JS chunk, plus initial-entry and total gzip budgets.
// Keep the warning slightly above the hard CI ceiling so the analyzer gives the actionable failure.
export default defineConfig({
  // GitHub Pages serves project sites beneath /<repository>/.
  base: process.env.GITHUB_ACTIONS ? '/Naija-City--10/' : '/',
  build: {
    chunkSizeWarningLimit: 1600,
    minify: 'terser',
    terserOptions: { compress: { passes: 8, pure_getters: true, toplevel: true }, mangle: { toplevel: true } }
  }
});
