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
