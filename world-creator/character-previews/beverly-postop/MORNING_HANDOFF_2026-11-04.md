# Beverly — morning handoff (2026-11-04)

**Status:** Work paused at owner's request. The owner is tired and wants to inspect Beverly in the morning. **Do not overwrite the approved Beverly master, change the attachment geometry/skin weights, or promote an experimental trim.** Continue coordination in [Issue 29](https://github.com/copperisbetter-lang/Wvlrp/issues/29).

## Start here in the morning

**Current published 3D viewer:** https://wvlrp.com/world-creator/character-previews/beverly-postop/viewer.html?cleanjoin=1&v=kneel-hip-neck-20261104-1

**Official checkpoint:** https://github.com/copperisbetter-lang/Wvlrp/actions/runs/41789060766 — website publish **SUCCESS**, at commit `d43b4279b9cd5ea7f475de3be47a6be12a5c4c70`.

**Verification:**
- Full 69-bone / 77-animation browser QA: https://github.com/copperisbetter-lang/Wvlrp/actions/runs/41789060757 — SUCCESS.
- Dedicated Elbows & Knees 69-bone mobile posture, side and rear screenshot QA: https://github.com/copperisbetter-lang/Wvlrp/actions/runs/41789057062 — SUCCESS. Screenshots are in the workflow artifact while retained.
- No owner visual approval has been given for the latest pose or the remaining central seam.

## Morning inspection order

1. Open **Elbows & Knees** in the viewer, then inspect **Side**, **Back**, and **Front**. Verify hips/bottom elevated, elbows near ground, knees supported, torso hinging at hips, and head slightly lifted rather than pressed down or appearing inverted. Viewer now reframes the crouched pose instead of keeping the old standing-height camera.
2. Examine the **central transition patch and attachment boundary** in standing, Elbows & Knees and Sit — Legs Open. **There is still a visible black/open-looking seam from behind. This is NOT fixed.**
3. Verify whether mirrored grey inner-thigh streaks improved with `cleanjoin=1`, and compare the same page without that query argument. The cleaning is opt-in and not proof of geometric repair.
4. Check **Walk / Run** without losing owner-approved motion: independent presets in browser storage, latest recorded Walk arms/feet 90%/90%; latest recorded Run arms 55% and fixed 3-inch / 0.0762-m foot spacing. Earlier diagnostics contain different values; screenshots of final approved sliders were not available, so these numbers are NOT screenshot-verified. Run left-hand chest clearance is corrected with right arm preserved.
5. Owner reviews visually and gives specific notes BEFORE any new approval or modifications to the original Beverly asset.

## What was done

- Experimental **Beverly Post-Op Motion Lab** loads the existing 69-bone model with 77 native animations and 2 inspection poses. Experimental source: `world-creator/character-previews/beverly-postop/viewer.html`. Source master, certified GLB, body geometry, skinned attachment, weights, clothing, The Wild live-world character all remain unchanged.
- Restored natural hip-driven crouch instead of extreme upper-spine bend. Last validated measurements from real mobile browser: hip y ~0.530m, head y ~0.307m, chest y ~0.399m, knee min y ~0.166m, elbow min y ~0.094m, head ~0.214m above elbows; upper-spine neutral, moderate neck extension ~26°. User previously showed rear/bottom view with head pressed toward ground. Dedicated pose QA now checks head clearance and captures real side/rear screenshots.
- Previous full diagnostic source contained **11 recordings, 282 frames, 69 joints**. Earlier kneel showed dramatic torso flexion and feet below the floor. Numbers alone missed visual defects, so do not use a green check to assert surface quality.
- Reduced unnatural seated leg spread and lowered seated arms, but Sit — Legs Open *pelvic attachment deformation still needs visual inspection*. Chair motion has intermittently exhibited stale transitions in earlier QA (latest full motion QA was SUCCESS).
- Walk and Run presets separated to prevent changing one gait's controls from overwriting the other. Run left-wrist collision safeguard moves only left forearm; at ten sampled phases, right-arm displacement from that fix was 0.0m.
- Surface diagnosis isolated three meshes in the affected region: main body `SURG_BEVERLY__base001`, transition patch `SURG_BEVERLY__base001_1` (3,189 vertices, 5,924 triangles), attachment `SURG_BEVERLY__base001_2` (14,436 vertices, 28,458 triangles). Hiding patch alters/removes mirrored grey marks but reveals body cutout. Hiding attachment itself does not eliminate those marks.
- **Two triangle-trim proposals were rejected**: removing 402 or 918 faces opened black holes. Pushing patch depth with polygonOffset likewise caused jagged/open seams. `?patchtrim=light` and `?patchtrim=medium` remain **experimental opt-ins only**; original geometry is the default. Do not promote these as final.
- Baked dark U-shaped streaks in patch diffuse texture identified; opt-in `patch-texture-fix.js` uses a replacement canvas/material for only this patch with `?cleanjoin=1`. This reduced grey marks in comparison, without changing texture in the source GLB. **Black central seam is outstanding**, likely requiring a properly fitted fill/geometry solution, not blind triangle deletion.
- Relevant modules: `motion-repairs.js`, `patch-texture-fix.js`, `patch-trim-experiment.js` (rejected options), `test-motion-repairs.cjs`, `test-kneeling-inspection.cjs`, `test-surface.cjs`, and workflows under `.github/workflows/`.
- Preserve GitHub Issue 29 log and do not claim a fix has been approved until the owner sees it.

## Status when paused
- **Saved and published:** current viewer and non-destructive fixes, success confirmed in GitHub Actions.
- **Saved tests:** full browser animation QA and targeted crouch QA passed.
- **Unresolved:** dark central patch seam/hole appearance, sitting attachment deformation, owner's visual acceptance, and any true permanent geometry-fit repair.
- **No further changes tonight.** Resume with the owner’s visual notes in the morning.
