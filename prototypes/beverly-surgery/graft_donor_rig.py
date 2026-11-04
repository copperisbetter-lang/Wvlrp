#!/usr/bin/env python3
"""Isolated Test Bone 1 rig-graft trial on approved Beverly's SURGERY CLONE.
NEVER touches original production mesh, approved game or live scenes.
This is a rest-pose preserving donor-hierarchy graft, NOT a vetted final animation retarget.
"""
import bpy, os, json, hashlib, struct, math, re
from pathlib import Path
from mathutils import Matrix, Vector

BASE=Path(os.environ.get("SURGERY_OUT","/tmp/beverly-surgery-room")).resolve()
SOURCE_BLEND=BASE/"Beverly_SURGERY_ROOM.blend"
assert SOURCE_BLEND.is_file()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))
scene=bpy.context.scene

def coll(name):
    x=bpy.data.collections.get(name)
    assert x is not None,name
    return x
bev_group=coll("01_BEVERLY_SURGERY_CLONE")
donor_group=coll("02_TEST_BONE_1_REFERENCE")
bev_arms=[x for x in bev_group.objects if x.type=="ARMATURE"]
donor_arms=[x for x in donor_group.objects if x.type=="ARMATURE"]
assert len(bev_arms)==1 and len(donor_arms)==1,(bev_arms,donor_arms)
bev=bev_arms[0]; donor=donor_arms[0]
assert len(bev.data.bones)==52 and len(donor.data.bones)==69
bev_meshes=sorted([x for x in bev_group.objects if x.type=="MESH"], key=lambda x:x.name)
assert len(bev_meshes)==31,len(bev_meshes)

# Object-space vertex and face count snapshot; source approved positions never edited.
def geom_hash():
    h=hashlib.sha256()
    for obj in bev_meshes:
        h.update(obj.name.encode())
        h.update(struct.pack("<II",len(obj.data.vertices),len(obj.data.polygons)))
        for vert in obj.data.vertices:
            h.update(struct.pack("<fff",vert.co.x,vert.co.y,vert.co.z))
        for poly in obj.data.polygons:
            h.update(struct.pack("<I",len(poly.vertices)))
            for index in poly.vertices:
                h.update(struct.pack("<I",index))
    return h.hexdigest()
original_geometry_sha=geom_hash()

def neutral_rest(arm):
    if arm.animation_data:
        arm.animation_data_clear()
    for pb in arm.pose.bones:
        pb.rotation_mode="QUATERNION"
        pb.rotation_quaternion=(1,0,0,0)
        pb.location=(0,0,0)
        pb.scale=(1,1,1)
    scene.frame_set(1)
    bpy.context.view_layer.update()
neutral_rest(bev)

