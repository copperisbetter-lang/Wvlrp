# Riley MAX-size anatomical trial — October 12, 2026

User request: replace the current coarse vulva on adult **Riley** trial with a more detailed version, and initially set **every functional size control to maximum**. Avoid maxing placement or rotation, which would push the attachment away from the intended fit.

## GitHub changes on main

- `world-creator/scripts/build_riley_vulva1_trial.py`, commit `266dd4d395d8a1611b1021892f37bb467b3744ad`: rebuild existing isolated `riley-top-shelf-vulva1-trial.glb` with 2-cut quad subdivision (source 181 vertices -> >800 vertices), UV interpolation, smooth bilateral outer/inner labial ridges; preserve original body/skin/armature and animations. Same trial GLB name, not approved production Riley.
- `world-creator/scripts/riley-anatomy-controls.js`, commit `16d633a6fd72ee000064ce014706d9c07ee38b40`: four lip controls default to 400% (their max); new All sizes MAX button; separate, narrower central masks for outer and inner lips, with less extreme physical displacement.
- `world-creator/riley-vulva1-trial.html`, commit `a888f761401a920165337a81f1c50a6770482608`: whole attachment 300% default (max), new storage key to bypass earlier saved small settings, new cache-busted JS and GLB references, and 300% close-fit preset.
- Hood and clitoral controls stay disabled. This source topology does not provide those as independently modeled components.

## Readiness / follow-up verification

- **Source changes committed.** GitHub workflow `.github/workflows/build-riley-vulva1-trial.yml` is triggered by the Python builder path; it is designed to publish the regenerated binary to the existing trial asset path.
- **Do NOT claim the revised GLB built, deployed, loaded, visually fit, or worked on the user's phone until actual evidence.** Last status inspected was old success `source_commit=1fd4fdc5ed8ebfa8babf3b4879a7937c9d668611`, from earlier 181-vertex binary. Check status and/or workflow output for current commit `266dd4d395d8a1611b1021892f37bb467b3744ad`.
- Once published, verify GLB vertex count, rig/animation preservation, and in-browser effect of ALL sliders, body skin-match, rim clipping, standing and elbows/knees poses from multiple views. New max sizing intentionally may be visually oversized; user should inspect and dial back.
- Viewer target (only call new 3D build ready after successful binary validation): `https://wvlrp.com/world-creator/riley-vulva1-trial.html?v=20261012-max-sculpt-r6`.
