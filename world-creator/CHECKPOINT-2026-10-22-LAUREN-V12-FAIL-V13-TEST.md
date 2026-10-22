# Lauren 3 visual quality checkpoint — October 22, 2026

## Observations from phone screenshots of v12 (not approved)
1. Eyes do not track the actual eyelid openings. One sclera/iris assembly visibly bulges outside the far orbital area in oblique side views, and the two eyes look mismatched in front view.
2. Blue/grey gaps in eye corners show the viewer background, and dark/white photographic eye fragments may remain visible.
3. The lips show a thin blue opening: the facial shell has no modeled interior mouth/occluding inner surface. This is **not** an eye defect.
4. The crown/forehead ends in a jagged horizontal boundary because the current scan is **one open facial shell, not a closed head/skull**. Viewer camera limits only hide the back; they do not solve missing skull geometry.
5. Strong yellow/orange patches around brows and cheek, flat/washout appearance, and blurry stretched side details reduce likeness; source uses baked vertex colors. Defer global color matching until comparison with planned body as instructed.
6. Visible mouth opening, eyebrow/eyelash details, nose profile and facial symmetry require holistic reference-photo comparison; do not declare completion after fixing only eyes.

## Root cause v12
- The old rig uses r=64 pixel-space spherical eyeballs with single center depth estimated from narrow samples; the reconstructed photographed facial shell has strong depth variation across eye apertures.
- Moving both eyeball centers to aperture center improved alignment but did not solve sphere protrusion nor corner visibility.
- Root facial mesh has 38,365 vertices and 228,219 face-index elements, SHA-256 source GLB 27931d29e5366c452af77e7d182dd4eea3f444eebcc8e660134f7aa961c6298e. Preserve exact source.

## Isolated v13 experiment — UNVERIFIED / NOT APPROVED
- Viewer: https://wvlrp.com/lauren-3-eyeball-fit-v13.html
- Eye rig: world-creator/lauren3-eye-rig-v13.js
- Uses barycentric triangulated sampling of preserved 3D facial depth, conformal sclera patches, constrained independently movable iris overlays, and masked lids without rendering protruding 64-unit spherical globes.
- Original geometry/colors and Laura 2.5 remain unchanged; v12 also remains accessible.
- This is a **temporary visible eye assembly** until a true complete skull/orbit model exists; do not claim it is a complete eyeball rig. Eye controls remain functional at the preview stage.
- Changes have been committed to GitHub and file contents checked; **live browser/phone visual test not yet confirmed**. Test front, left, right, gaze, blink and rotation. Reject if pupils or sclera have depth/edge artifacts.
- Do not edit v12 or frozen assets when testing/fixing v13.

## Next independent improvements
- Reconstruct the missing upper/back head using reference geometry, rather than limiting the camera or painting over scalp boundary.
- Model an interior mouth behind original lips, with natural visible recess rather than the viewer blue backdrop; preserve actual existing lips.
- Check source face hue and multi-angle photo stretch without overriding its globally agreed skin colors before body match.
- Match the original Laura Harris reference images, focusing on eyebrow shapes, tear ducts, soft under-eye pads, gaze alignment, and overall likeness.
- Continue logging visual regressions. User expects issues to be independently discovered, not only corrected after prompts.
