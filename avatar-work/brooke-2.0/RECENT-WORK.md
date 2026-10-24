# Brooke 2.0 — RECENT WORK / PINNED LINKS
Updated 2026-10-23

## Permanent links
- Working branch: https://github.com/copperisbetter-lang/Wvlrp/tree/brooke-2-0-fresh-start/avatar-work/brooke-2.0
- Current baseline viewer: https://raw.githack.com/copperisbetter-lang/Wvlrp/brooke-2-0-fresh-start/avatar-work/brooke-2.0/viewer.html
- Original approved Sophie 1: world-creator/assets/sophie-1-native-fit.glb (NEVER MODIFY)
- Independent clone: avatar-work/brooke-2.0/brooke-2.0.glb
- Photo-derived Laura checkpoint: world-creator/LAURA_FACE_SAVED_AND_CLONED_2026-10-21.md
- Laura original: https://wvlrp.com/laura-face-original-2026-10-21.html
- Laura 2: https://wvlrp.com/laura-2-face-viewer.html

## Confirmed
- Independent full-body clone is a byte-identical Git blob to Sophie 1.
- Existing Laura photo-derived model is stored as ten .b64 parts, and its checkpoint confirms it is a PARTIAL FACE SHELL, not a rigged head.
- 3DDFA_V2 sample export worked but its sample initially produced THREE faces; single-face fix exists but verification is outstanding.
- KeenTools script requires private reference images, an API key, and explicit paid-download authorization; do not run it without consent.
- Blender shape-key script is an unverified exploratory proportional edit, NOT the approved Laura photo workflow.

## Next build: photo-derived face to body
1. Preserve all original files. Do not replace Sophie 1 or Laura checkpoints.
2. Use user's five new Brooke references (front and profile) as photo-to-3D inputs only after they are available to the actual build environment.
3. Identify which tool created approved Laura likeness; do not conflate 3DDFA sample success with the approved Laura face.
4. Build and validate one coherent face mesh, then align to clone's neck, eyes, skeleton; retain dropdown animation controls.
5. Produce screenshots from three angles for user review before claiming resemblance.

## Blocking issues
- Brooke reference photos are in chat but have not been staged as local/private build inputs.
- Approved Laura reconstruction provenance is not conclusively established from current GitHub records.
- No verified photo-derived Brooke 2.0 face yet.

## 2026-10-23 latest instruction
- User confirmed GREEN eyes for Brooke 2.0. All new Brooke eye materials must be green; do not use blue iris placeholder from older Brooke prototype.
- User provided screenshots of Laura 2 face viewer from front and both profiles; use Laura's photo-derived single facial shell as quality reference, not her identity geometry.
- Existing Brooke 3DDFA workflow is at .github/workflows/brooke-photo-3ddfa.yml on main. Reuse the one-face detection patch and validation gates. No unverified likeness claims.

## Latest build update — 2026-10-23
- Committed workflow change `21edc03bea5e54d4fe6f14fa92a53a8e32a9fb36` to `.github/workflows/brooke-photo-3ddfa.yml` on branch `brooke-2-0-fresh-start`.
- Workflow now has branch-scoped push trigger for Brooke 2.0 updates; retains existing public photo URL as fallback. Uploaded reference photos have NOT been wired into the runner.
- Build status: workflow success not yet verified; no finished photo-derived Brooke head or validated facial morph. Do not claim otherwise.
- Workflow URL: https://github.com/copperisbetter-lang/Wvlrp/actions/workflows/brooke-photo-3ddfa.yml
- Approved Sophie 1 remains untouched; working viewer URL unchanged.

## Visual rejection — 2026-10-23, Brooke 2.0 photo head candidate
- User inspected published `public-models/brooke-2.0-photo-head-candidate.glb` in phone viewer and rejected it.
- Screenshot: gray untextured head; eyes closed; nose distorted; underside of chin exhibits severe striped artifacts; no recognizable Brooklyn Decker likeness. Not approved. Do NOT treat GitHub Actions success as appearance/likeness validation.
- Run #19 `https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40050561423` generated a technically valid but visually unacceptable candidate.
- Viewer `https://raw.githack.com/copperisbetter-lang/Wvlrp/brooke-2-0-fresh-start/avatar-work/brooke-2.0/viewer.html` currently shows rejected candidate; do not present as finished.
- Required: rebuild from better user-provided multi-view photos with photographic texture and open eyes, compare against approved Laura 2 photo-derived result; preserve Sophie 1 untouched.

## Full-body face-morph build — 2026-10-23
- User requires facial morph on existing Brooke 2.0 full-body Sophie clone, NOT separate gray head.
- Updated `.github/workflows/brooke-2-0.yml` at commit `6cf405c2df53d44b2866bfa955fdc658edebd835` to publish `avatar-work/brooke-2.0/brooke-2.0-face-pass1.glb` after sculpt.
- Shape-key script `build_face_pass1.py` is a guarded **basic jaw/temple proportional pass**, not verified Brooklyn likeness; may fail if separate head mesh is not found. Must inspect run and model before approval.
- Sophie 1 original and Brooke 2.0 baseline unchanged. Current full-body baseline viewer: https://raw.githack.com/copperisbetter-lang/Wvlrp/brooke-2-0-fresh-start/avatar-work/brooke-2.0/viewer.html
