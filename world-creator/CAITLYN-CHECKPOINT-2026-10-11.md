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


## October 11 follow-up: approved floor pose examples and skin consistency

User approved two reference positions (fully clothed examples solely to explain articulation):
1. **Hands and knees**: actual palm/wrist and both knees supporting the body on a common horizontal ground plane, hips bent, spine natural.
2. **Elbows and knees**: both forearms/elbows and both knees on the ground, hips flexed naturally; neck remains anatomical with no 180° twist.

These are REQUIRED shared animation capabilities for all present and future avatars, independent of their appearance. Begin by repairing Caitlyn's own source and verify her rebuilt GLB before expanding animation retargeting to Riley, Amy, and Christy/Chrissy.

Source checkpoint:
- Caitlyn Python builder now uses a single lighter, neutral fair PBR vertex-color palette for face and body; the previous face/body tone divergence should be inspected on the actual new GLB (not assumed fixed from code alone).
- New 5th exported clip `Caitlyn ElbowsAndKnees`. Original `Caitlyn HandsAndKnees` is fitted with joint-based floor contact evaluation. Knee-shin backward direction and head-forward orientation checks remain.
- Blender bone-position fitting samples joint world positions and vertically adjusts the hip root to the standing ground reference. Aborts build when knee/hand or knee/elbow contact planes mismatch by more than 14 cm; that is a tolerance, not a guarantee of perfect visual skin contact. Check for intersections, wrist/shoulder posture and feet visually.
- Caitlyn viewer now has an independent `Elbows & knees` button. World Creator selects and serializes `pose:"elbows"` without moving any prior characters; selecting elbows on other avatars is not evidence they already have an elbows animation.
- GLB generation is handled by `.github/workflows/build-caitlyn-mpfb.yml`; publishing requires successful workflow. **Do NOT claim user-visible update complete until actual rebuilt GLB changes, includes both named clips, displays matching face/body skin and passes phone pose screenshots.**
- Test source commits (Oct 11): `6e48e05` pose+skin builder, `f9eb18a` viewer, `9dccd3f` world renderer, `f27c27a` workflow. Preserve previous avatar geometry, styles, hair, and map coordinates.

Remaining: confirm automated build and published GLB, then inspect standing, bending, hands-and-knees and elbows-and-knees from two angles including face zoom; retarget the approved poses to the other rigged characters after Caitlyn verification. 
