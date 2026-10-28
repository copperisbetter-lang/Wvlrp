# OWNER APPROVED NEXT MILESTONES — Tank 1 head V9 → Flat 03
Recorded October 27, 2026, after owner reviewed the Tank 1 V9 screenshots.

## Explicit owner decision
1. **First FINISH the 4672 head** on Tank 1. Not merely cover the neck seam: make the head/torso join genuinely continuous, preserve the jaw silhouette and natural head proportions, match front and side skin while leaving the body texture untouched, finish dress/straps, and test head/neck rig motion and views from front, sides, back, and under jaw.
2. **Only AFTER Tank 1 head is completed and owner has checked the viewer, install approved paid Flat 03 on Tank 1.** No premature installation or substitution. Flat 03 is vendor Shape 03 from owner's approved three-shape kit.
3. Keep the source SAV4 V21 and Sophie 1 masters unchanged. Preserve Tank 1 V9 and any earlier stages; make a fresh independent working clone/version for each invasive change.
4. Preserve purchased Flat 03 source and its original textures/meshes privately, with no public GitHub binaries until redistribution license is confirmed. Read private asset from authorized owner Library/secure runtime; do NOT substitute Amanda's prior Flat versions or any generic proxy.
5. The fitting must be anatomical, aligned between upper thighs to the correct existing pelvic opening, properly seated without floating slab or oval backing; preserve underlying body/armature/skin and check fit in multiple poses. For final integration, verify compatible UV/materials, skeleton weights/corrective motion, full 3D viewer and export.
6. Work on isolated staging branch and coordinate through GitHub Issue #29. No main/production deployment during freeze.

## Current baseline
- Latest local model: `Tank1_4672_V9_Seamless_Body_Neck.glb`, and `Tank1_4672_V9_Seamless_Body_Neck.blend` plus `Tank1_4672_V9_ConnectedNeck_Viewer.html`, provided to owner in ChatGPT file attachments. These are **not in GitHub**. Latest local work logs and QA paths in `HEAD_4672_V9_CONNECTED_BODY_NECK_20261027.md`.
- Head 4672 is currently rig-attached; torso neckline was extended. **Critical unfinished issue:** head and torso are not yet topologically welded together at the imported scanned jaw/lower neck, and there are still scan edge/skin seam artifacts. Do not assert final readiness.
- Body color atlas is protected byte-for-byte; target head-side color still requires owner validation.
- Dress is rigged, straps were reshaped; device pose checks and final appearance still pending.
- Flat 03 is **NOT installed on Tank 1**. Owner approved *future* installation after head is completed.
- Owner previously has a separate Amanda 1.0 Flat 03 workstream. Reuse findings as technical reference only; do not mistake Amanda model for Tank 1 or copy any flawed fitting unchanged.

## Acceptance checklist for next assistant
- Complete authentic topology join with verified watertight/normal/texture transition and smooth deformation; no detached tube/collar or open jagged underside.
- Render actual mesh in front, both sides, back, under-jaw; verify hairline and neck colors, no stretched textures.
- Test head rotation/tilt and nearby shoulder movement; inspect dress.
- Present viewer to owner and await visual approval on head/neck.
- Only then begin Tank 1's separate Flat 03 installation and QA. Preserve originals and backups.
