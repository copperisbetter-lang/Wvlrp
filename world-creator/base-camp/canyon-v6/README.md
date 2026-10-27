# Stacey Lake — approved Canyon V6 game integration

The owner-approved photorealistic Canyon V6 from the 2026-10-27 conversation is installed in this **isolated lake game branch**; production `main` is unchanged.

## Exact GLB asset
- Source: `Stacey_Lake_Waterfall_Canyon_V6_Upper_Ridge_Terrain_DRY.glb`
- GLB bytes: **6,468,040**
- SHA-256: `69d79d22169cdf1f7fc7082e28a6521ad47e98ab397531eb4e6784b6d0b06f22`
- In GitHub, nine binary `canyon-v6/chunk-00.bin` ... `chunk-08.bin` contain consecutive, unmodified byte ranges. The game joins them in order and verifies length, GLB header and SHA-256 before parsing.
- Source mesh is in feet. Game placement: `.scale=.3048`, `.rotation.y=PI/2`, west lake hillside at `(wallX+23,pondY-.5,CZ)`, with canyon facing lake.
- Old procedural exterior cliff (face, ledges, facade rocks) hides **only after** V6 asset successfully loads; on any failure fallback cliff stays.
- Game adds **Canyon** button to teleport to west-bank viewing position.

## Separate game systems, not baked into the GLB
- Two live waterfall meshes aligned to centerlines **25 ft / 7.62 m apart**, shared animated pond and one creek remain separate from rock GLB.
- Lake/shore shader, island, quest-locked Dark and Damp cave and both underwater tunnel routes preserved.
- Shoreline fish/tree/rock systems preserved.

## QA and limits
- All nine Git blobs present with correct sizes and SHA-1 IDs, totaling 6,468,040 bytes.
- Module JS syntax parsed successfully after removing import statements for syntax-only verification.
- Owner viewed/approved V6 canyon via earlier dedicated viewer.
- **In-game browser/phone visual QA and frame rate have NOT been verified.** RawGitHack preview is proposed, not externally confirmed to load. Check loading, west-bank position, waterfall alignment, cave overlap, shoreline occlusion, rock geometry and FPS on A17/A16 before production release.
- Production freeze in Issue 29 respected. Nothing merged/deployed to `main`.

Review game URL: https://raw.githack.com/copperisbetter-lang/Wvlrp/g1/stacey-v6-canyon-install-20261027/world-creator/base-camp/stacey-dive.html

## Android screenshot correction (2026-10-27)
- Owner's 6:25 PM Android screenshots documented a hard left photo-wall seam, old polygon rock portal/stone-ring overlays, obsolete west-bank terrain overlapping the photo-rock GLB, straight-striped waterfalls, and cyan photo sky that did not match the live Three.js sky.
- Updated `stacey-dive.html` in this branch: blended terrain relief carve below V6, hidden legacy wall/ledge/facade rocks and the cave-portal polygon seal when GLB is loaded, suppressed blocky old pond stones and shore clutter in the canyon footprint, changed waterfall sheet shader to animated broken-up turbulent alpha with feathered edges, cross-mesh seam normal averaging, and selective blue photo-sky clipping to expose the live sky.
- Added in-view V6 load/fallback status on the FPS HUD. Original nine GLB chunks and their checksum are unmodified. Lake, fish, island and tunnel quest data remain untouched; cave entrance visual is suppressed under V6, not quest logic.
- Latest reviewed code commit: `b8a741a52d264b20b05f5d519b5ff80c27a33505`; inline JavaScript parses after removing ES module imports.
- **Caution:** This code has NOT been validated by live Three.js render or owner's Android follow-up. In particular, sky blue-color masking and photo seam improvement are experimental and need owner review. Neither main nor production was changed.
- Pinned mobile preview: https://raw.githack.com/copperisbetter-lang/Wvlrp/b8a741a52d264b20b05f5d519b5ff80c27a33505/world-creator/base-camp/stacey-dive.html