def evaluated_points(limit=75):
    deps=bpy.context.evaluated_depsgraph_get()
    result=[]
    for obj in bev_meshes:
        e=obj.evaluated_get(deps)
        m=e.to_mesh()
        n=len(m.vertices)
        stride=max(1,n//limit)
        points=[tuple(obj.matrix_world @ m.vertices[i].co) for i in range(0,n,stride)]
        result.append((obj.name,points))
        e.to_mesh_clear()
    return result
rest_before=evaluated_points()

def canonical(name): return re.sub(r"^mixamorig[:_]?", "",name)
dnames={x.name for x in donor.data.bones}
mapping={b.name:canonical(b.name) for b in bev.data.bones if canonical(b.name) in dnames}
assert len(mapping)>=48,("Too few donor matches",len(mapping),sorted(mapping.items()))
old_bones={x.name for x in bev.data.bones}
donor_order=[x for x in donor.data.bones]
donor_extra=sorted(dnames-set(mapping.values()))
assert len(donor_extra)==69-len(mapping),(len(donor_extra),len(mapping))

# Blender object is the already-independent Beverly clone. Rename only this working copy's bone
# names to match official Ara GLTF animation channel targets; preserve all original mesh weights.
bpy.ops.object.select_all(action="DESELECT")
bev.hide_set(False)
bev.select_set(True)
bpy.context.view_layer.objects.active=bev
bpy.ops.object.mode_set(mode="EDIT")
edit=bev.data.edit_bones
for old,new in mapping.items():
    if old!=new:
        edit[old].name=new
bpy.ops.object.mode_set(mode="OBJECT")
for obj in bev_meshes:
    for old,new in mapping.items():
        if old==new:continue
        vg=obj.vertex_groups.get(old)
        if vg is not None and obj.vertex_groups.get(new) is None:
            vg.name=new

# Graft donor-only end/facial/socket bones to ORIGINAL Beverly rest limb positions.
# Matrices are inherited from each matching donor parent in parent's local bone space.
bpy.ops.object.mode_set(mode="EDIT")
edit=bev.data.edit_bones
remaining={b.name:b for b in donor_order if b.name not in edit}
pass_count=0
added=[]
while remaining and pass_count < 80:
    pass_count += 1
    progress=0
    for name,b in list(remaining.items()):
        if b.parent is None or b.parent.name not in edit:
            continue
        parent_edit=edit[b.parent.name]
        parent_donor=b.parent
        factor=parent_edit.length/max(parent_donor.length,0.0001)
        factor=max(0.4,min(2.5,factor))
        relative=parent_donor.matrix_local.inverted_safe() @ b.matrix_local
        relative.translation *= factor
        target=parent_edit.matrix @ relative
        bone=edit.new(name)
        bone.parent=parent_edit
        bone.use_connect=False
        bone.head=target.translation
        bone.tail=target @ Vector((0,max(0.015,b.length*factor),0))
        if (bone.tail-bone.head).length < .005:
            bone.tail=bone.head+Vector((0,.025,0))
        bone.align_roll(target.to_3x3() @ Vector((0,0,1)))
        bone.use_deform=False  # Extra helper joints have no Beverly source weights
        added.append(name)
        remaining.pop(name)
        progress+=1
    if progress==0: break
bpy.ops.object.mode_set(mode="OBJECT")
assert not remaining,("Unmapped donor hierarchy",list(remaining.keys()))
assert len(bev.data.bones)==69,("Expected final 69-bone graft",len(bev.data.bones))

# Armature modifiers must continue to target the working clone, not donor.
unskinned_static=[]
skinned=[]
for obj in bev_meshes:
    mods=[m for m in obj.modifiers if m.type=="ARMATURE"]
    if not mods:
        unskinned_static.append(obj.name)
        continue
    skinned.append(obj.name)
    for m in mods:
        assert m.object==bev,("Incorrect armature modifier",obj.name,m.object)
assert len(skinned)>=20,("Too few actual bound meshes",len(skinned),unskinned_static)
assert geom_hash()==original_geometry_sha,"SOURCE MESH POSITIONS OR FACES CHANGED"

neutral_rest(bev)
rest_after=evaluated_points()
diff=[]
for (name,a),(name2,b) in zip(rest_before,rest_after):
    assert name==name2 and len(a)==len(b)
    diff.extend(math.dist(x,y) for x,y in zip(a,b))
max_rest_delta=max(diff or [0])
assert max_rest_delta < 0.001,("GRAFT CHANGED REST APPEARANCE",max_rest_delta)

# First useful motion-stage check: inspect native available actions, but do not
# apply donor action if we cannot safely identify 'Walk'/'Run' bone channel groups.
actions=[{"name":a.name,"fcurves":len(getattr(a,"fcurves",[]))} for a in bpy.data.actions]
tracks=[{"name":t.name,"strips":[{"name":s.name,"action":s.action.name if s.action else None} for s in t.strips]}
        for t in (donor.animation_data.nla_tracks if donor.animation_data else [])]
scene["surgery_state"]="FIRST GRAFT PERFORMED ON CLONE / DONOR RETARGET NOT YET VISUALLY APPROVED"
scene["rig_transfer_applied"]=True
scene["original_geometry_sha256"]=original_geometry_sha
scene["original_source_sha256"]="fc55a17bb9c228ecc1a2a3f24ccd5e3a4ec26a987cb2ffe123ce00d12530a7fc"
scene["grafted_donor_additional_bones"]=len(added)

note=bpy.data.texts.get("GRAFT_TRIAL_NOTES") or bpy.data.texts.new("GRAFT_TRIAL_NOTES")
note.write("Trial 1: donor rig's 69 naming/parent topology transplanted into independent Beverly 52-bone rig. Original 52 joint bind placements preserved. Extra donor end/face bones from local parent-frame matching; no source weights on new bones. Vertex group names remapped to donor-compatible names; all mesh vertices untouched. DO NOT merge into original/live. Donor native animations not yet vetted. QA report included.\n")
out=BASE/"Beverly_TestBone1_GRAFT_TRIAL.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(out),compress=False)
audit={
"state":"FIRST GRAFT / EXPERIMENTAL",
"clone_69_joint_skeleton":len(bev.data.bones),
"beverly_original_bones":len(old_bones),
"matched_old_to_donor_names":mapping,
"added_donor_only_joint_names":added,
"donor_only_joint_count":len(added),
"beverly_mesh_count":len(bev_meshes),
"armature_bound_mesh_count":len(skinned),
"original_unskinned_static_meshes":unskinned_static,
"beverly_geometry_sha256_before_and_after":original_geometry_sha,
"max_evaluated_rest_pose_position_change_m":max_rest_delta,
"source_approved_glb_sha256":"fc55a17bb9c228ecc1a2a3f24ccd5e3a4ec26a987cb2ffe123ce00d12530a7fc",
"donor_reference_bones":len(donor.data.bones),
"donor_nla_tracks":tracks,
"available_blender_actions":actions,
"graft_trial_file":out.name,
"graft_trial_file_size":out.stat().st_size,
"limitations":"This is a 69-bone rig-schema graft on Beverly's CLONE, not a proof of natural walk/run motion or a final donor skeleton swap. No public deployment or original edits."}
(BASE/"Beverly_TestBone1_GRAFT_QA.json").write_text(json.dumps(audit,indent=2)+"\n")
print("BEVERLY_GRAFT_TRIAL_QA_PASS",json.dumps({"bones":69,"mapped":len(mapping),"added":len(added),"rest_delta_m":max_rest_delta,"mesh_count":len(bev_meshes),"blend_bytes":out.stat().st_size,"donor_NLA":len(tracks)}),flush=True)
