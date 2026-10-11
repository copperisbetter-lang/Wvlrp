# WVLRP World Creator — Amy and Christy Map Checkpoint
October 11, 2026

## User-approved request
Amy's redheaded adult figure looks good **for now**. Add both Amy and **Christy** (the existing Chrissy-source figure, shown to the user as Christy on the map) to The Wild / World Creator map. Do not delete or change Riley, the Ranger Station, deer, or other world content. The characters are test avatars, not permanent world NPCs.

## Implemented (GitHub main)
- Model source files: `world-creator/assets/amy-mpfb-trial.glb`, `world-creator/assets/chrissy-mpfb-trial.glb`. Both were confirmed as existing GitHub assets.
- `world-creator/world-core.js`: two starter objects at world coordinates **Amy (-70, 18)**, **Christy (70, 18)**, with unique stable IDs, and saved `modelKey` values `amy` and `chrissy`. `addTestCharacters(world)` is idempotent, preserving all prior placements.
- `world-creator/studio.js`: one-time localStorage migration adds missing characters to existing saved world only once; all prior objects remain. Built-in rigged GLB fetching and 3D importing works independently for three model keys (Riley, Amy, Chrissy); MPFB idle animation can play. World-map labels display even when zoomed out. Find buttons select and frame the exact characters; model file caching reduces duplicate requests.
- `world-creator/index.html`: explicit **Find Amy — 3D** and **Find Christy — 3D** buttons, two new character presets, and explanatory labeling. Updated JS query string to refresh cached clients.
- `world-creator/tests/world-core.test.mjs`: tests cover one-time insertion, JSON serialization, no duplication, preservation of deer and structures, and existing custom Amy object.
- `world-creator/AMY-CHECKPOINT-2026-10-11.md`: pre-existing character design checkpoint retained.

## Verification and limitations
- Connected GitHub API verified each updated source file and both GLB paths.
- JavaScript parser check passed for `world-core.js` and `studio.js` after removing import/export syntax for parsing.
- Executed core logic test in JS: first installation adds two models with correct keys, repeat adds zero, JSON round-trip keeps both model keys, and deer coordinates remain identical.
- Live wvlrp.com page and in-browser 3D appearance **not verified** by automated browser in this session; do not overclaim actual loaded mesh appearance.
- This is **local device/browser world editor persistence**, not Oracle-backed multi-user game publishing. Deleting a character or importing different JSON in a browser can intentionally change the local saved world.
- If the user later decides to change spelling from Christy to Chrissy, preserve model identity and confirm before changing the map label.

## Link
https://wvlrp.com/world-creator/
