#!/usr/bin/env python3
"""Exercise official Test Bone 1 Walk/Run actions on Beverly's isolated 69-joint graft.
Does not touch approved game. It is a motion smoke test, not visual acceptance.
"""
import bpy, json, math, os, re
from pathlib import Path
from mathutils import Vector
BASE=Path(os.environ.get("SURGERY_OUT","/tmp/beverly-surgery-room"))
f=BASE/"Beverly_TestBone1_GRAFT_TRIAL.blend"
assert f.is_file()
bpy.ops.wm.open_mainfile(filepath=str(f))
scene=bpy.context.scene
bevc=bpy.data.collections["01_BEVERLY_SURGERY_CLONE"]
donc=bpy.data.collections["02_TEST_BONE_1_REFERENCE"]
bev=next(o for o in bevc.objects if o.type=="ARMATURE")
donor=next(o for o in donc.objects if o.type=="ARMATURE")
assert len(bev.data.bones)==69 and len(donor.data.bones)==69
mesh=next(o for o in bevc.objects if o.type=="MESH" and len(o.data.vertices)>10000 and any(m.type=="ARMATURE" for m in o.modifiers))
assert donor.animation_data and len(donor.animation_data.nla_tracks)>=70
def get_action(clip):
    candidates=[]
    for track in donor.animation_data.nla_tracks:
        for strip in track.strips:
            a=strip.action
            if not a: continue
            key=[track.name,strip.name,a.name]
            if any(n.lower()==clip.lower() for n in key):
                candidates.append((0,a,track.name))
            elif any(clip.lower() in n.lower() for n in key):
                candidates.append((1,a,track.name))
    if not candidates:
        for a in bpy.data.actions:
            if a.name.lower()==clip.lower():
                candidates.append((2,a,"by action name"))
    assert candidates,("Missing native donor motion",clip)
    candidates.sort(key=lambda x:x[0])
    return candidates[0][1],candidates[0][2]

def mesh_points():
    dg=bpy.context.evaluated_depsgraph_get()
    evaluated=mesh.evaluated_get(dg)
    m=evaluated.to_mesh()
    stride=max(1,len(m.vertices)//400)
    points=[tuple(mesh.matrix_world @ m.vertices[i].co) for i in range(0,len(m.vertices),stride)]
    evaluated.to_mesh_clear()
    return points

def pose_reset():
    if bev.animation_data:
        bev.animation_data.action=None
    for pb in bev.pose.bones:
        pb.rotation_mode='QUATERNION'
        pb.rotation_quaternion=(1,0,0,0)
        pb.location=(0,0,0)
        pb.scale=(1,1,1)
    scene.frame_set(1)
    bpy.context.view_layer.update()
pose_reset()
rest=mesh_points()
rig_names={b.name for b in bev.data.bones}
report={}
for name in ["Walk","Run"]:
    a,track=get_action(name)
    matched_bones=set()
    for curve in a.fcurves:
        m=re.search(r'pose\.bones\["([^"]+)"\]',curve.data_path)
        if m and m.group(1) in rig_names:
            matched_bones.add(m.group(1))
    assert len(matched_bones)>=12,(name,"too few bone animation channels",len(matched_bones),a.name)
    pose_reset()
    bev.animation_data_create()
    bev.animation_data.action=a
    lo,hi=a.frame_range
    if hi-lo<1: raise ValueError("Motion clip has no duration: "+a.name)
    frames=sorted(set(round(lo+(hi-lo)*i/5) for i in range(6)))
    max_step=0
    displacement=[]
    bounds=[]
    for frame in frames:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        sample=mesh_points()
        assert len(sample)==len(rest)
        ds=[math.dist(rest[i],sample[i]) for i in range(len(rest))]
        assert all(math.isfinite(q) for q in ds)
        displacement.append(max(ds or [0]))
        bounds.append({"frame":frame,"x":[min(x[0] for x in sample),max(x[0] for x in sample)],
                 "y":[min(x[1] for x in sample),max(x[1] for x in sample)],
                 "z":[min(x[2] for x in sample),max(x[2] for x in sample)]})
        assert all(abs(c)<20 for p in sample for c in p),("Unreasonable motion coordinates",frame)
    max_motion=max(displacement)
    assert max_motion>0.005,(name,"Action did not move Beverly",displacement)
    report[name]={"action":a.name,"donor_nla_track":track,"matched_bone_animations":len(matched_bones),
             "timeline_range":[float(lo),float(hi)],"sample_frames":frames,
             "max_sampled_skin_displacement_from_rest_m":max_motion,
             "frame_max_displacements_m":displacement,"sampled_bounds":bounds,
             "verified":"Animation controls compatible bone paths and deforms clone mesh; visual gait NOT verified"}

# Save both actions as selectable NLA trials, both initially muted so the scene opens at rest.
pose_reset()
bev.animation_data_create()
bev.animation_data.action=None
for name in ["Walk","Run"]:
    act,_=get_action(name)
    track=bev.animation_data.nla_tracks.new()
    track.name="REVIEW_ONLY_TestBone1_"+name
    strip=track.strips.new("REVIEW_"+name,int(act.frame_range[0]),act)
    track.mute=True
scene["motion_trial_state"]="PASS: Walk/Run actions moved grafted clone, NLA tracks muted pending owner review"
scene["visual_motion_accepted"]=False
notes=bpy.data.texts.new("MOTION_REVIEW_INSTRUCTIONS")
notes.write("This is NOT a final animation retarget. Donor Walk and Run actions were tested on the 69-joint cloned Beverly graft with movement and finite mesh coordinates. NLA tracks REVIEW_ONLY_TestBone1_Walk and REVIEW_ONLY_TestBone1_Run are muted by default; unmute ONE for visual review. Character geometry and certified live Beverly unchanged. Exact natural walk/leg timing requires visual QA.\n")
path=BASE/"Beverly_TestBone1_WALK_RUN_REVIEW.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(path))
q={"status":"WALK_RUN_ACTION_SMOKE_PASS / VISUAL GAIT UNVERIFIED",
    "clone":"Beverly's separately backed up surgical clone",
    "donor":"official Test Bone 1 69-joint/77-animation Ara source",
    "grafted_rig_joint_count":len(bev.data.bones),
    "native_motion_clips":report,"visual_gait_accepted":False,
    "review_blend":path.name,"review_blend_bytes":path.stat().st_size,
    "original_game_untouched":True}
(BASE/"Beverly_TestBone1_MOTION_QA.json").write_text(json.dumps(q,indent=2)+"\n")
print("BEVERLY_MOTION_SMOKE_PASS",json.dumps({"Walk":report["Walk"]["max_sampled_skin_displacement_from_rest_m"],"Run":report["Run"]["max_sampled_skin_displacement_from_rest_m"],"bones":69,"blend_bytes":path.stat().st_size}),flush=True)
