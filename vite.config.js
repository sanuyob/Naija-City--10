import { defineConfig } from 'vite';

// The standalone PlayCanvas runtime is intentionally kept as a lazy game chunk.
// A 1,200 KiB per-chunk warning threshold is paired with stricter CI budgets:
// 50 KiB for the initial entry and 1,400 KiB / 400 KiB gzip for all JS.
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1200
  }
});
