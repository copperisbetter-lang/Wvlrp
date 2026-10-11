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

## October 11 ~6:12 PM user's actual screenshots
Caitlyn displayed an uncanny doll face from front and three-quarter angle: unnaturally broad cheek-to-cheek smile, high-contrast lips, dark near-red eyes, flat gray face against peach torso, and stiff blocky platinum hair. Viewer warning explicitly says **"Older Caitlyn 3D file — photographic face texture not published yet"**. **Do not claim skin issue fixed.**
- Found browser and map both forced her CC0 smile morph to influence `0.78`. Standalone Caitlyn viewer now defaults to **0** (relaxed/neutral) and smile button toggles only **0.18**, while retaining original two named smile morphs. Her map preview sets only **Caitlyn** influence to 0; **Mason** kept at original visual settings.
- Changed Caitlyn builder to export facial smile shapekeys at **default influence 0**, so importing the GLB anywhere doesn't create a fixed eerie grin. This triggers an additional build.
- Verified on public GitHub Actions page that Caitlyn's phototexture build run #13 was **waiting** behind prior run #11 (run #12 was canceled as an older waiting job), not successful. Newest subsequent run needs independent checking. Facial photo texture has not been visually validated.
- **Next test:** wait for most recent build to complete, make sure its exported GLB includes face+body diffuse map and retains rig, skeleton, 5 clips and two smile morphs. Test neutral face and subtle smile on phone, especially side silhouette, natural eye color, lip shape, jaw, complexion consistency and scalp/hair. The present low-poly hair and head geometry may need a better asset/sculpt even with correct texture.
