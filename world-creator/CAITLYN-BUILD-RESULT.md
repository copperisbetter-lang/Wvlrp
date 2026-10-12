# Caitlyn latest automated builder result

Source GitHub SHA: `16b58d7632f988ef887f572397052d334c239a3f`

Workflow status before QA report: **failure**

These are Blender geometry checks, NOT approval of the appearance on Android.

```text
Traceback (most recent call last):
    raise RuntimeError(name+" unsupported joint alignment: "+
RuntimeError: Caitlyn ElbowsAndKnees unsupported joint alignment: (0.018, 0.013, 0.184)
WVLRP_CAITLYN_HAIR_SCALP_ANCHOR basemesh_top 1.6669 eyes 1.4082 scalp_top 1.5581 lowering 0.1088 skull_samples 2886
WVLRP_CAITLYN_SCALP_SURFACE_FIT 3754 3692 crown_only True lowest_allowed 1.475
WVLRP_CAITLYN_SUNDRESS_BUILT 644 440 rigged True hem_width_m 0.526 bodice_width_m 0.376
WVLRP_CAITLYN_GROUNDED_POSE Caitlyn HandsAndKnees contacts_height [0.025, 0.026, 0.093, 0.105] ground 0.062 contact_mismatch_m 0.073 root_hip_offset -10.529 knee_behind_hip [0.019, 0.012]
WVLRP_CAITLYN_SUPPORT_QA Caitlyn HandsAndKnees max_support_error_m 0.043 left_right_error_m 0.012
WVLRP_CAITLYN_SUPPORT_ALIGNMENT Caitlyn HandsAndKnees knee_fore_aft_m [0.019, 0.012] arm_fore_aft_m [0.028, 0.032] arm_lateral_m [-0.042, 0.032]
WVLRP_CAITLYN_POSTURE_QA Caitlyn HandsAndKnees hip_above_knees_m 0.381 chest_forward_m 0.276 shoulder_forward_m 0.333 torso_slope_m 0.168 hip_root_local_offset -10.529
WVLRP_CAITLYN_GROUNDED_POSE Caitlyn ElbowsAndKnees contacts_height [0.045, 0.045, 0.079, 0.08] ground 0.062 contact_mismatch_m 0.035 root_hip_offset -10.589 knee_behind_hip [0.018, 0.011]
WVLRP_CAITLYN_SUPPORT_QA Caitlyn ElbowsAndKnees max_support_error_m 0.018 left_right_error_m 0.0
WVLRP_CAITLYN_SUPPORT_ALIGNMENT Caitlyn ElbowsAndKnees knee_fore_aft_m [0.018, 0.011] arm_fore_aft_m [-0.009, 0.013] arm_lateral_m [-0.184, 0.183]
WVLRP_CAITLYN_POSTURE_QA Caitlyn ElbowsAndKnees hip_above_knees_m 0.36 chest_forward_m 0.264 shoulder_forward_m 0.285 torso_slope_m 0.145 hip_root_local_offset -10.589
LAST BUILDER OUTPUT:
WVLRP_CAITLYN_KNEE_DIRECTION Caitlyn Kneel lshin chosen_degrees -93.0 posterior_m 0.0238 candidates [(0.024, -1), (-0.353, 1)]
WVLRP_CAITLYN_KNEE_DIRECTION Caitlyn Kneel rshin chosen_degrees -93.0 posterior_m 0.351 candidates [(0.351, -1), (-0.353, 1)]
WVLRP_CAITLYN_POSE_CLIP Caitlyn Kneel 2
WVLRP_CAITLYN_KNEE_DIRECTION Caitlyn HandsAndKnees lshin chosen_degrees -98.0 posterior_m 0.0238 candidates [(0.024, -1), (-0.353, 1)]
WVLRP_CAITLYN_KNEE_DIRECTION Caitlyn HandsAndKnees rshin chosen_degrees -98.0 posterior_m 0.346 candidates [(0.346, -1), (-0.353, 1)]
WVLRP_CAITLYN_NECK_DIRECTION Caitlyn HandsAndKnees neck_x 0 head_x -5 upright 0.996 forward 0.996
WVLRP_CAITLYN_GROUNDED_POSE Caitlyn HandsAndKnees contacts_height [0.025, 0.026, 0.093, 0.105] ground 0.062 contact_mismatch_m 0.073 root_hip_offset -10.529 knee_behind_hip [0.019, 0.012]
WVLRP_CAITLYN_SUPPORT_QA Caitlyn HandsAndKnees max_support_error_m 0.043 left_right_error_m 0.012
WVLRP_CAITLYN_SUPPORT_ALIGNMENT Caitlyn HandsAndKnees knee_fore_aft_m [0.019, 0.012] arm_fore_aft_m [0.028, 0.032] arm_lateral_m [-0.042, 0.032]
WVLRP_CAITLYN_POSTURE_QA Caitlyn HandsAndKnees hip_above_knees_m 0.381 chest_forward_m 0.276 shoulder_forward_m 0.333 torso_slope_m 0.168 hip_root_local_offset -10.529
WVLRP_CAITLYN_POSE_CLIP Caitlyn HandsAndKnees 2
WVLRP_CAITLYN_KNEE_DIRECTION Caitlyn ElbowsAndKnees lshin chosen_degrees -100.0 posterior_m 0.0238 candidates [(0.024, -1), (-0.351, 1)]
WVLRP_CAITLYN_KNEE_DIRECTION Caitlyn ElbowsAndKnees rshin chosen_degrees -100.0 posterior_m 0.3432 candidates [(0.343, -1), (-0.351, 1)]
WVLRP_CAITLYN_NECK_DIRECTION Caitlyn ElbowsAndKnees neck_x 0 head_x -5 upright 0.996 forward 0.996
WVLRP_CAITLYN_ELBOW_SPINE_FIT from 0.0 to 48.0 elbow_knee_gap_m 0.0995
WVLRP_CAITLYN_ELBOW_ARM_FIT l from 102.0 to 150.0 elbow_knee_gap_m 0.0348
WVLRP_CAITLYN_FOREARM_FIT l palm_above_elbow_m 0.0302
WVLRP_CAITLYN_ELBOW_ARM_FIT r from 102.0 to 150.0 elbow_knee_gap_m 0.0351
WVLRP_CAITLYN_FOREARM_FIT r palm_above_elbow_m 0.0132
WVLRP_CAITLYN_GROUNDED_POSE Caitlyn ElbowsAndKnees contacts_height [0.045, 0.045, 0.079, 0.08] ground 0.062 contact_mismatch_m 0.035 root_hip_offset -10.589 knee_behind_hip [0.018, 0.011]
WVLRP_CAITLYN_SUPPORT_QA Caitlyn ElbowsAndKnees max_support_error_m 0.018 left_right_error_m 0.0
WVLRP_CAITLYN_SUPPORT_ALIGNMENT Caitlyn ElbowsAndKnees knee_fore_aft_m [0.018, 0.011] arm_fore_aft_m [-0.009, 0.013] arm_lateral_m [-0.184, 0.183]
WVLRP_CAITLYN_POSTURE_QA Caitlyn ElbowsAndKnees hip_above_knees_m 0.36 chest_forward_m 0.264 shoulder_forward_m 0.285 torso_slope_m 0.145 hip_root_local_offset -10.589

Blender quit
```
