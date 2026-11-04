#!/usr/bin/env python3
"""Export POST-OP Beverly's actual approved-shape clone + 77 donor motions, not Test Bone 1 body.
Input is the isolated 69-joint graft .blend; do not touch live game or original.
"""
import bpy, os, json, hashlib, struct, re, math
from pathlib import Path
ROOT=Path(os.environ.get("SURGERY_OUT","/tmp/beverly-postop")).resolve()
ROOT.mkdir(parents=True,exist_ok=True)
source=ROOT/"Beverly_TestBone1_GRAFT_TRIAL.blend"
assert source.is_file(),source
bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.context.scene
bevgroup=bpy.data.collections["01_BEVERLY_SURGERY_CLONE"]
donorgroup=bpy.data.collections["02_TEST_BONE_1_REFERENCE"]
bev=next(x for x in bevgroup.objects if x.type=="ARMATURE")
donor=next(x for x in donorgroup.objects if x.type=="ARMATURE")
bevmeshes=[x for x in bevgroup.objects if x.type=="MESH"]
assert len(bev.data.bones)==69 and len(donor.data.bones)==69
assert len(bevmeshes)==31
assert donor.animation_data and len(donor.animation_data.nla_tracks)==77

# Collect all unique native Ara animations already imported with the original donor.
native=[]
for track in donor.animation_data.nla_tracks:
    for strip in track.strips:
        act=strip.action
        if act is not None:
            native.append((track.name,act))
assert len(native)==77,("Unexpected donor clip count",len(native))

# Do NOT mesh-join, resculpt, or copy donor geometry onto Beverly.
# Change only independent clone's NLA animation tracks.
if bev.animation_data:
    bev.animation_data_clear()
bev.animation_data_create()
for i,(name,act) in enumerate(native):
    track=bev.animation_data.nla_tracks.new()
    label=name.strip() or act.name.strip() or "Motion "+str(i+1)
    track.name="CLIP_%02d__%s"%(i,label)
    start=float(act.frame_range[0])
    track.strips.new(label,math.floor(start),act)
    track.mute=False

# Ensure NO armature action is active (each motion is its own NLA track).
bev.animation_data.action=None
for pb in bev.pose.bones:
    pb.rotation_mode="QUATERNION"
    pb.rotation_quaternion=(1,0,0,0)
    pb.location=(0,0,0)
    pb.scale=(1,1,1)
scene.frame_set(1)
scene.render.fps=30
bpy.context.view_layer.update()

# Export selection strictly Beverly: its actual 31 original meshes plus 69-joint graft rig.
bpy.ops.object.select_all(action="DESELECT")
for obj in bevgroup.objects:
    obj.hide_set(False)
    obj.hide_viewport=False
    obj.select_set(True)
bpy.context.view_layer.objects.active=bev
for obj in donorgroup.objects:
    obj.select_set(False)

path=ROOT/"Beverly_Postop_77.glb"
args=dict(filepath=str(path), export_format="GLB", use_selection=True,
          export_animations=True,export_animation_mode="NLA_TRACKS",
          export_nla_strips=True,export_force_sampling=False,
          export_materials="EXPORT",export_normals=True,export_texcoords=True,
          export_skins=True,export_cameras=False,export_lights=False)
result=bpy.ops.export_scene.gltf(**args)
assert "FINISHED" in result,result
size=path.stat().st_size
with path.open("rb") as f: raw=f.read()
assert raw[:4]==b"glTF" and struct.unpack_from("<I",raw,8)[0]==len(raw)
length,chunk=struct.unpack_from("<I4s",raw,12)
assert chunk==b"JSON"
doc=json.loads(raw[20:20+length])
names=[a.get("name","") for a in doc.get("animations",[])]
n=len(names)
count_skins=[len(s.get("joints",[])) for s in doc.get("skins",[])]
assert n==77,("Exporter did not export all 77 native clips",n,names)
assert 69 in count_skins,("Wrong exported rig",count_skins)
assert len(doc.get("meshes",[]))>=25,("Missing Beverly geometry",len(doc.get("meshes",[])))
assert not any("REF_TEST_BONE_1" in nd.get("name","") for nd in doc.get("nodes",[])), "Donor body leaked into Beverly viewer"
audit=[]
for i,a in enumerate(doc["animations"]):
    channels=a.get("channels",[])
    target_nodes=set(c["target"].get("node") for c in channels)
    assert len(target_nodes)>=8,("Motion without rig channels",i,names[i],len(target_nodes))
    audit.append(dict(index=i,name=names[i],target_nodes=len(target_nodes),
                      channels=len(channels),source_track=native[i][0],source_action=native[i][1].name))
manifest={
"character":"Beverly POST-OP surgery clone / Certified approved dressed-game appearance",
"source":"Independent surgically grafted Beverly clone, NOT native Ara donor body",
"rig_joints":count_skins,
"mesh_count":len(doc.get("meshes",[])),
"motion_count":n,
"motion_names":names,
"motion_details":audit,
"GLB_size_bytes":size,
"GLB_SHA256":hashlib.sha256(raw).hexdigest(),
"experimental":True,
"gait_visually_approved":False,
"game_or_master_modified":False,
"live_viewer_path":"world-creator/character-previews/beverly-postop/viewer.html"
}
(ROOT/"Beverly_Postop_77_QA.json").write_text(json.dumps(manifest,indent=2)+"\n")
print("BEVERLY_77_EXPORT_QA_PASS",json.dumps({
"motions":n,"joints":count_skins,"meshes":len(doc["meshes"]),
"size":size,"sha":manifest["GLB_SHA256"],
"first":names[:3],"last":names[-3:]}),flush=True)
