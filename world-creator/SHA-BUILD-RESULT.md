# Sha latest automated builder result

Source GitHub SHA: `3561f084f483bce07e4d6fd979080d8c1ee57c89`

Workflow status before QA report: **failure**

These are Blender geometry checks, NOT approval of the appearance on Android.

```text
Traceback (most recent call last):
    raise RuntimeError(name+
RuntimeError: Sha HandsAndKnees does not lower the torso into a grounded quadrupedal pose
WVLRP_SHA_GROUNDED_POSE Sha HandsAndKnees contacts_height [0.079, 0.081, 0.045, 0.037] ground 0.061 contact_mismatch_m 0.039 root_hip_offset -1.012 knee_behind_hip [-0.012, -0.016]
WVLRP_SHA_SUPPORT_QA Sha HandsAndKnees max_support_error_m 0.023 left_right_error_m 0.008
WVLRP_SHA_SUPPORT_ALIGNMENT Sha HandsAndKnees knee_fore_aft_m [-0.012, -0.016] arm_fore_aft_m [0.017, 0.023] arm_lateral_m [-0.1, 0.101]
WVLRP_SHA_POSTURE_QA Sha HandsAndKnees hip_above_knees_m -0.312 chest_forward_m 0.251 shoulder_forward_m 0.306 torso_slope_m 0.174 hip_root_local_offset -1.012
LAST BUILDER OUTPUT:
WVLRP_SHA_FACEUNIT right targets/faceunits/mouthSmileRight.target 33258
WVLRP_SHA_FACEUNIT left targets/faceunits/mouthSmileLeft.target 32657
WVLRP_SHA_SMILE_MORPH left Sha Natural Smile Left 0.0
WVLRP_SHA_SMILE_MORPH right Sha Natural Smile Right 0.0
WVLRP_SHA_UNCLOTHED_BODY 13380 13378
WVLRP_RIG Sha - MPFB original body mesh.rig_wvrlp_ref 52
WVLRP_SHA_EXPORT_HAIRLESS True
WVLRP_SHA_BONE_MAP {'hips': 'mixamorig:Hips', 'spine': 'mixamorig:Spine', 'chest': 'mixamorig:Spine2', 'neck': 'mixamorig:Neck', 'head': 'mixamorig:Head', 'lthigh': 'mixamorig:LeftUpLeg', 'rthigh': 'mixamorig:RightUpLeg', 'lshin': 'mixamorig:LeftLeg', 'rshin': 'mixamorig:RightLeg', 'larm': 'mixamorig:LeftArm', 'rarm': 'mixamorig:RightArm', 'lforearm': 'mixamorig:LeftForeArm', 'rforearm': 'mixamorig:RightForeArm', 'lhand': 'mixamorig:LeftHand', 'rhand': 'mixamorig:RightHand', 'lfoot': 'mixamorig:LeftFoot', 'rfoot': 'mixamorig:RightFoot'}
WVLRP_SHA_RIG_REST_GROUND 0.0607
WVLRP_SHA_POSE_CLIP Sha Stand 3
WVLRP_SHA_POSE_CLIP Sha Bend 2
WVLRP_SHA_KNEE_DIRECTION Sha Kneel lshin chosen_degrees -93.0 posterior_m 0.2722 candidates [(0.272, -1), (-0.293, 1)]
WVLRP_SHA_KNEE_DIRECTION Sha Kneel rshin chosen_degrees -93.0 posterior_m 0.2722 candidates [(0.272, -1), (-0.293, 1)]
WVLRP_SHA_POSE_CLIP Sha Kneel 2
WVLRP_SHA_KNEE_DIRECTION Sha HandsAndKnees lshin chosen_degrees 98.0 posterior_m 0.2684 candidates [(-0.318, -1), (0.268, 1)]
WVLRP_SHA_KNEE_DIRECTION Sha HandsAndKnees rshin chosen_degrees 98.0 posterior_m 0.2671 candidates [(-0.316, -1), (0.267, 1)]
WVLRP_SHA_NECK_DIRECTION Sha HandsAndKnees neck_x -55 head_x -25 upright 0.982 forward 0.981
WVLRP_SHA_FORWARD_SPINE_FIT Sha HandsAndKnees angle 35 chest_forward 0.251
WVLRP_SHA_HIP_VERTICAL_AXIS Sha HandsAndKnees 1 response 0.9991
WVLRP_SHA_GROUNDED_POSE Sha HandsAndKnees contacts_height [0.079, 0.081, 0.045, 0.037] ground 0.061 contact_mismatch_m 0.039 root_hip_offset -1.012 knee_behind_hip [-0.012, -0.016]
WVLRP_SHA_SUPPORT_QA Sha HandsAndKnees max_support_error_m 0.023 left_right_error_m 0.008
WVLRP_SHA_SUPPORT_ALIGNMENT Sha HandsAndKnees knee_fore_aft_m [-0.012, -0.016] arm_fore_aft_m [0.017, 0.023] arm_lateral_m [-0.1, 0.101]
WVLRP_SHA_POSTURE_QA Sha HandsAndKnees hip_above_knees_m -0.312 chest_forward_m 0.251 shoulder_forward_m 0.306 torso_slope_m 0.174 hip_root_local_offset -1.012

Blender quit
```
