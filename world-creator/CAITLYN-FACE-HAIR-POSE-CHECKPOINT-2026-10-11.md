# Caitlyn face / hair / floor-pose checkpoint — October 11, 2026

## User-approved lock
The user explicitly says **Caitlyn's current body looks good**. Preserve the entire existing body, stature, anatomy/proportions, skin map, gait and character placement. Never take a face/hair edit as permission to remodel her torso, waist, hips, bust, arms or legs. Mason, Amy, Chrissy and Riley are out of scope.

## Desired head and hair
- Bring Caitlyn's adult facial geometry closer to the user's approved model image: soften brow ridge, nose bridge, cheek and jaw transitions; neutral/gentle natural smile.
- Light natural blue eyes. The user thinks eyes may already be too big; **do not enlarge her eye sockets or eyeballs**.
- Keep one complexion across face/neck/body by preserving existing CC0 UV photographic diffuse material.
- Replace the stiff stock long01 blonde "plastic cape" with separately layered softly wavy platinum-blonde tapered locks, face-framing pieces, and a modest scalp cap; keep hair following her head bone.
- The builder now contains `soften_caitlyn_face_only`, `add_light_blue_eyes`, and `replace_cape_with_layered_hair`.

## Floor poses
- Correct **hands AND knees**: both palm surfaces and both knees should support the pose on the same ground plane, knees bent correctly, hips hinged, head looking forward naturally.
- Correct **elbows/forearms AND knees**: forearm/elbow surfaces and knees grounded, wrists near the same plane, neck properly aligned.
- These are two distinct existing named animations (`Caitlyn HandsAndKnees`, `Caitlyn ElbowsAndKnees`). Do not replace the standing, walking, bending, or kneeling capabilities.
- Builder now optimizes each contact limb separately and grounds at hand-bone end rather than the wrist joint. Check individual support heights in `WVLRP_CAITLYN_SUPPORT_QA` diagnostic.

## Honest status
Source has been edited and committed to main on October 11. Newest workflow still needs to **finish successfully and republish** `world-creator/assets/caitlyn-mpfb-trial.glb`. A source commit alone does not prove a correctly appearing model. Inspect frontal, side, rear and close-up face views plus both stationary floor poses. Check scalp fit, natural hair shape, iris alignment, and body preservation. If model builder fails, fix and rerun it before saying completed.

## Review
https://wvlrp.com/world-creator/caitlyn-mpfb-trial.html
https://github.com/copperisbetter-lang/Wvlrp/actions/workflows/build-caitlyn-mpfb.yml


## October 11, 7:07 PM user screenshot — hovering wig and exposed scalp
- User supplied a close-up of Caitlyn's LIVE mobile viewer. Her bald-looking scalp and forehead are visible; a gray dome (former procedural scalp cap) visibly hovers above her head, with separate long platinum locks falling at the sides. Hair fit is NOT accepted. Preserve approved body and its existing positions/poses.
- Root cause under investigation: the hair-builder used the global basemesh maximum Z as the top of her skull, instead of a skull/eye anatomical landmark. This can place the new cap and strand roots too high.
- Commits `90875d1f365f5aa2d80efd8bec5bd780ba964398` and `7ebce20630840d5fd3385c1bd5c18a695c4f12b2` replace the crown reference with the exported eyeball center plus proportional eye-to-crown spacing, place skull-band center, and lower the cap and strand roots. The source edit triggers the Caitlyn-only GitHub Actions build.
- **Status at checkpoint:** source committed to main; the rebuilt GLB, workflow completion, mobile rendering and true skull fit were NOT independently verified. Do not call it fixed merely because source was committed. Inspect full face, back, three-quarter, bending and both floor poses after the rebuilt asset arrives.


## Oct 11 ~7:28 PM EDT: independently verified grounded animation build
- User reported that Caitlyn still was not doing hands-and-knees or elbows-and-knees on the mobile viewer.
- Corrected `world-creator/caitlyn-mpfb-trial.html`: pressing either floor pose now animates through the movement instead of silently skipping to its last frame, then holds the pose. It scans the loaded GLB's targeted animation tracks and compares starting vs final joint transforms to avoid a false success caption. Side-view camera resets to include full body. Latest viewer source commit `5caa9e639170f21c858c5281d93137b56ba46f71`.
- GitHub Actions build #24 caught the previous bad *elbows-and-knees* geometry: hips were only 0.143 m above knees even though joint contact was good; the preceding build did not verify proper posture.
- Subsequent solver commits `f12526c`, `c53ca7d`, `3534ebc` first raise hips/tuck knees, then calibrate spine articulation and forearm pitch so elbows really reach knee-height floor plane.
- **Successful live GitHub Actions build #27**, run https://github.com/copperisbetter-lang/Wvlrp/actions/runs/38184232159, job 114603022568, published new GLB via commit `8db8c1a`. Actual rigged exported GLB size 14,422,172 bytes, 52 joints, five animation clips including BOTH named floor poses.
- Build diagnostics **hands-and-knees**: individual knee/palm contacts Z [0.060, 0.062, 0.058, 0.068] m at ground 0.062 m; maximum error 0.006 m; hips 0.349 m over knees.
- Build diagnostics **elbows-and-knees**: individual knees/elbows Z [0.063, 0.063, 0.062, 0.061] m at ground 0.062 m; maximum support error 0.002 m; hips 0.213 m above knees; chest reaches forward 0.308 m. Forearm/palm heights roughly 0.013–0.025 m above elbow.
- **Important limitation**: successful generation, published GLB, kinematic support and named clips are verified, but *live user phone WebGL visual execution is not yet independently observed.* Do NOT tell user the displayed animations are visually perfect until they test and show it. The hosted public link is https://wvlrp.com/world-creator/caitlyn-mpfb-trial.html?v=caitlyn-floor-pose-20261011-v4
- Separately Blender's optional static PNG preview still fails with view_settings.look obsolete `Medium High Contrast` enum; this does **not** break GLB export. Could fix later without altering the rig.


