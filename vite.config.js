import { defineConfig } from 'vite';

// The standalone PlayCanvas runtime is intentionally kept as a lazy game chunk.
// CI enforces a 1,650 KiB maximum JS chunk and 450 KiB total gzip budget, measured against the expanded GIDI runtime.
// Keep the warning slightly above the hard CI ceiling so the analyzer gives the actionable failure.
export default defineConfig({
  // GitHub Pages serves project sites beneath /<repository>/.
  base: process.env.GITHUB_ACTIONS ? '/Naija-City--10/' : '/',
  build: {
    chunkSizeWarningLimit: 1650,
    minify: 'terser',
    terserOptions: { compress: { passes: 12, pure_getters: true, toplevel: true, unsafe_arrows: true, unsafe_methods: true, unsafe_proto: true, booleans_as_integers: true }, mangle: { toplevel: true } }
  }
});
[exit status 0]