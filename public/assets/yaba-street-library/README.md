# Yaba Nigerian street asset library

Reusable asset collection for Naija City's Yaba district. This is a source library and is not yet wired into runtime spawning.

- `grab3d/original/` — 20 downloaded CC0 models, with one full-quality alternate for the produce display and source licence files.
- `grab3d/mobile/` — texture-resized 512px copies for phone-oriented use.
- `grab3d/custom/` — project-authored overhead wire-span asset and its generator.
- `signage/` — eight original Yaba business sign textures.

Start with `grab3d/manifest.json` for source URLs, licence paths and intended adaptation notes. To verify the library, run `node scripts/verify-yaba-street-library.mjs`. To regenerate the custom assets, run `node scripts/generate-yaba-overhead-wire-span.mjs` and `node scripts/generate-yaba-signage-textures.mjs`.

All downloaded models are CC0 1.0. Source licence files are kept with the originals. The original and mobile GLBs have been validated; the mobile variants reduce texture dimensions but do not simplify geometry. Before using these at scale, adapt their appearance to Yaba and measure performance on the target Android device.
