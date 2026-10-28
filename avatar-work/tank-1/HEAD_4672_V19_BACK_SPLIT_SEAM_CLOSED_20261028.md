# Tank 1 V19 — actual back-neck seam closure (2026-10-28)

Owner screenshots from 12:10–12:12 AM (V15) show a pale/straight, jagged, tall neck wall and detached head underside. This is a verified localized geometry repair in an isolated local Blender session; original SAV4 family/approved masters and previous versions unchanged.

## Root cause found
The original 10,053-vertex torso's removed-head boundary was not a simple 56-edge loop. It was a 57-vertex OPEN CHAIN with **six duplicated pairs down the back of the neck** (center x=0, posterior y=.036–.059 m, z=1.345–1.403 m). Previous V9–V17 neck extensions built two overlapping radial strips along that slit, yielding the conspicuous shadowed rear neck sail. Simply adjusting material or normals did not solve it; geometric overlap was confirmed in a no-head material-color diagnostic.

## Verified V19 repair
- Opened preserved **V11** Blender file as source, physically discarded all V9/V10 speculative extension faces (672 quads), retained torso's original body faces.
- Closed six coincident seam vertex pairs using BMesh merge-by-distance on **the working clone only**, creating one genuine closed **46-edge torso neck opening**.
- Stitched 20 new quad rings (920 quads) from this closed loop, tapering in X/Y and gently elevating to sit under purchased 4672 scan. New surface normals oriented outward; original body surface locations tested unchanged using Blender KDTree (distance 0.0 for every original point), except topological merging of six same-position seam pairs.
- Kept 4672 head position at V11 (Y +.062 m, Z -.002 m relative to V9), original face/hair and head-only warm tone. Trimmed 2,900 broken lower photogrammetry faces as in V15, no facial changes.
- Verified **original body texture bytes untouched**: SHA-256 `b2a6ac8cd4f9febdb447368e29c76cd68410bb66e46d9dcfa2d5f75126eea8fc`.
- Verified glTF export/reimport contained **one 52-bone armature** and skinned head/neck. Animated head-bone +18° in Blender: sampled head vertices displaced 10.83–20.16 mm and neck vertices 1.2–1.98 mm. This is a targeted test, not full animation QA.
- New saved local binary `Tank1_4672_V19_BackSeam_Closed.glb` 16,837,432 bytes, SHA-256 `90b4baf8e903ee05d9bc3d386b0f65d0a61f20079c12a68a866e3a248c6c1125`. New editable `Tank1_4672_V19_BackSeam_Closed.blend`. Standalone phone viewer `Tank1_4672_V19_BackSeam_Repaired_Viewer.html` 22,457,570 bytes embeds exact GLB, starts with side view, JS `node --check` passed, embedded hash confirmed. Separate Blender front/side/three-quarter QA from V18 visually identical geometry (V19 corrected weights only).

## Status / boundaries
- **The oversized striped posterior neck wedge is gone in Blender QA.** Actual user Android/WebGL V19 render remains unverified.
- New body neck IS one contiguous torso skin surface, but the purchased **4672 head scan remains separate and NOT topologically welded to the upper neck**; raw photogrammetry underside and outfit neckline still need final repair. Do not claim perfect head transplant or deployment.
- **Flat 03 not installed:** owner-approved sequence explicitly head finished/owner approved first, Flat 03 second. Paid source stays private.
- All artifacts currently downloaded via ChatGPT conversation, not yet copied to GitHub/game as binaries. GitHub Issue #29 production freeze; no main/production deployments.

## Next session
Inspect V19 phone screenshots, keep V11-aligned head location. Continue with actual lower scan edge cleanup/head-to-neck topology and dress neckline only. Never recreate the old double back-slit wedge. Preserve original body color/approved masters.
