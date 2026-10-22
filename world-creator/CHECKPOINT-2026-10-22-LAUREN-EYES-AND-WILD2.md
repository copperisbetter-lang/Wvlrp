# WVLRP overnight checkpoint — 2026-10-22 (America/New_York)

## Important working arrangements
- Work through GitHub repository `copperisbetter-lang/Wvlrp` only. **Do not use Railway.**
- User reviews via phone/browser viewer and expects assistant to do the coding, file management and GitHub work, rather than sending code or downloads to deploy.
- Never claim an eye build is visually correct until the user inspects it on phone. Code passing a syntax check is not a visual/browser test.
- Work on **Lauren 3 working copy only**. Leave **Laura 2.5 frozen/approved** and earlier source photo/head backups unchanged.
- Do not generate mock-up photos as a substitute for making actual changes to the real 3D viewer. Keep eye movement, independent eye trim, blinking and front/side camera controls.

## Tonight's reference photo and user's actual eye-fit direction
- Re-open/reference the original user-uploaded photograph of **Laura Harris in The Faculty**, preserved inside the earlier `Laura_3D_Interactive_Viewer.html` self-contained artifact in ChatGPT Library.
- Also refer to the uploaded Library image **`Laura 2 Facial Reference Views.png`**, showing left/front/right views of the accepted reconstructed facial shell; distinguish this model triptych from the original movie photograph.
- The user explicitly corrected earlier diagnoses: **the primary problem is the EYE BALLS, NOT the facial flesh**. Do not keep reshaping or sloping the skin/lids to compensate for incorrect spheres.
- Preserve the flesh around the eyes, including the soft under-eye/upper-eye puffiness, and the overall face/skin color, until body color matching is later decided. User wants realistic photo-matched eyes that naturally sit beneath the original eyelids.
- Original photo reference: softly shaded, comparatively dark hazel/brown irises, restrained eye whites, natural resting gaze; avoid bright, saturated green irises, cartoonishly high white exposure, sharply outlined ovals, or crossing/wandering gazes.
- Existing constructed eyes must remain independently rotatable and blinkable.

## Failures captured today — do not repeat
- Lauren 3 eye rig v6/v7: unnatural horizontally oval cartoon-eye effect; visible eye whites/eyeballs do not line up with existing flesh at corners; some see-through socket corners; over-bright green iris colors and artificial rim.
- New v8 curved-lid test `https://wvlrp.com/lauren-3-eye-fit-v8.html` visually **FAILED**. User screenshot at 00:34 showed unnaturally slanted eyes, pink/grey wedges at the outer corners and a disconnected look. This was not an approval.
- v8 implementation had too much inner-corner slant, and punched eye openings by removing entire triangles using center-point inclusion, leaving jagged/overlarge holes and exposing pink socket-backing surfaces. Avoid this destructive runtime triangle-removal approach.
- Previous offline sculpt `world-creator/scripts/sculpt_lauren3_eyes.py` had caused serious strips/mesh tearing and was reverted. **Do not rerun this script.** The 10 GLB parts were restored from frozen Laura 2.5 with validated baseline SHA-256 `27931d29e5366c452af77e7d182dd4eea3f444eebcc8e660134f7aa961c6298e`.
- Source 3D face is one connected facial shell, not a whole closed skull. Original topology ~38,365 vertices and 228,219 index elements; retain the source untouched.

## Current work saved to GitHub
- Live original production eye viewer: `https://wvlrp.com/lauren-3-face-viewer.html` (earlier rig; leave stable).
- Separate v8 test: `https://wvlrp.com/lauren-3-eye-fit-v8.html` (failed visual reference only).
- **New isolated v9 eye-only test viewer**: `https://wvlrp.com/lauren-3-eyeball-fit-v9.html` — in repository `lauren-3-eyeball-fit-v9.html`.
- New v9 eye rig: `world-creator/lauren3-eye-rig-v9.js` (v9 committed, then amended to explicitly REMOVE runtime orbital Gaussian skin sculpt).
- v9 objective: preserve 100% of original facial positions/colors/triangles, remove baked eye photography by *precise fragment-shader cutouts* instead of deleting face triangles; insert independently movable dark hazel/brown eyes with muted whites and small highlight; avoid bright pink cavity wedges and visible artificial eyelid wire rims.
- v9 viewer retains yaw/pitch, per-eye trim, blink, camera front/sides and rotation; has SHA/model integrity checks.
- v9 rig updated in commit `5c596bc65368c41d5301cd8d179a6c9db26b455c`; viewer created in commit `cfdb493d33a7056264b65a060aea35ae0155c705`.
- Both scripts were syntax-checked prior to latest eye-only update; the amended eye-only rig also passed syntax check.
- **v9 has NOT yet been visually inspected or approved by user**; do not call it fixed until the actual phone viewer is checked. Check GitHub Pages/publication/caching first if viewer is not loaded. No Railway.
- Potential follow-up: the face shader cutout and globe shader mask must share nearly identical mathematical apertures; account for real preserved eyelid/face depth and ensure face fragments correctly occlude globe material with no old iris colors showing around borders. See both front AND left/right side, during a blink and gaze shifts.
- Keep work separate from frozen Laura 2.5; no destructive head/model asset changes.

## Other ongoing work from same night — The Wild 2 / Base Camp (separate from Lauren)
- World performance and control trouble reported: severe stutter/freeze, moving sluggishly, camera turning to the right intermittently fails, and panorama/vegetation material can look like an interlocked green fence. Optimize mobile performance and mouse/touch look, do not mask poor performance with cosmetic fixes.
- User rejected generic, fake-looking trees; after repeated ineffective edits, asked to remove all trees and shrubs/undergrowth from the current working world as a clean reset, then replace with photorealistic West Virginia/New River Gorge-native trees and understory, not synthetic/generic geometry.
- Base Camp is round/circular, central camp, small camping clearings distributed across landscape perimeter and interior; user changed *outer campsite spacing to approximately 200 feet apart*, not 50 feet. Campsites are just clearings initially.
- Requested large ~5-acre lake within ~100 feet of center, recessed into terrain with a gradual, substantial beach approximately 1/5 of its relevant shoreline, plus paths connecting the lake to campsites and intertwined paths.
- World-edge 360° HD panorama should use WV **New River Gorge / Grandview** as geographic visual target; keep sun separate from panorama to enable time-of-day shadows.
- Forest should be realistic, walkable and mobile-friendly, with true native mixed tall trees, logs, rocks and realistic terrain and well-spaced clearing paths. Do not claim the fixes are delivered without live test.
- Two parallel workstreams were happening in earlier chats; do not confuse a request about Lauren 3 with the other Gator's Wild 2 world work.

## Starting next session
1. Open original uploaded Laura Harris photo and `Laura 2 Facial Reference Views.png` as reference.
2. Test **v9 live on phone**: ensure viewer actually publishes and loads, with eyeballs fitting original flesh and no corner wedges; examine both frontal and side views, blink and gaze.
3. If v9 looks wrong, adjust **eyeball location/scale/iris materials, clipping and depth first**, not facial skin. Ask for new screenshot only if necessary; avoid repeated screenshots.
4. Keep source copy/approved 2.5 safe. Continue through GitHub, never Railway.