## October 11 evening — user reports smile works, BOTH floor poses still absent; hair still bad, requests temporary sundress
- DO NOT claim phone-side hands-and-knees or elbows-and-knees proven. User directly confirmed neither worked even after GLB build #27. Smile morph **does** work.
- Viewer pose handlers rewritten in `caitlyn-mpfb-trial.html`, commit `7516162`: floor pose button now holds the GLB clip's final frame and independently writes exported last bone transform keys. Removes fragile play/probe/stop/restart chain. Viewer has pose slider, camera side angle and status.
- World Creator 3D pose selection also pins last joint keys, commit `d144829`; viewer/model URL cache keys updated.
- Hair builder commit `9dcc3c6` replaces mathematical floating hemispherical wig cap with a surface offset of Caitlyn's **actual scalp faces** and anchors layered wave-lock roots to real scalp mesh vertices. Hair must be judged from phone front/side/rear after re-export.
- User-approved temporary **sky-blue sleeveless sundress** added as a separate skeleton-skinned object by `add_temporary_sundress` in build script, commit `a8e5416`. No approved body geometry, skin or face proportions modified. Viewer adds Sundress on/off button in `0b1b571`; World Creator uses updated GLB URL via `d144829` and `94f3451`.
- GitHub Actions build #29, run `38190812053`, was **still in progress** when last checked, not yet published/visually tested. Do not call dress/hair finished until GitHub build succeeds, GLB is committed, site refreshes, and phone testing shows correct appearance/pose.
- Review: https://wvlrp.com/world-creator/caitlyn-mpfb-trial.html?v=caitlyn-blue-dress-pose-v6
- Build: https://github.com/copperisbetter-lang/Wvlrp/actions/runs/38190812053

## Oct 11 9:12 PM EDT — dress-and-hair GLB build VERIFIED
- GitHub Actions **#29** (`38190812053`, job `114623044388`) completed **SUCCESS** and published Caitlyn GLB on main in commit `c75cec227e9a`.
- Actual exported GLB **14,643,488 bytes**, 52 joints, five skeletal animation clips, eight meshes. Log: `WVLRP_CAITLYN_SCALP_SURFACE_FIT 4052 4010`; `WVLRP_CAITLYN_SUNDRESS_BUILT 544 342 rigged True`.
- Both poses pass builder support diagnostics (hands 6 mm max, elbows 2 mm max contact deviations). **Phone visual appearance/playback is NOT verified yet.** User should open the cache-busted standalone viewer, try both buttons and inspect hair/dress.
- Live test link: https://wvlrp.com/world-creator/caitlyn-mpfb-trial.html?v=caitlyn-blue-dress-pose-v6

## Oct 11 ~9:45 PM EDT: phone screenshots prove pose/hair/dress still incorrect
- User uploaded 3 live Android screenshots, showing **HandsAndKnees** and **ElbowsAndKnees** actually HOLDING keyframed poses; buttons now work but the spatial configuration is wrong. Knees bend behind hips; palms are not placed directly below shoulders. Screens show straight/spiky separated platinum hair, raised or exposed scalp, rigid blue sundress and straps. **Do not claim these appearances/poses fixed from the preexisting GLB.**
- Reviewed builder and old successful #29 logs: knee fore-aft positions were ~0.17 m behind hips for hands-and-knees and ~0.33 m behind hips for elbows-and-knees; prior QA checked only contact heights.
- Source rewrite committed as **9c0efd25347b1a54de1a17ec7b16a001d483cea7**, with raised elbow/hip posture, much higher positional alignment weights, independent same-side shoulder/palm and hip/knee alignment checks, and fail-fast regression thresholds. Hairline anchor and flowing lock wave proportions adjusted; sundress now longer with softer hem and narrower curved straps. Body/face proportions untouched; all other avatars untouched.
- Standalone viewer commit **cf5b5de958b787bbe24ec91f8a17b87651de4457** increases camera distance on floor poses to prevent clipping; studio GLB URL updated in **f6ae94b9b38a0607a2def54c3fcab77c8b26ad05** to a new cache key.
- **Verification still needed**: GitHub Actions auto-build triggered by source edit must finish and publish the new GLB. Check if latest file commit is newer than source edit; inspect build logs for `WVLRP_CAITLYN_SUPPORT_ALIGNMENT`, `WVLRP_CAITLYN_POSTURE_QA`, build errors, and actual output size, then validate mobile standing and both poses/hair/garment. Do not give a "ready for test" link or claim successful rebuild until source-to-asset chain is confirmed.
