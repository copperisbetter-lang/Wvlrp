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

## Build attempt — 2026-10-23 late, exact clock time UNKNOWN
- Started actual repo modifications after user explicitly demanded execution, not explanations.
- Commit cff04f0943d17bdfa95b8676ffc2b25e4039dfd7 added verify_face_fit.py structural full-body + candidate-mesh check.
- Commit 3188fedac2207ed4fc0942ac47308851d8d2451e updated .github/workflows/brooke-2-0.yml to run verifier after fitting. Push should trigger GitHub Actions, run status UNKNOWN, output not inspected. **Do not report success.**
- Limitation: fitting source remains older public photo candidate; five latest user photos still not incorporated. This is structural safety work, NOT Brooke likeness completion.
- Next: obtain verified workflow logs and integrate user photos into real reconstruction. No preview approved.

## Verified screenshot results — 2026-10-23 22:39 user-local screenshot
- GitHub Actions Brooke 2.0 Isolated Face Pass run #19 (commit 213e2fb): RED X / FAILED, duration 1m20s. Actual failure step/log UNKNOWN (not yet obtained). Never call green.
- GitHub Actions Brooke 2.0 Isolated Face Pass run #18 (commit 4499a03): RED X / FAILED, duration 1m18s. Actual failure step/log UNKNOWN.
- No new face viewer is available. Previous baseline viewer is NOT a valid link to either run. Do not send baseline as new result.

## Verified log diagnosis and recordkeeping correction — 2026-10-23 22:50 EDT
- Operator: Gater 1 / current chat. Branch: brooke-2-0-fresh-start.
- User complaint: NumPy has been flagged repeatedly on prior builds; treating this recurring dependency failure as a new discovery and failing to keep this record current is unacceptable.
- Recordkeeping admission: this chat had NOT updated Recent Work before the user asked. This entry records that lapse; do not claim continuous updates.
- Verified latest Isolated Face Pass run #20: FAILED. Commit: 85320e2a8a20106d763887bf17169c68922b70ae.
- Run: https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40055096371
- Job: https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40055096371/job/120756233996
- Successful steps: checkout and Install Blender. Failed step: Fit photo-derived face candidate onto existing full body.
- Actual error from job logs: ModuleNotFoundError: No module named 'numpy', raised by Blender 4.0.2 glTF importer at import numpy as np while importing the body. Exit code 1.
- Command: blender -b --python-exit-code 1 --python avatar-work/brooke-2.0/fit_photo_face_to_body.py -- avatar-work/brooke-2.0/brooke-2.0.glb public-models/brooke-2.0-photo-head-candidate.glb avatar-work/brooke-2.0/brooke-2.0-face-fit-candidate.glb
- Artifact upload, structural verification, face pass creation and publication were SKIPPED. No new model or reviewable viewer produced; no visual QA possible.
- Inputs: existing Brooke 2.0 full-body baseline and older public photo head candidate. No evidence this run used the user's five new photos.
- Required correction: repair the Blender Python dependency environment permanently and add a NumPy import preflight executed INSIDE Blender before model operations in every affected workflow. Not implemented in this chat as of this entry.
- Prior runs #18 and #19 remain screenshot-confirmed failures; their individual logs have NOT been inspected in this chat. Do not assume their cause from #20.
- Viewer status: existing baseline only, NOT output from failed run #20. Pinned baseline: https://raw.githack.com/copperisbetter-lang/Wvlrp/brooke-2-0-fresh-start/avatar-work/brooke-2.0/viewer.html?fullbody=83787d3e8810
- This update changes documentation only; commit uses [skip actions] to avoid triggering another model build for a log update. No retry started, no dependency fix or model edit claimed. Sophie 1 untouched.

