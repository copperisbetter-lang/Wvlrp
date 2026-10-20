# SAV4 → Laura one-pass inspection (2026-10-20)

## Safety
Work only on branch `sav4-laura-one-pass-inspection`. Keep approved SAV4 v21 geometry, skin, fitted plaid skirt, black blouse, rig and deployed lake NPC unchanged. Export a separate inspection GLB and viewer; never overwrite the approved source or production asset.

## Full inspection target
Use `characters/sav4/laura-two-view-landmarks.json` and `references/sav4-face-reference-2026-10-18.md`. These are perspective measurements, not calibrated 3D scans. Face: oval silhouette, fuller upper cheeks, gentle jaw taper, rounded chin, slim bridge and softly rounded nose tip, almond-shaped eyes with natural lids, medium-width mouth and relaxed lips. Hair: straight fine dusty/ash blonde, bangs/fringe, long smooth face-framing lengths. Preserve pale-blue eye material.

## Implementation gate
The current `scripts/sav4_photo_morph.py` produces a *plan only*. The existing `build_sav4_mpfb.py` alters mostly cheek/jaw by approximate head height, and its full nose/lip fitting requires `characters/sav4/face-region-map.json` with verified vertex IDs. Do not claim full facial fitting until region mapping is validated. Create a reversible morph parameter preset and an actual separate GLB; export front, three-quarter and profile renders at consistent camera settings and a viewer that defaults to a tight face framing. Validate no eye, teeth, scalp, clothing, or hair penetration, and verify GLB visually rather than trusting a green CI build alone.

## Acceptance
Single inspection pass with face + hair together; user approves before any production replacement. Report actual commit, artifact paths, build status, and viewer URL only after verified.
