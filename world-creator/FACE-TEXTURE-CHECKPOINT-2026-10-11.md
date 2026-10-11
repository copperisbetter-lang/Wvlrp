# The Wild — Realistic female faces checkpoint (October 11, 2026)

## User direction
Mason is accepted as-is. Improve the realism of the women's faces, especially Caitlyn, Amy, and Chrissy, without changing their approved body proportions, hair, gait, animation clips, placements or Mason. Riley uses a different modeling pipeline and is unchanged in this pass.

## Root cause
All three MPFB export scripts replaced their original textured MakeHuman CC0 skin materials with an almost uniform solid or vertex-color shader. This removed the source image's real facial tones (eyelids, lips, nose, cheeks, fine color and complexion detail), regardless of skeletal face geometry.

## Source fixes committed to main
- `world-creator/scripts/face_materials.py`: preserve original UV diffuse image into an export-compatible Principled PBR material; force transparent-free Base Color, leave existing rig and geometry alone; fail if photo image or UV absent; check exported GLB JSON for embedded skin image and TEXCOORD_0.
- `world-creator/scripts/build_caitlyn_mpfb.py`: use texture-aware helper, keep existing smile morph + five poses + platinum hair and anatomy unchanged.
- `world-creator/scripts/build_amy_mpfb.py`: use texture-aware helper, keep original proportions and rig unchanged.
- `world-creator/scripts/build_riley_mpfb_trial.py` (Chrissy): use texture-aware helper, keep original Chrissy proportions and outfit unchanged.
- Build workflows for the three characters now include the helper in push triggers and independently require a CC0 body-skin baseColorTexture.
- `world-creator/studio.js` plus the world creator and standalone viewers now point at new `cc0-face-texture-20261011-v1` cache keys.
- The three standalone viewers warn if the imported GLB still has the old, untextured face skin. Chrissy now has a face close-up control.

## Verification / honesty
Source and viewer changes were committed. At this checkpoint, **do not claim published GLB output or visual result confirmed**: the MakeHuman/Blender GitHub Actions builds are triggered by the scripts/workflow changes and must complete successfully and deploy before a visual comparison. Older binary meshes can still be present on the site. Check the new workflow's texture assertions, then view in browser and inspect face, matching neck tone, eyelashes, expressions, hairline, and whether original UV mapping is correct. If the original skin UV does not match the mesh, investigate the MakeHuman image atlas rather than silently replacing it with flat skin again.

## Review URLs
- https://wvlrp.com/world-creator/caitlyn-mpfb-trial.html
- https://wvlrp.com/world-creator/amy-mpfb-trial.html
- https://wvlrp.com/world-creator/chrissy.html
- https://wvlrp.com/world-creator/
