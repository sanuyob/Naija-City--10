# Local work not yet present in the game browser — 26 November 2026

## Browser baseline

The currently deployed browser build was built from repository `main` at commit `a108b56` when this audit began. The local branches below diverge from that baseline and have not been included in the live Pages build.

## 1. Environment and street-realism branch

**Workspace:** `/workspace/naija-city`  
**Branch:** `feature/environment-realism-upgrade`  
**Divergence at audit time:** 12 commits ahead of `origin/main`, 3 commits behind it.

The 12 local commits cover:
- A reusable Nigerian Yaba street-asset library and a Yaba Street Life 01 test section.
- Grab3D building modules and city props, with original and mobile-converted GLBs plus source/licence notes.
- Tech props such as a data pad, hologram projector, sci-fi terminal and walkie-talkie.
- Yaba collector/distributor/cross-street widening, selected junctions and an Ikeja junction-geometry pass.
- A general environment-realism review/upgrade.
- A collectible tech inventory and quick-slot prototype.

Seven visual-review images and two small HTML contact/detail sheets were also untracked locally at audit time.

**Integration warning:** this branch updates/reuses `public/assets/curated-buildings` and its manifest. That directory was part of the removed GIDI 02 architecture package and has now been deleted from the cleanup candidate. Do not merge this branch wholesale. Keep the useful street widening, junction and asset-library work, but rebase and repackage the required buildings/props against the new compact procedural Yaba–Ikeja asset layout. Re-check imported asset download sizes, mobile conversion and licences before selecting any assets.

## 2. Stage 08Q audit/batching branch

**Workspace:** `/workspace/Naija-City-08Q`  
**Branch:** `feature/stage-08j-yaba-ikeja-gidi-arterials`  
**Divergence at audit time:** 1 local commit ahead and 3 commits behind its upstream branch.

The unique local commit, `7ed791d Complete Stage 08Q audit, batching and verification`, contains:
- A static-batch candidate/reconciliation audit.
- Yaba and Ikeja daylight screenshots and audit JSON.
- Three-trial benchmark capture summaries and mobile-soak output.
- Unbatched component audit CSV exports.
- Browser/character/vehicle smoke-test improvements.
- A Stage 08Q review exporter and report.

There is also an uncommitted two-line edit in `src/character-ragdoll.js` that changes each elbow hinge lower limit from `-0.40` to `-0.50`. It remains local and is not part of the commit.

**Integration warning:** this branch still carries the older GIDI-arterial branch lineage and stale neighbourhood/expanded-world assumptions. The useful generic static-batching and Yaba/Ikeja audit work should be selectively rebased onto the compact-world branch. The uncommitted ragdoll edit should remain separately reviewed and tested.

## 3. Work performed in this removal task

A separate clean checkout was used at `/workspace/naija-city-gidi-removal`; the two older workspaces above were not altered.

The removal candidate:
- Removes the GIDI 02 world streamer, GIDI terrain/infrastructure and district cell package.
- Removes the GIDI district roads/activity/neighbourhood/interior source systems and their tests/generators.
- Removes the GIDI-specific curated Yaba building/texture package.
- Retains the original compact Yaba starter blockout, its 48 lightweight procedural Stage 08E building placements, the separate Stage 08F Computer Village hero, and the Yaba–Ikeja connector/region.
- Restricts map and player bounds to Yaba/Ikeja.

At the starting commit the two removed asset folders contained 602 tracked files totalling 58,996,579 bytes (56.26 MiB). The current worktree has both directories absent.

## 4. Verification performed

- Stage 08E regenerated 48 procedural building GLBs, 4,497,112 bytes total.
- Stage 08F Computer Village hero regenerated/validated: 9.87 MiB, 10 embedded KTX2 maps, seven PBR materials, three LODs and a separate collision proxy.
- `npm run verify`: passed.
- `npm run build`: passed.
- `npm run analyze:bundle`: passed at 1,599.5 KiB minified / 436.7 KiB gzip total JavaScript, under the configured 1,650 KiB / 450 KiB budgets.
- `npm run test:browser`: passed, including character/vehicle/world smoke and the 20-second low-memory software-rendered Chromium soak. The soak reported no browser/console errors and no positive heap growth. Its frame times are not representative of a physical Android phone.

A real Itel A90 performance/thermal/memory run has not been performed. Browser/SwiftShader figures must not be treated as phone FPS.

## 5. Recommended selective merge order

1. Complete and merge the GIDI removal/compact Yaba–Ikeja baseline first.
2. Rebase generic Stage 08Q batching and Yaba/Ikeja audit scripts onto the new baseline; remove stale GIDI/neighbourhood assumptions.
3. Rebase Yaba road-width/junction improvements selectively; rerun geometry and vehicle collision tests.
4. Select only needed props/modules from the environment-realism branch; regenerate mobile variants and verify licences and total asset budgets. Do not restore `curated-buildings`.
5. Review the elbow hinge-limit change independently with ragdoll regression and mobile browser tests.
6. Run a physical Android acceptance pass after the browser deployment is updated.
