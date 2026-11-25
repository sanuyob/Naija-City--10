# Yaba Nigerian street asset library

Reusable asset collection for Naija City's Yaba district. This is a source library and is not yet wired into runtime spawning.

- `grab3d/original/` — 20 downloaded CC0 models, with one full-quality alternate for the produce display and source licence files.
- `grab3d/mobile/` — texture-resized 512px copies for phone-oriented use.
- `grab3d/mobile-lite/` — eight geometry-simplified and texture-resized GLBs used by the Stage 08P test section.
- `grab3d/custom/` — project-authored overhead wire-span asset and its generator.
- `signage/` — eight original Yaba business sign textures.

Start with `grab3d/manifest.json` for source URLs, licence paths and intended adaptation notes. To verify the library, run `node scripts/verify-yaba-street-library.mjs`. To regenerate the custom assets, run `node scripts/generate-yaba-overhead-wire-span.mjs` and `node scripts/generate-yaba-signage-textures.mjs`.

All downloaded models are CC0 1.0. Source licence files are kept with the originals. The original, mobile, and mobile-lite GLBs have been validated. The `mobile/` variants reduce texture dimensions only; the `mobile-lite/` set also simplifies geometry and is what the Yaba Street Life 01 scene loads. The runtime smoke test verifies the full and Data Saver paths, and confirms 80 compatible procedural street props are grouped into 11 generated static batches. Before using these at scale, adapt their appearance to Yaba and measure performance on the target Android device.
