# Stacey Lake V17 — fish restored from approved assets (2026-10-28)

Owner report: "There's no fish in the lake." V16 entrypoint had no fish installer or update loop.

## Starting point / no production change
- New isolated branch: `gater/stacey-v17-fish-restore-20261028` from V16 checkpoint `619ca50ed57486ff844c1cbe395d67ed246e6926`.
- Existing lake water shader, scenery, island, shoreline, cave, waterfall, trail modules, homepage links, RUN/FLY/SWIM/DIVE/SIT controls remain unchanged.
- Production/main is frozen per issue #29 and this branch MUST NOT be merged or deployed without coordination and owner Android QA.

## Restored fish
1. `stacey-bass.js`: owner-directed 250 bass, only large and trophy; embedded GLB original pinned from archival asset-bearing commit `9eb1ce8ee868d0703f52c7fdcd1bff91dc22b932`, path `world-creator/base-camp/assets/fish/model_67a_-_largemouth_bass.glb`. Source behavior preserves swim cycle, mouth-first jump animation and one selected fish jump every 120 seconds. Corrected legacy escaped-literal `\\n` that accidentally commented out pitching assignments. Far-away animation mixers skipped for mobile.
2. `stacey-flatheads-restored.js`: adapted approved 70-catfish viewer behavior; 30 at 40 lb, 30 at 20 lb, 10 at 60 lb. Load original public main-branch `world-creator/assets/flathead-catfish.glb`, near-lakebed cruising, and detailed tail deformation when close to player.
3. `stacey-dive.html`: minimal imports + independent async installers, per-frame updates, fish count HUD, diagnostics `window.staceyFish`. No modifications to water, shore, other worlds.
4. `world-creator/tests/stacey-v17-fish-restoration.test.mjs`: file wiring and asset regression assertions.

## Verification limits
- JavaScript module source syntax checked in V8 after removing import/export declarations.
- GitHub compare should show only added fish modules, one minimal viewer edit, test and this note.
- Model bytes exist in repo trees (18,644,040 bass; 8,129,948 catfish); browser networking/loading and Android GPU playback NOT independently verified.
- Owner must test with DIVE and look down/around to see fish; bass surface jump is intentionally rare (one every 2 min), not an immediate fish-burst test. Confirm bass/flathead counts and FPS in HUD, report errors.
- Preserve approved fish originals and do not claim phone-rendered success until owner says so.

## Viewer
After this note commit, use immutable branch HEAD commit in raw.githack with
`/world-creator/base-camp/stacey-dive.html?spawn=lake`.
