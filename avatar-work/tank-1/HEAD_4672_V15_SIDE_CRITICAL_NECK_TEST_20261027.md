# Tank 1 V15 side-profile test — October 27, 2026

Owner reviewed V11 Android screenshots at 11:51 PM and said: "From the front it looks close, but side is critical. Running out of Astra buddy." Confirmed front size/position stays. Work done in *local, isolated Blender environment* from exact V11 saved file, originals untouched.

## Verified edits
- Investigated actual 4672 scan: **49,900 open boundary edges across 3,066 disconnected boundary components**. The imported photogrammetry head cannot be joined seamlessly by only stretching a simple neck collar; previous V9–V11 neck wedges created visible bad geometry.
- Kept **V11 head placement exactly**: head location (x=0, y=+0.062 m, z=-0.002 m) relative to V9. No new head forward/backward shift made in V15.
- Removed and rebuilt the 672-face auxiliary V9/V10 neck extension **from the torso's genuine 57-vertex / 56-edge base boundary**, reconstructing clean 12 quad rows (684 vertices) with stable correspondence and smoothing the original source's exceptionally low rear notch. Preserved the body's 10,053 original vertices and its original image atlas unchanged.
- Trimmed **2,900 damaged lower scan faces only** while retaining the original jaw profile above. New neck is sewn to original *body*, but still **NOT welded to scanned head**. Remaining damaged strip behind hair, jaw shading transition and poor dress neckline are visible.
- Kept 52-bone armature, separate dress and straps.
- New candidate files in user's ChatGPT conversation: `Tank1_4672_V15_CleanNeck_Profile.blend`, `Tank1_4672_V15_CleanNeck_Profile.glb` (16,821,660 bytes, sha256 `386dac37894ce516353250849e580deee4eb51dec551cfcc01708998712d0ec7`), phone-friendly self-contained `Tank1_4672_V15_NeckContour_TEST_Viewer.html` (22,436,534 bytes; embeds exact GLB SHA). Real Blender side render `Tank1_4672_V15_Side_QA.png`.
- Verified full Blender exported/reimported 52 bones, unchanged body image atlas SHA-256 `b2a6ac8cd4f9febdb447368e29c76cd68410bb66e46d9dcfa2d5f75126eea8fc`, JS syntax with Node, and self-contained HTML exact embedded binary.

## Caution and next
This is a **TEST**, not finished or owner-approved. The source head scan has major broken topology; rear neck strip still visibly rough. Need actual scan-remesh/topological welding and neck material finish, then Android side profile validation. Prior V11 preserved as rollback. **Flat 03 not to be installed until head finished and owner approves.** New GLB, Blender and viewer files are attached only in ChatGPT, not uploaded to GitHub or site. No main/production deployment under Issue #29 freeze.
