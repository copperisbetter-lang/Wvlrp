# Caitlyn — separate MPFB animated character prototype
Date: October 11, 2026

## Requested design
- **Caitlyn** is a new, separate **adult** test character for WVLRP's *The Wild*. Do NOT modify Amy, Christy/Chrissy, Riley, or any existing world-map placements.
- Platinum-blonde, gently wavy, long hair.
- Smaller bust, approximately half Amy's visual fullness, with a soft gravity-influenced contour. MPFB cupsize set to 0.50 vs Amy's 0.96; *not* a literal halving of anatomical circumference.
- Same unclothed continuous anatomical test-basemesh workflow with skin and rig. Never apply garment masks to remove body surface.
- Improved skin appearance: gentle procedurally derived vertex color and light PBR subsurface scattering, without incorrect UV texture mapping. Keep head, body and neck the same base skin shader.
- **Four exported Mixamo-armature animated clips:** `Caitlyn Stand`, `Caitlyn Bend`, `Caitlyn Kneel`, and `Caitlyn HandsAndKnees`.

## Source and viewer
- Blender builder: `world-creator/scripts/build_caitlyn_mpfb.py`
- Dedicated workflow: `.github/workflows/build-caitlyn-mpfb.yml`
- Viewer: `world-creator/caitlyn-mpfb-trial.html`
- Expected generated files: `world-creator/assets/caitlyn-mpfb-trial.glb`, `world-creator/assets/caitlyn-mpfb-trial-preview.png`
- URL (valid *after* workflow publishes GLB): https://wvlrp.com/world-creator/caitlyn-mpfb-trial.html

## QA caveat
The GitHub workflow will generate and publish the source-derived GLB on the branch when successful. A source commit is not proof of a finished GLB, good hair shape, closed pelvic mesh, convincing face, or correct hands-and-knees posture. The exported model must have at least 25 joints and all four animation clips. Inspect from front, side, rear, overhead, and zoomed face, and test motion to see whether the skeleton/constraints need adjustment. Do not say this was verified before inspecting live model outputs. Caitlyn is **not placed on The Wild map** until the user chooses to do that.
