# The Wild — Realistic Woodland Pass (October 14, 2026)

## Current project truth
- The **ten-acre village inspection circle** remains free of the retired generic/procedural trees, weeds and old square clutter. Do not silently bring those back.
- The **three-acre village section** has 59 planned peripheral PBR tree placements. Existing real-model library is limited: ten independent GLBs overall, but just four commonly used broadleaf silhouettes. The approved summer-green leaf color and detailed bark must be preserved.
- `wild-village-pbr-grove.js` now chooses source models using nearby-clone penalties plus usage balancing. Browser-cache tags were incremented in `walk.js` and `walk.html`.
- Exact 49 planned broadleaf placements evaluated with the four available broadleaf GLBs distribute 13/12/12/12, instead of clustering the same source at neighboring trunks. This is a distribution improvement, **not** proof of 15 genuine West Virginia tree species.
- New `wild-village-pbr-floor.js` plans genuinely licensed detailed ferns, forest rocks, weathered stumps and fallen wood around the three-acre perimeter, never in the plaza or across buildings, paths, campfire, or mountains.
- Deterministic placement checks: 69 placements on mobile and 101 on desktop with test seed 24681357, zero path/plaza/building violations in a pure JavaScript geometry smoke test. The test file in `tests/wild-village-pbr-floor.test.mjs` also includes bounds, quotas and renderer integration assertions.
- New `.github/workflows/install-wild-village-forest-floor.yml` is configured to fetch / verify CC0 source models from Poly Haven, optimize as local GLBs and commit a manifest.
- **NOT YET VISUALLY VERIFIED:** At this checkpoint, `assets/village-floor-sources.json` and binary GLBs had not been observed in the repository. The optional renderer must report `awaiting-real-assets` without adding fake placeholders. This phase is not represented as fully planted until real binaries arrive and browser diagnostics confirm it.

## Remaining production work
1. Observe the actual `install-wild-village-forest-floor` action result, inspect logs if needed, and verify new local GLB files + manifest on GitHub. Reload the beta walk and check `window.__wildDiagnostics()` for `villageFloorStatus`, `villageFloorDetailsPlanted` and `villageFloorByType`.
2. Test on the working Samsung S9 and the user's arriving Galaxy A17 8GB. Measure FPS, memory and stalls rather than downgrading textures by assumption. The original overloaded phone is not the authoritative performance benchmark.
3. Secure multiple **actually West Virginia-representative** PBR oak, maple, beech, hickory, poplar, birch and hemlock meshes (with genuine source licensing); current imported island/broadleaf trees are visual stand-ins, not botanical matches.
4. Source and test an actual drooping-leaf willow for the square before retiring the existing imported center test tree. Leave the plaza paths and campfire clear.
5. Extend high-realism ecology into the remainder of the ten-acre exclusion, then connect it to three-acre streamed wilderness sections without full-view reloads. Do not turn old generic models back on as a shortcut.
6. Keep adult avatar Carol independent of the outdoor landscape work; do not alter unrelated character builds while fixing foliage.

Source references:
- https://polyhaven.com/a/fern_02
- https://polyhaven.com/a/rock_moss_set_01
- https://polyhaven.com/a/tree_stump_01
- https://polyhaven.com/a/dead_tree_trunk
