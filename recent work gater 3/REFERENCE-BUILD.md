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
