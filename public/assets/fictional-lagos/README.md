# Fictional Lagos district asset library

This is a **library**, not a prebuilt scene. It contains 258 licensed GLB models selected for six fictionalized Nigerian districts, plus four shared colour atlases referenced by the models. The models are not loaded by the game at startup.

- `library/asset-library.json` — full index, source URLs, licenses, technical checks and district recommendations.
- `library/asset-register.csv` — portable model asset-rights register.
- `library/texture-register.csv` — shared source-atlas texture register.
- `district-manifests/` — individual asset lineups for Lekki, Ekiti, Eko Atlantic, Victoria Island, Yaba and Alimosho.
- `licenses/` — license text copied from the source archives plus the separate Innerscene CC0 dedication record.

Model payload: 10.97 MiB; four texture atlases: 46.2 KB; combined library: 11.01 MiB. The original source archives are in `asset-sources/fictional-lagos/originals/` at the repository root, outside `public/`, so they are not sent to game clients. Rebuild the curated library with:

```bash
python3 scripts/build-fictional-lagos-library.py
```

Runtime rule: load only the nearby district's selected assets, prefer low-detail variants for distant buildings, and instance repeated props. Do not preload the entire catalog.