## 24-hour audit completed — 2026-10-23, after 22:50 EDT
- Doug directed a full retrospective BEFORE further Brooke model work. Model work remains paused in this chat.
- Full report: [BROOKE_24H_FAILURE_AUDIT_2026-10-23.md](https://github.com/copperisbetter-lang/Wvlrp/blob/brooke-2-0-fresh-start/avatar-work/brooke-2.0/BROOKE_24H_FAILURE_AUDIT_2026-10-23.md)
- Audited window: October 22 22:50 to October 23 22:50 EDT. Enumerated all 390 retained repository runs in window; selected 163 Brooke-named/on-Brooke-branch runs: 65 failed, 82 green, 16 cancelled. Fourteen failed World Creator checks are adjacent terrain/trail checks; direct Brooke workflow failures = 51.
- Read all 65 failed-job logs, all 82 green-run logs, all selected job summaries, current workflow/scripts, older recovery notes, and Bell history.
- VERIFIED repeated failures: 29 missing Blender NumPy, 10 missing authorized photo URL, 5 publication merge conflicts, 2 wrong mesh selection, 2 renderer aborts, 1 installation timeout, 1 protected-region assertion, 1 missing photo/landmark readiness; plus 14 adjacent terrain/trail failures.
- CRITICAL: 8 green reconstruction runs contain AssertionError: Photo-derived vertices missing/altered: 38365. Geometry validator Blender invocation lacks --python-exit-code 1. Green CI did not establish successful validation.
- CRITICAL: current workflow fits/verifies face-fit-candidate, then build_face_pass1.py reloads baseline brooke-2.0.glb rather than fitted candidate. This disconnect can discard fitted work. Current fitter is an overlay, not a rigged anatomical head morph.
- Known NumPy preflight exists in prototype workflow but is missing from new 2.0 face-pass workflow; repeated workflow replacement failed to carry known fixes forward.
- Recovered 1.1 Pass 2/3/4 immutable checkpoints and Pass 7 CURRENT_STATUS on its separate branch. Do not confuse unvalidated viewer-only edits or baseline with a baked, approved model.
- Report includes complete chronological 163-run register, every failed-job entry with logs/steps, cancelled runs, visual/delivery failures, Bell evidence, and concrete acceptance gates before any further build.
- Audit is documentation, not a dependency/model fix. All root-cause fixes remain PENDING. No new build, retry, model edit, viewer change, merge or deployment performed.
- Bell audit check-in: https://github.com/copperisbetter-lang/Wvlrp/issues/29#issuecomment-6379013506 . Posting does not establish other Gaters read it.
- Read this audit and exact checkpoint/source inputs BEFORE next action; do not repeat a failed signature without recording a root-cause correction. Keep latest green-eye instruction and protect Sophie 1 / retained Brooke checkpoints.
- Audit documentation commit uses [skip actions] so recording failures does not trigger the same broken model workflows.

## Audit-driven build repair started — 2026-10-23 23:09 EDT
- Doug explicitly resumed work after audit: use documented lessons and produce verified clean builds. Bell check-in: https://github.com/copperisbetter-lang/Wvlrp/issues/29#issuecomment-6379055525 .
- Recovered and visually inspected five newer photos; Doug then supplied ten images directly. All ten were validated locally, exact SHA256 and dimensions recorded in REFERENCE_INPUT_IDENTITIES.json. Primary neutral front: 3948.jpg; clear side profile: 3949.webp. Actual image bytes remain local, NOT transferred into GitHub Actions or publicly committed. No claim reconstruction used these photos.
- Recovered Pass 4 model at immutable commit 8a0e6665a533280ad77ae6b36e8e1557218a8ee5 for reference only; did not replace baseline or modify Sophie 1.
- Local environment attempts: apt installation initially failed due unavailable privilege switching; second attempt failed on package-cache permissions/restricted snapshot.ubuntu.com network. A pip bpy==4.2.22 attempt returned no matching distribution. No Blender model build ran locally; do not describe local Blender tests as passed. Verification will run on GitHub's supported Ubuntu runner.
- Actual code fix: build_complete_head.py used scale=1/width and unscaled translation (-cx,-cy,-rear). Corrected translation to (-cx/width,-cy/width,-rear/width). Validator now uses a 0.0001 distance tolerance rather than unstable rounded coordinate bins. Both source preservation and manifold checks remain enforced.
- Shared Blender installer now installs python3-numpy and renderer dependencies, then imports NumPy INSIDE Blender with --python-exit-code 1.
- Removed the broken automatic overlay -> baseline sculpt -> binary publication chain from the automatic workflow. Its replacement is explicitly named Brooke build verification: synthetic geometry regression (positive and intentionally corrupted negative), preserved full-body GLB import/export/rig checks, HEAD-ONLY baseline render, and per-run evidence. This is BUILD VERIFICATION, not a new Brooke face candidate.
- Photo reconstruction is explicit-input/manual only, requires exact image SHA256, validates before expensive setup, propagates Blender script failures, uploads artifacts only, and cannot auto-publish/rebase binaries. This removes repeated missing-photo push runs and concurrent model publication.
- Local checks PASSED: Python compilation, YAML parsing, diff whitespace, ten exact photo hashes/dimensions, wrong-photo rejection before write, workflow trigger/permission/exception flags. One apply_patch formatting attempt was rejected before edits; corrected patch applied.
- Added positive/negative Blender regression and preserved-body smoke tests. Remote execution status PENDING until actual run inspected. No new viewer/model delivered; current viewer remains baseline only.
- Next: commit this repair and log together, inspect GitHub run result and logs, record outcome; correct any observed failure rather than retry unchanged. No production/lake/trail changes.
- Restricted generic prototype push trigger to its own files on main, so Brooke photo/face work no longer rebuilds a generic prototype and presents an unrelated green check.

## Verification run started — 2026-10-23 23:11 EDT
- Source repair commit: 23ef04200fca3d75a23fac436c13bee857308c32.
- Workflow: Brooke build verification. Run https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40057191027 ; status observed IN_PROGRESS, not success.
- Scope: build runtime, synthetic geometry regressions including intentional negative test, preserved baseline body import/export/rig checks and head-only render. NOT a new Brooke likeness or model publication.
- Only one workflow started for this commit, avoiding earlier unrelated prototype/photo fan-out.
- Bell progress: https://github.com/copperisbetter-lang/Wvlrp/issues/29#issuecomment-6379140444 . Outcome pending actual job results.

## Verification #21 outcome — 2026-10-23 23:12 EDT
- Run 40057191027: GitHub SUCCESS; job 120762654833 all steps passed. Actual logs inspected, artifact 12545597158 downloaded and digest verified.
- Blender 3.0.1 loaded NumPy 1.21.5 inside Blender. Positive fixture preserved source vertices and manifold connectivity. Deliberately altered fixture rejected with exactly one missing vertex and exit code 1; this is the expected negative test, not an ignored validation failure.
- Body roundtrip: 4 meshes, 1 armature, 52 bones, 0 shape keys, 0 animation actions; source hash unchanged 621c27b7e63ef7799a3be44c31a076f21ce3b22634d3bded41159bb1a2584026. Do not claim animations were added.
- Actual baseline head PNG visually inspected: OVEREXPOSED; rejected as useful visual inspection evidence despite technical CI success. New Brooke likeness still NOT built or approved.
- Corrective next change: render texture-only with copied inspection materials after model export (no model modification), increase head framing, rerun verification. Record separately, do not overwrite #21 history.
- Historical Pass 4 software render was also inspected locally: visible nostril, brow/eye/lip and hairstyle defects remain. Do not present it as recovered approved final likeness.

## Render evidence correction submitted — 2026-10-23 23:15 EDT
- Follow-up to technical-success/visual-rejection run 40057191027. Inspection uses render-only emission material copies with original texture and alpha, after preserved-body export; no model materials are exported with these copies. Increased head framing to avoid clipped hair. The image is explicitly texture-only, not a photorealistic lighting or likeness pass.
- Added scoped AGENTS.md with the audit's build/input/publication/recordkeeping requirements for future sessions.
- No face edit, original photo publication, or viewer replacement. Verification rerun expected on this code commit; status UNKNOWN until actual run observed.

## Verification #22 started — 2026-10-23 23:16 EDT
- Run https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40057535883 ; source bff5dbce4387f58748900c1e351b608b243b8481. Observed IN_PROGRESS. Render-evidence correction only; previous #21 remains technically passed but image rejected. No likeness or model edit.
- Bell update: https://github.com/copperisbetter-lang/Wvlrp/issues/29#issuecomment-6379190860 .

## Verification #22 FAILED; renderer enum correction — 2026-10-23 23:17 EDT
- Run https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40057535883 , job 120763723720, source bff5dbce4387f58748900c1e351b608b243b8481: FAILED at preserved-body/head inspection step. Source/runtime/positive and negative geometry tests PASSED.
- Exact actual log: TypeError: bpy_struct: item.attr = val: enum "Medium High Contrast" not found in ('None'), line 62 of check_preserved_body.py.
- Newly introduced mistake: selected an unsupported contrast look for the actual CI Blender color configuration. Corrected to the exact supported enum 'None'. No validator weakened and no model changed.
- Report/upload steps were skipped; no green or visual success claimed. This is a renderer-configuration failure distinct from prior NumPy/geometry errors.
- Resubmission changes this root cause; not an identical retry. Photo/model work remains unbuilt; no viewer publication.

## Verification #23 started — 2026-10-23 23:18 EDT
- Run https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40057675862 ; source 4b1fcc506c6e427f07cfec961a4b4de2cd2f318f. Observed IN_PROGRESS; actual renderer enum corrected to supported None. No identical retry, no model/likeness changes or publication.

## Verification #23 PASS, evidence downloaded and inspected — 2026-10-23 23:19 EDT
- Run https://github.com/copperisbetter-lang/Wvlrp/actions/runs/40057675862 ; job 120764155666 ; source 4b1fcc506c6e427f07cfec961a4b4de2cd2f318f . All job steps SUCCESS; actual decoded log inspected.
- Verified runtime: Blender 3.0.1 / NumPy 1.21.5 imported inside Blender.
- Valid synthetic curved-patch source geometry survives normalized GLB export/import and manifold validation. One deliberately altered source vertex is rejected with exit code 1. That assertion is the expected NEGATIVE test; no production validation error was ignored.
- Preserved-body roundtrip passed: 4 meshes, 1 armature, 52 bones, source hash unchanged 621c27b7e63ef7799a3be44c31a076f21ce3b22634d3bded41159bb1a2584026. Existing baseline has 0 animation actions and 0 shape keys; no motion is claimed.
- Artifact 12545554376: brooke-build-evidence-40057675862, 265673 bytes. Downloaded ZIP and verified SHA256 7f6045818ed7195b7e627d97edae24fd24eb71958815a6067a05e25f62e06b1d. Read regression-report.json, body-smoke-report.json and run.json; inspected exact downloaded baseline-head-smoke.png.
- Corrected PNG: texture-only baseline portrait with full head framing; previous blown-out lighting removed. Usable as build inspection evidence only. It still depicts the unchanged baseline, NOT Brooklyn likeness or a new face.
- Machine evidence retained under build-history/40057675862/. Earlier #21 technical pass/image rejection and #22 renderer failure remain recorded; no failures erased.
- Scoped AGENTS.md now persists mandatory audit, input identity, shared Blender runtime, strict exception handling, checkpoint preservation, visual gates and per-event logging for future work.
- New neutral front/profile photographs are available and exact identities recorded, but manual reconstruction using them has NOT run; no full-body photo-head morph exists from this work. Current user-facing viewer remains the prior baseline. No new viewer or likeness approval claimed.
- Remaining model task: perform a real anatomical head reconstruction/morph from the selected supplied front/profile references, inspect it, then integrate a verified character candidate. Do not revive the discarded overlay/baseline-sculpt publication chain.
- Current build foundation is verified. Do not promise every future experiment will be green; prevent known repeated failures and block publication on any failed check.

## Actual supplied-photo reconstruction — 2026-10-23 23:30 EDT
- Doug instructed completing Brooke face. Bell https://github.com/copperisbetter-lang/Wvlrp/issues/29#issuecomment-6379291762 .
- Manual dispatch fallback checked cloud GitHub browser: signed out, no build launched there. No credentials requested or changed.
- Local route now works: official Blender 4.2.0 Linux tar from download.blender.org; actual Blender preflight imported NumPy 1.24.3. Local separate ML runtime uses NumPy 1.26.4, PyTorch 2.5.1+cpu, OpenCV 4.11.0, ONNX Runtime 1.31.0.
- 3DDFA_V2 source commit 1b6c67601abffc1e9f248b291708aef0e43b55ae. Patched deprecated NumPy aliases as already learned. Initial upstream build.sh did not stop on missing clang/clang++; corrected builds explicitly use CC=gcc CXX=g++. A mistaken FaceBoxes/setup.py path failed once; actual script is FaceBoxes/utils/build.py. Compiled modules and imports verified.
- ACTUAL inputs: upload/09-3948.jpg neutral front, upload/10-3949.webp profile, and recovered Pass 4 render as geometric registration reference. Each detected one face, each reconstructed 38,365 points. Saved local NPZ, landmark images and exact hashes in reconstruction.json.
- Landmark images on all three were visually inspected. Front/profile detections track features; profile expression is smiling, so neutral front expression must be retained when using profile shape.
- Next: register multi-view reconstructed geometry to preserved native head topology, retain eye/neck surfaces, rebuild photo texture registration; inspect renders. No model export or likeness approval claimed yet.

## Native-topology photo portrait attempts — 2026-10-23 23:38 EDT
- New local script build_registered_face.py uses 80/20 front/profile identity coefficients, front neutral expression, 68 registered landmarks, original native head topology and photographic UV remapping. Separate portrait-only head/neck, not nude full-body likeness. Baselines untouched.
- Attempt 1 BUILT: 4692 skin vertices / 8942 triangles, 0 inverted triangles, accepted step 0.55, max displacement 9.9 mm. Hash 5f00f1872161dac76bc172df3244018539cb06a3e7f6453c16e9755852a322e7. Actual front/profile/quarter software renders inspected. Not approved: brow overhang and mouth projection still wrong. Preserved attempt1 GLB/report/script locally.
- Attempt 2 FAILED CLOSED before new export: dense surface-depth fit would invert triangles at every tested step down to 0.25. RuntimeError: Reconstruction would invert surface triangles. No check weakened and no bad model published.
- Root-cause correction for Attempt 3: regularize deformation across connected mesh topology to remove discontinuities from projected nearest-depth samples; neck/periphery reset to zero. Same inversion gate; line-search steps recorded. Attempt 3 RUNNING as of this entry.
- Latest explicit green-eye directive applied to separate iris texture; original eyes geometry/UVs and all rigs retained. Hair geometry retained with candidate tint only. No final likeness claim.
- Standard git push dry-run failed due unavailable local GitHub credentials. Connector writes still available; no source-photo publication attempted. Browser remains signed out. Viewer publication pending exact-asset validation.
