# Sha latest automated builder result

Source GitHub SHA: `21fbc7aab73bd048d45fced3b7cd2ce2ac3ae81e`

Workflow status before QA report: **success**

These are Blender geometry checks, NOT approval of the appearance on Android.

```text
WVLRP_SHA_HAIR_SCALP_ANCHOR basemesh_top 1.6669 eyes 1.364 scalp_top 1.5139 lowering 0.1529 skull_samples 2056
WVLRP_SHA_GROUNDED_POSE Sha HandsAndKnees contacts_height [0.011, 0.013, 0.104, 0.115] ground 0.061 contact_mismatch_m 0.097 root_hip_offset -0.395 knee_behind_hip [0.017, 0.01]
WVLRP_SHA_SUPPORT_QA Sha HandsAndKnees max_support_error_m 0.054 left_right_error_m 0.011
WVLRP_SHA_SUPPORT_ALIGNMENT Sha HandsAndKnees knee_fore_aft_m [0.017, 0.01] arm_fore_aft_m [0.048, 0.052] arm_lateral_m [-0.08, 0.067]
WVLRP_SHA_POSTURE_QA Sha HandsAndKnees hip_above_knees_m 0.373 chest_forward_m 0.254 shoulder_forward_m 0.309 torso_slope_m 0.185 hip_root_local_offset -0.395
WVLRP_SHA_GROUNDED_POSE Sha ElbowsAndKnees contacts_height [0.069, 0.07, 0.051, 0.053] ground 0.061 contact_mismatch_m 0.018 root_hip_offset -0.356 knee_behind_hip [0.022, 0.014]
WVLRP_SHA_SUPPORT_QA Sha ElbowsAndKnees max_support_error_m 0.01 left_right_error_m 0.002
WVLRP_SHA_SUPPORT_ALIGNMENT Sha ElbowsAndKnees knee_fore_aft_m [0.022, 0.014] arm_fore_aft_m [0.003, 0.002] arm_lateral_m [-0.0, 0.001]
WVLRP_SHA_POSTURE_QA Sha ElbowsAndKnees hip_above_knees_m 0.354 chest_forward_m 0.264 shoulder_forward_m 0.284 torso_slope_m 0.106 hip_root_local_offset -0.356
WVLRP_SHA_MPFB_SUCCESS
LAST BUILDER OUTPUT:
WVLRP_SHA_KNEE_DIRECTION Sha ElbowsAndKnees rshin chosen_degrees 100.0 posterior_m 0.2782 candidates [(-0.33, -1), (0.278, 1)]
WVLRP_SHA_NECK_DIRECTION Sha ElbowsAndKnees neck_x -55 head_x -25 upright 0.982 forward 0.98
WVLRP_SHA_FORWARD_SPINE_FIT Sha ElbowsAndKnees angle 10 chest_forward 0.31
WVLRP_SHA_ELBOW_SPINE_FIT from 10.0 to 58.0 elbow_knee_gap_m 0.1376
WVLRP_SHA_ELBOW_ARM_FIT l from 102.0 to 150.0 elbow_knee_gap_m 0.075
WVLRP_SHA_FOREARM_FIT l palm_above_elbow_m 0.0198
WVLRP_SHA_ELBOW_ARM_FIT r from 102.0 to 150.0 elbow_knee_gap_m 0.0749
WVLRP_SHA_FOREARM_FIT r palm_above_elbow_m 0.0212
WVLRP_SHA_ELBOW_SHOULDER_WIDTH_FIT l pitch 170.0 yaw -56 lateral_m -0.0003 height_m -0.0185
WVLRP_SHA_ELBOW_SHOULDER_WIDTH_FIT r pitch 170.0 yaw 55 lateral_m 0.0006 height_m -0.0165
WVLRP_SHA_HIP_VERTICAL_AXIS Sha ElbowsAndKnees 1 response 0.9991
WVLRP_SHA_GROUNDED_POSE Sha ElbowsAndKnees contacts_height [0.069, 0.07, 0.051, 0.053] ground 0.061 contact_mismatch_m 0.018 root_hip_offset -0.356 knee_behind_hip [0.022, 0.014]
WVLRP_SHA_SUPPORT_QA Sha ElbowsAndKnees max_support_error_m 0.01 left_right_error_m 0.002
WVLRP_SHA_SUPPORT_ALIGNMENT Sha ElbowsAndKnees knee_fore_aft_m [0.022, 0.014] arm_fore_aft_m [0.003, 0.002] arm_lateral_m [-0.0, 0.001]
WVLRP_SHA_POSTURE_QA Sha ElbowsAndKnees hip_above_knees_m 0.354 chest_forward_m 0.264 shoulder_forward_m 0.284 torso_slope_m 0.106 hip_root_local_offset -0.356
WVLRP_SHA_POSE_CLIP Sha ElbowsAndKnees 2
INFO Draco mesh compression is available, use library at /tmp/blender-4.2.0-linux-x64/4.2/python/lib/python3.11/site-packages/libextern_draco.so

WVLRP_REAL_FACE_GLB_VERIFIED Sha textured_skin_materials 1 images 3
WVLRP_SHA_EXPORTED_MATERIALS ['Sha dark natural brows', 'Sha natural brown lashes', 'Sha - MPFB original body mesh.high-poly', 'Sha natural dark brunette flowing hair 0', 'Sha natural dark brunette flowing hair 1', 'Sha natural dark brunette flowing hair 2', 'Sha natural dark brunette flowing hair 3', 'Sha - MPFB original body mesh.teeth_base', 'Sha real CC0 face and body skin UV 0']
WVLRP_RESULT_GLB /home/runner/work/Wvlrp/Wvlrp/world-creator/assets/sha-mpfb-trial.glb 17179304 skins 1 joint_count 52 animations 5 meshes 6
WVLRP_PREVIEW_SAVED /home/runner/work/Wvlrp/Wvlrp/world-creator/assets/sha-mpfb-trial-preview.png 710572
WVLRP_SHA_MPFB_SUCCESS

Blender quit
```
