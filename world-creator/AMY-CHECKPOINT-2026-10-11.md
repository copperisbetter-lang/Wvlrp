# Amy — saved WVLRP 3D character checkpoint
Date: October 11, 2026

## Identity and intent
- Name: **Amy**. Brand-new separate **adult** 3D female test avatar for The Wild / WVLRP World Creator.
- **Do not overwrite, rename, or merge with Chrissy or Riley.** Those remain separate.
- Redhead: long naturally red/auburn hair, not the blonde used for Riley.
- **No clothes on the body mesh.** This is a base anatomy/rig test, with clothing as a possible future independent system.
- Complete continuous human torso, back, shoulders and neck, arms, legs, and head, not a hollow cutaway or flattened single-sided surface.
- Mature feminine figure, slim waist and hips, full naturally soft bust with **less exaggerated downward gravity than the latest Chrissy trial**.
- Natural consistent warm skin tone across head and body; no detached neck.
- Character is an original parametric test rather than an exact photogrammetric reconstruction.

## Implementation saved
- Generation source: `world-creator/scripts/build_amy_mpfb.py`
- MPFB GitHub Actions builder: `.github/workflows/build-amy-mpfb.yml`
- Babylon.js 3D inspection page: `world-creator/amy-mpfb-trial.html`
- Existing exported GLB found in GitHub: `world-creator/assets/amy-mpfb-trial.glb`
- Viewer: https://wvlrp.com/world-creator/amy-mpfb-trial.html
- MPFB macro configuration: female, cupsize 0.96, firmness 0.42 (softer gravity), slim body polish, long red hair CC0 asset, Mixamo-compatible rig.
- Viewer supports rotation and full-body / upper-body / face closeups with restricted camera penetration.

## Verification and next steps
- GitHub repository files above have been verified to exist.
- Presence of the GLB in the repository has been verified. No visual inspection of that exact 3D export has been completed in this checkpoint; **do not claim Amy's appearance is final or approved**.
- When continuing, inspect Amy at front / profile / back / overhead, including extreme close zoom for open geometry, and inspect chest contours. Make any fixes to Amy's own files without replacing Chrissy or Riley.
- Preserve this checkpoint as the character's design target even when updating source or generated assets.


## Pelvic mesh defect and repair source checkpoint (October 11)
- User observed a hollow spot around Amy's crotch after viewing the 3D character.
- Root cause suspected: `build_amy_mpfb.py` set `bake_masks=True`, which applies clothing/delete MASK modifiers and can permanently remove body surface polygons. See official MPFB export documentation.
- Source updated to call `ExportService.bake_modifiers_remove_helpers(...bake_masks=False...)` and explicitly **remove** any remaining MASK modifiers before exporting; retain helpers cleanup and rig.
- Added `check_and_repair_pelvic_surface`: inspect the base mesh's boundary edges around the pelvis, repair only fully enclosed small local border loops, recalculate normals, and **fail build** if any pelvic boundary edges remain. This does not substitute a garment, shell or fake colored patch for the missing human surface.
- Updated GLB cache keys in `studio.js`, `index.html`, and `amy-mpfb-trial.html` so a rebuilt Amy can be fetched rather than a previous cached GLB.
- Main source repair GitHub commit `980099e5a1a593762f5695def501ad4c72fd804c`.
- **Verification status:** Source files committed; the current `assets/amy-mpfb-trial.glb` file was still blob SHA `6715f7ee5a5f890c2109af0457c32e2848fc95fe` on last check, so the published 3D asset had not yet been verified rebuilt. Do not claim the user's visible hole has been fixed until the GLB's SHA changes and front/underside/close-up inspection succeeds.
- Preserve Amy as a separate test avatar at the same world map location, without touching Christy/Chrissy/Riley.
