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

## User supplied 5 new photos; urgent build handoff (2026-10-23)
- Five real reference images attached in chat and accessible to local image-processing environment; **not** yet transferred into GitHub Actions. No build has used these five. Do not misrepresent status.
- Use frontal pink-background portrait as main facial geometry/texture reference, dark-background pink-outfit photo as second frontal angle, yellow dress and gold outfit as 3/4/profile; composite as body/hair reference.
- Preserve existing full-body Brooke 2.0 clone and protected Sophie 1. Do not switch viewer to standalone gray photo head.
- GitHub photo workflow now fails closed unless supplied explicit photo_url (commit 99d010bb5e13cdfc8bccc5105cd5e94747dc8197); **the next actual task is to get user-provided reference photos into the build runner, then construct/fuse facial geometry and inspect a rendered full-body result**.
- User has explicitly demanded actual build rather than repeated plans; do not claim completed work without a validated viewer.

## Face-fitting attempts and corrections — 2026-10-23 (late)
- New five user-supplied photo files received in chat (4105.jpg, 4106.jpg, 4107.jpg, 4108.jpg, 4109.jpg). These were **not** imported into GitHub Actions. Do not claim any GitHub-generated model used them.
- A local photographic curved face-surface candidate was reported as `brooke_photo_face_reference.glb`; it is **not** a verified anatomical head or full-body character. Do not equate this with a successful Brooke likeness.
- Added guarded full-body candidate fitter `avatar-work/brooke-2.0/fit_photo_face_to_body.py` at commit `f40e9fc7ec87d52e0221410c25a695da422f95e9`. It overlays a face surface; it does not morph the original head topology or transfer skinning weights. **Unverified.**
- Updated `.github/workflows/brooke-2-0.yml` at commit `22482e1f877a12a08e8650e127e71c3ac1e99414` to invoke fitter against existing `public-models/brooke-2.0-photo-head-candidate.glb` (older public photo), not the user's five new photos. A commit can trigger workflow but does NOT establish that it succeeded. **Run result not verified.**
- Critical recurring errors: wrong reference photo; separate gray head substituted for complete body; treating GitHub green checks as visual success; missing photo input transfer; not verifying runner outputs; failure to update this file immediately.
- Mandatory next checks: inspect latest GitHub Actions job result and artifact; visually inspect a rendered FULL-BODY candidate; ensure actual five user-supplied photos are used; fit to existing rigged head instead of overlay; protect Sophie 1; log each outcome immediately.
- Current approved browser viewer remains FULL-BODY BASELINE only: https://raw.githack.com/copperisbetter-lang/Wvlrp/brooke-2-0-fresh-start/avatar-work/brooke-2.0/viewer.html?fullbody=83787d3e8810
- Status: **BROOKE LIKENESS NOT COMPLETE; FITTING NOT VERIFIED; DO NOT CLAIM DONE.**

## NON-NEGOTIABLE RECORDKEEPING RULE — user directive 2026-10-23
Document **EVERYTHING**, not just noteworthy changes: every build started, failed build, green/successful build, skipped build, retry, model revision, asset change, viewer change, link, workflow, screenshot complaint, attempted fix, and test. No exceptions for green runs. Record each attempt separately; never overwrite or erase failures.
For each event record: local timestamp (or clearly marked unknown), Gater/operator, branch, commit SHA, GitHub Actions run/job URL or ID, source photo(s) and model versions, exact command/change, outcome (queued/running/failed/green/visually approved/rejected), actual visual QA, user's complaint, next corrective action, working viewer URL and model path. Mark any unknowns as UNKNOWN, never invent evidence.
**Green CI is NOT visual approval.** Do not mark a model completed until visually inspected and user-approved. Keep Sophie 1 untouched. Do not reuse a failed approach without noting what was changed to address its root cause.
At every change: update this record immediately in the same work sequence. At every run: log start and finish, even if the result is green. Cross-Gater handovers must link this record in issue #29.
Historical note: Earlier builds were not consistently documented; history may be incomplete. Do not fabricate missing run numbers or statuses. Backfill verified GitHub records when available.

## Review gate — 2026-10-23
- User requested Brooke's face ready to review. NOT READY. Inspected local artifacts: `brooke_photo_face_reference.glb` is 11,211-vertex curved photographic surface, NOT anatomical head; `brooke-photo-head-candidate.glb` is older 3DDFA candidate and NOT proven to use five new references. Neither may be presented as completed face on full body.
- Existing full-body baseline remains preserved. Block release of any viewer update until actual photo-derived head is fitted, visually inspected, and correctly identified as candidate.
