# Stacey Lake complete reference build

2026-10-23 EDT; Gater 3. Owner directs one complete build in one code file based on supplied Stacey design reference. Branch: gator3-stacey-complete-reference. Baseline a563fa19a673bb520557dc4915e74d9b366b4686 remains protected.

Assessment: existing viewer omits all vegetation/background; water uses unrelated HDR, sun uniform not synchronized; rock placement too far inland. Build started: single HTML scene with actual scene reflections, terrain, beach, textured rocks and real tree models, touch walking/swimming and aerial view. Preserve existing approved 45ft / 3.5% shore grading and 69ft clear beach radius; source layouts reconstructed for standalone viewer. No production or trail/avatar edits. Runtime and phone appearance UNVERIFIED. No workflow run triggered intentionally. Bell #29 notified before work.

## Local implementation and checks — 2026-10-23 EDT
- One HTML implemented locally; no published lake code yet.
- First browser setup failed because no Chromium installed; standard download failed (truncated archive). Alternate Chrome headless download succeeded. Initial browser could not access dependencies until configured with environment proxy.
- Water.js source inspected; corrected plane orientation and exact shader injection points before running.
- Runtime check 1: no JS/shader errors; sand, forest floor, water normals, rocks and maples loaded. Software renderer ~20 FPS before full asset rendering; screenshot timed out. Not visual approval.
- Added real pine/fern models, selected fewer tree variants and instancing. Runtime check 2: all seven asset groups loaded without reported errors; 233 trees / 277 rocks, ~7.57 million rendered triangles. Screenshot still pending; performance unacceptable to assume for phone.
- Reduced shoreline rock geometry by vertex clustering while retaining scanned texture; retest running. Existing scenes and production unchanged.

## Complete single-file build committed — 2026-10-23 EDT
- Build commit ef7a5c3db0cbaab3d1b6bdebfa36557c54b727fe.
- Single code entry: world-creator/base-camp/stacey-complete.html. All terrain, island, wooded banks, beach, rocks, plants, water/reflection setup and movement in this file. External Three.js modules and existing real textured models are loaded as assets; no prior experimental water modules used.
- Exact viewer: https://raw.githack.com/copperisbetter-lang/Wvlrp/ef7a5c3db0cbaab3d1b6bdebfa36557c54b727fe/world-creator/base-camp/stacey-complete.html
- Published URL returns HTTP 200 and is byte-identical to local checked HTML.
- Latest runtime reports all texture/model asset groups ready, no reported JS/shader errors, 233 trees / 277 textured stones. Rock geometry reduced from 12,620 to 1,214 triangles per stone. Software screenshot capture previously timed out; final paused-render screenshot check running. No phone FPS or visual acceptance established. Not an exact reproduction claim.
- No production/main merge or Actions deployment requested. All older builds, approved terrain and avatar/trail sources unchanged. This standalone scene reconstructs the approved shore grade and protected beach.
- Next: inspect final beach/aerial captures, then Doug phone review. No claim that green code equals accepted appearance.
