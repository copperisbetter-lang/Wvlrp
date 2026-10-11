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
