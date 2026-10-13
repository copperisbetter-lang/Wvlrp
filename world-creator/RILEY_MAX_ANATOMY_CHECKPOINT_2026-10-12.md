# Riley MAX-size anatomical trial — October 12, 2026

User request: replace the current coarse vulva on adult **Riley** trial with a more detailed version, and initially set **every functional size control to maximum**. Avoid maxing placement or rotation, which would push the attachment away from the intended fit.

## GitHub changes on main

- `world-creator/scripts/build_riley_vulva1_trial.py`, commit `266dd4d395d8a1611b1021892f37bb467b3744ad`: rebuild existing isolated `riley-top-shelf-vulva1-trial.glb` with 2-cut quad subdivision (source 181 vertices -> >800 vertices), UV interpolation, smooth bilateral outer/inner labial ridges; preserve original body/skin/armature and animations. Same trial GLB name, not approved production Riley.
- `world-creator/scripts/riley-anatomy-controls.js`, commit `16d633a6fd72ee000064ce014706d9c07ee38b40`: four lip controls default to 400% (their max); new All sizes MAX button; separate, narrower central masks for outer and inner lips, with less extreme physical displacement.
- `world-creator/riley-vulva1-trial.html`, commit `a888f761401a920165337a81f1c50a6770482608`: whole attachment 300% default (max), new storage key to bypass earlier saved small settings, new cache-busted JS and GLB references, and 300% close-fit preset.
- Hood and clitoral controls stay disabled. This source topology does not provide those as independently modeled components.

## Verified build / remaining viewer QA

- The new Blender job **SUCCEEDED** for `source_commit=266dd4d395d8a1611b1021892f37bb467b3744ad` on `2026-10-13T02:48:34Z`.
- Revised GLB: **1,549 vertices and 1,512 faces** for the replacement subdivided attachment, up from the licensed donor's 181 vertices and 168 faces; Blender reported `RILEY_VULVA1_TRIAL_SUCCESS` and 10,964,524-byte GLB.
- **Published replacement binary confirmed:** commit `d692f797abd87b9e72092ba7f9a98784d79aebb3` changes `world-creator/assets/riley-top-shelf-vulva1-trial.glb`. Status diagnostics committed `f2687a5880387d635640654377930fd9eaeb1f5c`.
- Existing Riley 5 animations survived in Blender export, including elbows-and-knees. The body mesh and original GLB remain unchanged.
- **Not yet visually verified on Android or confirmed deployed to wvlrp.com.** Need user to open viewer and inspect real scale, skin-match, top edge, body clipping, standing and rear poses. The 300%/400% size values are MAX viewport controls, not baked in the GLB, so they remain reversible.
- Viewer test URL: `https://wvlrp.com/world-creator/riley-vulva1-trial.html?v=20261012-max-sculpt-r6`.
