# Laura independent head build — 2026-10-20

Status: IN PROGRESS; head GLB and viewer NOT YET VERIFIED.

## Source of truth
- `world-creator/references/sav4-face-reference-2026-10-18.md`
- `world-creator/characters/sav4/laura-two-view-landmarks.json`
- `world-creator/characters/sav4/laura-photo-fit-plan.json`
- `world-creator/scripts/sav4_photo_morph.py`
- `world-creator/scripts/build_sav4_mpfb.py`

Reference stills 5458.jpg and 5459.jpg were supplied in conversation but not committed to repository according to the reference sheet. Do not claim photogrammetric accuracy without the original images and review.

## Build contract
1. Preserve approved SAV4 and CAR5 meshes, textures, clothing and viewers untouched.
2. Create independent adult Laura head asset under `world-creator/assets/laura-head.glb`, with separate `world-creator/laura-head.html` inspection viewer.
3. Use oval face, full upper cheeks, softly tapered jaw, modest rounded chin; slim nasal bridge and rounded tip; almond eyes with pale-blue irises; natural medium-width mouth; fine ash/dusty blonde hair with fringe and face-framing lengths.
4. Solve reviewed landmark-to-mesh vertex correspondences rather than treating 2D pixels as 3D displacements. Preserve reversible morph parameter preset.
5. Include an armature or equivalent expression controls for jaw open/close, smile, blink left/right, wink left/right. Confirm expressions move geometry rather than UI-only toggles.
6. Viewer: front/profile/three-quarter orbit, close-up framing, neutral and expression controls, GLB cache busting, visible failure diagnostics.
7. Validate GLB JSON contains meshes and expression targets or bones; test all controls and screenshot neutral, smile, jaw-open, blink, wink.
8. Only after head approval consider integrating into CAR5; never publish an unapproved head over SAV4.

## Acceptance
A separate downloadable/renderable GLB and functioning independent head viewer; no changes to approved character builds.
