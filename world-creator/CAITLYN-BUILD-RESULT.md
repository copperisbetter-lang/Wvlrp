# Caitlyn latest automated builder result

Source GitHub SHA: `8e6819ce050af31515e5387a5b694897335f9d0b`

Workflow status before QA report: **success**

These are Blender geometry checks, NOT approval of the appearance on Android.

```text
WVLRP_CAITLYN_HAIR_SCALP_ANCHOR basemesh_top 1.6669 eyes 1.4082 scalp_top 1.5581 lowering 0.1088 skull_samples 2886
WVLRP_CAITLYN_SCALP_SURFACE_FIT 3754 3692 crown_only True lowest_allowed 1.475
WVLRP_CAITLYN_SUNDRESS_BUILT 644 440 rigged True hem_width_m 0.526 bodice_width_m 0.376
WVLRP_CAITLYN_GROUNDED_POSE Caitlyn HandsAndKnees contacts_height [0.025, 0.026, 0.093, 0.105] ground 0.062 contact_mismatch_m 0.073 root_hip_offset -10.529 knee_behind_hip [0.019, 0.012]
WVLRP_CAITLYN_SUPPORT_QA Caitlyn HandsAndKnees max_support_error_m 0.043 left_right_error_m 0.012
WVLRP_CAITLYN_SUPPORT_ALIGNMENT Caitlyn HandsAndKnees knee_fore_aft_m [0.019, 0.012] arm_fore_aft_m [0.028, 0.032] arm_lateral_m [-0.042, 0.032]
WVLRP_CAITLYN_POSTURE_QA Caitlyn HandsAndKnees hip_above_knees_m 0.381 chest_forward_m 0.276 shoulder_forward_m 0.333 torso_slope_m 0.168 hip_root_local_offset -10.529
WVLRP_CAITLYN_GROUNDED_POSE Caitlyn ElbowsAndKnees contacts_height [0.093, 0.093, 0.031, 0.032] ground 0.062 contact_mismatch_m 0.061 root_hip_offset -9.366 knee_behind_hip [0.018, 0.011]
WVLRP_CAITLYN_SUPPORT_QA Caitlyn ElbowsAndKnees max_support_error_m 0.031 left_right_error_m 0.001
WVLRP_CAITLYN_SUPPORT_ALIGNMENT Caitlyn ElbowsAndKnees knee_fore_aft_m [0.018, 0.011] arm_fore_aft_m [0.016, 0.02] arm_lateral_m [0.001, -0.001]
WVLRP_CAITLYN_POSTURE_QA Caitlyn ElbowsAndKnees hip_above_knees_m 0.36 chest_forward_m 0.264 shoulder_forward_m 0.285 torso_slope_m 0.145 hip_root_local_offset -9.366
WVLRP_RENDER_WARNING Traceback (most recent call last):
WVLRP_CAITLYN_MPFB_SUCCESS
LAST BUILDER OUTPUT:
WVLRP_CAITLYN_SUPPORT_QA Caitlyn ElbowsAndKnees max_support_error_m 0.031 left_right_error_m 0.001
WVLRP_CAITLYN_SUPPORT_ALIGNMENT Caitlyn ElbowsAndKnees knee_fore_aft_m [0.018, 0.011] arm_fore_aft_m [0.016, 0.02] arm_lateral_m [0.001, -0.001]
WVLRP_CAITLYN_POSTURE_QA Caitlyn ElbowsAndKnees hip_above_knees_m 0.36 chest_forward_m 0.264 shoulder_forward_m 0.285 torso_slope_m 0.145 hip_root_local_offset -9.366
WVLRP_CAITLYN_POSE_CLIP Caitlyn ElbowsAndKnees 2
INFO Draco mesh compression is available, use library at /tmp/blender-4.2.0-linux-x64/4.2/python/lib/python3.11/site-packages/libextern_draco.so

WVLRP_REAL_FACE_GLB_VERIFIED Caitlyn textured_skin_materials 1 images 3
WVLRP_CAITLYN_EXPORTED_MATERIALS ['Caitlyn cool blonde brows', 'Caitlyn natural brown lashes', 'Caitlyn - MPFB original body mesh.high-poly', 'Caitlyn platinum ash blonde flowing hair 0', 'Caitlyn platinum ash blonde flowing hair 1', 'Caitlyn platinum ash blonde flowing hair 2', 'Caitlyn platinum ash blonde flowing hair 3', 'Caitlyn - MPFB original body mesh.teeth_base', 'Caitlyn real CC0 face and body skin UV 0', 'Caitlyn dark realistic pupils', 'Caitlyn light blue iris', 'Caitlyn soft iris fibers', 'Caitlyn subtle limbal ring', 'Sundress blue cotton', 'Sundress pale blue cotton', 'Sundress ivory trim']
WVLRP_RESULT_GLB /home/runner/work/Wvlrp/Wvlrp/world-creator/assets/caitlyn-mpfb-trial.glb 15642336 skins 1 joint_count 52 animations 5 meshes 8
WVLRP_RENDER_WARNING Traceback (most recent call last):
  File "/home/runner/work/Wvlrp/Wvlrp/world-creator/scripts/build_caitlyn_mpfb.py", line 1269, in main
    scene.view_settings.look="Medium High Contrast"
    ^^^^^^^^^^^^^^^^^^^^^^^^
TypeError: bpy_struct: item.attr = val: enum "Medium High Contrast" not found in ('None', 'AgX - Punchy', 'AgX - Greyscale', 'AgX - Very High Contrast', 'AgX - High Contrast', 'AgX - Medium High Contrast', 'AgX - Base Contrast', 'AgX - Medium Low Contrast', 'AgX - Low Contrast', 'AgX - Very Low Contrast')

WVLRP_CAITLYN_MPFB_SUCCESS
Blender 4.2.0 (hash a51f293548ad built 2024-07-16 06:27:02)
OBJ import of 'base.obj' took 13.48 ms
OBJ import of 'high-poly.obj' took 1.49 ms
OBJ import of 'eyebrow001.obj' took 0.20 ms
OBJ import of 'eyelashes01.obj' took 0.32 ms
OBJ import of 'teeth_base.obj' took 2.63 ms
OBJ import of 'long01.obj' took 1.70 ms

Blender quit
```
