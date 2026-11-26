import { defineConfig } from 'vite';

// The standalone PlayCanvas runtime is intentionally kept as a lazy game chunk.
// CI enforces a 1,650 KiB maximum JS chunk and 450 KiB total gzip budget for the mobile Yabaâ€“Ikeja game.
// Keep the warning slightly above the hard CI ceiling so the analyzer gives the actionable failure.
export default defineConfig({
  // GitHub Pages serves project sites beneath /<repository>/.
  base: process.env.GITHUB_ACTIONS ? '/Naija-City--10/' : '/',
  build: {
    chunkSizeWarningLimit: 1650,
    minify: 'terser',
    terserOptions: { compress: { passes: 12, pure_getters: true, toplevel: true, drop_console: true }, mangle: { toplevel: true } }
  }
});
{­²Ö­ºÍ