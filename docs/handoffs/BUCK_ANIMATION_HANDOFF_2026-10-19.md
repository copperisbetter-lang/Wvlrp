# Gator-to-Gator: Whitetail Buck Animation Handoff
**Date:** 2026-10-19  
**Project:** WVLRP / The Wild  
**Repository:** https://github.com/copperisbetter-lang/Wvlrp  
**Working branch inspected:** `main`  
**Inspected repository tree SHA:** `ec5eab63b05d51edbf03b4d6f0cbfd49fbd59042` (tree SHA, **not** commit SHA).  
**Viewer source:** [wildlife-viewer.html](../../wildlife-viewer.html)  
**Rig builder:** [scripts/rig_whitetail_buck.py](../../scripts/rig_whitetail_buck.py)  
**Buck asset:** [whitetail-buck-rigged-v1.glb](../../whitetail-buck-rigged-v1.glb)  
**Publishing workflow:** [.github/workflows/publish-wildlife-viewer.yml](../../.github/workflows/publish-wildlife-viewer.yml)  
**Expected GitHub Pages viewer URL:** https://copperisbetter-lang.github.io/Wvlrp/wildlife-viewer.html — inferred from standard Pages URL pattern; **not independently verified live**.

## Objective and guardrails
Preserve the user's approved photorealistic whitetail buck and all working features. Correct existing movement implementation rather than adding buttons or replacing the model. The user recorded a roughly 1m40s video of button testing with voice narration; video was received in the originating chat, but it has **not been committed to GitHub**, and narrated button-by-button outcomes were **not reliably transcribed**. Do not fabricate test observations.

## What was confirmed from GitHub source
- The viewer is a standalone Three.js page using Three.js 0.170.0, GLTFLoader, OrbitControls, AnimationMixer, and procedural animation.
- Its title is `The Wild | Wildlife Inspection Viewer`.
- The page explicitly labels movements `BUCK MOVEMENTS — 13 CONTROLS (BUILD 20261019-8)`.
- The existing thirteen controls are: **Walk, Run, Graze, Tail flick, Ear flick, Alert, Look around, Head shake, Paw ground, Stamp hoof, Resting idle, Startled jump, Lie down — legs tucked**, plus **Stop / Reset**.
- `motionNames` is the array defining buttons; each click calls `stopMotion()`, `mixer.stopAllAction()`, sets `procedural=name`, and updates status.
- `stopMotion()` stops the active clip, clears `procedural`, zeroes elapsed time, and restores recorded rest bone quaternions. The separate Stop / Reset button invokes this function.
- `animateBuck(dt)` is called from the render loop and applies procedural Euler offsets to each bone quaternion relative to its rest quaternion.
- The rig-builder script defines pelvis, spine, chest, neck, head, jaw, tail, and 3 bones each for 4 legs = **20 named bones**. These are definitions in the script, **not a runtime-confirmed count for the deployed GLB**.
- Rig builder explicitly calls its rig experimental, uses approximate bounds-based bone locations and nearest-two-bone proximity weighting, and warns deformation is unvalidated.

## Code-level risks requiring testing (not all proven user-visible failures)
1. **Ear flick:** The 20-bone rig-builder script defines **no ear bones**, while the viewer's `Ear flick` case only moves bones whose names contain `ear`. If the deployed GLB matches the script, this action cannot visibly flick ears.
2. **Body motion name mismatch:** The rig builder uses `pelvis`, `spine`, `chest`; procedural cases sometimes target `body` or `endsWith('body')`, which may never match. Run body bounce and startled jump body motion may therefore be absent.
3. **Joint axes:** The viewer applies generic local Euler X/Y/Z offsets without inspecting each bone's local anatomical axes. Some leg and neck rotations may be anatomically incorrect.
4. **Gait timing:** `step(speed,amp)` uses sine offsets based on side and front/rear; it is not a validated deer footfall sequence, does not use IK/ground-contact constraints, and has no translation/root locomotion.
5. **Hoof contact:** Upper, lower, and hoof bones are driven by independent simple oscillations, potentially causing sliding, floating, or ground penetration.
6. **Animation mixing:** A procedural action starts by stopping all mixer actions; however `Stop / Reset` calls `stopMotion()` only, not `mixer.stopAllAction()`. When a built-in clip is active, the button's behavior needs verification.
7. **Model/rig validation:** Inspect actual GLB bone names, hierarchy, skin weights, rest transforms, skinned mesh count, and imported clips. Script contents do not prove the shipped GLB's exact configuration.
8. **Head movement:** There is no literal `Head Movement` button; related actions are `Look around`, `Head shake`, `Alert`, and `Graze`. Verify against the user's recorded narration.

## Recorded video — evidence boundary
A roughly 1m40s MP4 was uploaded in the original conversation. Visual frames were extracted/reviewed and show the existing viewer with the buck and controls. Its audio track was present but the spoken sequence was not reliably transcribed. **No verified per-button timeline, actual joint response measurements, or conclusive failure table is available.** Request the original MP4 again if the next Gator cannot access it; do not infer unseen motion outcomes.

## Previous work and status
Prior conversation reports repeated iterations adding controls, initial absence of controls, and later buttons appearing without the intended buck movements. The user previously confirmed the buck model was acceptable and wanted a skeleton rather than a replacement model. The source currently contains the 13 controls and a 20-bone experimental rig builder. There is no verified evidence here that any individual movement has been successfully repaired or that a fresh animation-fix deployment has completed. **This handoff commit is documentation only.**

## Next Gator — precise work order
1. Fetch this file, `wildlife-viewer.html`, `scripts/rig_whitetail_buck.py`, and inspect `whitetail-buck-rigged-v1.glb` without replacing it.
2. Obtain and watch the original narrated MP4. Make a timestamped table: spoken button, expected action, visible actual action, confidence.
3. Inspect actual GLB bone hierarchy, local axes, weight painting, ear/tail bones, and imported animation clips. Compare runtime rig diagnostics with the script's intended 20-bone layout.
4. Reproduce each of the thirteen actions separately and test switching actions, replay, and Stop / Reset.
5. Correct only demonstrated defects. Ensure anatomical knee/hock directions, realistic walk/run footfall, ground contact, coordinated grazing, and independent ear/tail motion. Add rig bones only if necessary and preserve the approved visual mesh/materials.
6. Check whether `stopMotion()` must also stop mixer actions and restore any other animated transforms.
7. Record actual before/after test results. Commit implementation changes separately, inspect Actions and GitHub Pages deployment, and supply the **verified** viewer URL and commit SHA.
8. Never mark a button fixed without a visual or automated confirmation.

## Deployment details
`.github/workflows/publish-wildlife-viewer.yml` triggers on pushes to `main` that change the workflow or `wildlife-viewer.html`, or by manual dispatch. A docs-only handoff commit does **not** trigger that workflow under its path filters. Its job downloads/stages reference models and commits them if changed. Do not equate a successful docs commit with a deployed viewer update.

**Checkpoint:** Existing viewer, rig script, and asset located; concrete source-level risks identified; no animation fix committed or verified. Preserve the approved buck. One shot, one solid build.
