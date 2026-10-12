# Sha latest automated builder result

Source GitHub SHA: `4ac2f561822035dfe0e44555b72bffa39163f4ac`

Workflow status before QA report: **failure**

These are Blender geometry checks, NOT approval of the appearance on Android.

```text
Traceback (most recent call last):
    if abs(slope)<.03: raise RuntimeError("Sha hip vertical control cannot reach floor")
RuntimeError: Sha hip vertical control cannot reach floor
WVLRP_SHA_HAIR_SCALP_ANCHOR basemesh_top 1.6669 eyes 1.364 scalp_top 1.5139 lowering 0.1529 skull_samples 2056
LAST BUILDER OUTPUT:
WVLRP_SHA_TOPOLOGY_BEFORE boundary_edges 0 pelvis_boundary_edges 0
WVLRP_SHA_PELVIS_QA patched_faces 0 remaining_open_edges 0
WVLRP_SHA_SOFT_FACE_ONLY 4421 body_and_eye_size_unchanged True
WVLRP_SHA_FACEUNIT right targets/faceunits/mouthSmileRight.target 33258
WVLRP_SHA_FACEUNIT left targets/faceunits/mouthSmileLeft.target 32657
WVLRP_SHA_SMILE_MORPH left Sha Natural Smile Left 0.0
WVLRP_SHA_SMILE_MORPH right Sha Natural Smile Right 0.0
WVLRP_SHA_UNCLOTHED_BODY 13380 13378
WVLRP_RIG Sha - MPFB original body mesh.rig_wvrlp_ref 52
WVLRP_SHA_HAIR_SCALP_ANCHOR basemesh_top 1.6669 eyes 1.364 scalp_top 1.5139 lowering 0.1529 skull_samples 2056
WVLRP_SHA_HAIR_ONLY_CAP new_cap_vertices 672 no_copied_head_polygons True crown_top 1.4956 hairline 1.4423
WVLRP_SHA_HAIR_NO_CROWN_SHELF True
WVLRP_SHA_FLOWING_STRAND_HAIR 64232 61914 head_bone mixamorig:Head world_height 1.666 removed_stock_cape True
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

Blender quit
```
