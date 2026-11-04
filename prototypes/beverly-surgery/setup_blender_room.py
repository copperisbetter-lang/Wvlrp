#!/usr/bin/env python3
"""Blender-only surgery prep: two clean imports in separate collections; no weight transfer."""
import bpy, json, os, pathlib

base=pathlib.Path(os.environ.get("SURGERY_OUT","/tmp/beverly-surgery-room")).resolve()
beverly=base/"Beverly_SURGERY_CLONE.glb"
donor=base/"Test_Bone_1_SOURCE_DONOR.glb"
assert beverly.is_file() and donor.is_file()

bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.length_unit='METERS'
scene["surgery_state"]="PREPARED / NO RIG TRANSFER / CERTIFIED ORIGINAL PROTECTED"
scene["approved_source_sha256"]="fc55a17bb9c228ecc1a2a3f24ccd5e3a4ec26a987cb2ffe123ce00d12530a7fc"

def import_into(path, collection_name, object_prefix):
    before={obj.as_pointer() for obj in bpy.data.objects}
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported=[obj for obj in bpy.data.objects if obj.as_pointer() not in before]
    assert imported, "Blender imported no objects from "+str(path)
    group=bpy.data.collections.new(collection_name)
    scene.collection.children.link(group)
    for obj in imported:
        for col in list(obj.users_collection):
            col.objects.unlink(obj)
        group.objects.link(obj)
        obj.name=object_prefix+"__"+obj.name
    arms=[obj for obj in imported if obj.type=="ARMATURE"]
    assert arms, "Missing actual armature for "+str(path)
    meshes=[obj for obj in imported if obj.type=="MESH"]
    assert meshes, "Missing actual mesh for "+str(path)
    return group, imported, arms, meshes

clone_group,clone_objs,clone_arms,clone_meshes=import_into(
    beverly,"01_BEVERLY_SURGERY_CLONE","SURG_BEVERLY")
assert any(len(x.data.bones)==52 for x in clone_arms),[(x.name,len(x.data.bones)) for x in clone_arms]
scene["beverly_clone_mesh_objects"]=len(clone_meshes)
bpy.ops.wm.save_as_mainfile(filepath=str(base/"Beverly_SURGERY_CLONE_ONLY.blend"))

donor_group,donor_objs,donor_arms,donor_meshes=import_into(
    donor,"02_TEST_BONE_1_REFERENCE","REF_TEST_BONE_1")
assert any(len(x.data.bones)==69 for x in donor_arms),[(x.name,len(x.data.bones)) for x in donor_arms]
donor_group.hide_render=True
donor_group.hide_viewport=True
scene["test_bone_1_donor_mesh_objects"]=len(donor_meshes)
scene["rig_transfer_applied"]=False

notes=bpy.data.texts.new("READ_THIS_BEFORE_SURGERY")
notes.write("""Beverly Surgery Room / Work Copy\n
01_BEVERLY_SURGERY_CLONE : separate import of BYTE-IDENTICAL certified Beverly game GLB.
02_TEST_BONE_1_REFERENCE : official Ara donor; 69 joints and 77 clips.
Donor is hidden initially to prevent overlap; enable its collection deliberately to inspect.
No rig, mesh, UV, weights, clothing, animations, or skin data transferred.
Do NOT treat Test Bone 1's rig as equivalent to Beverly's 52-joint rig until mapping and pose QA.
The approved Beverly live game source is not overwritten. Source clones are saved alongside this BLEND.
""")
bpy.ops.wm.save_as_mainfile(filepath=str(base/"Beverly_SURGERY_ROOM.blend"))
room_size=(base/"Beverly_SURGERY_ROOM.blend").stat().st_size
audit={
    "surgery_room_blend":"Beverly_SURGERY_ROOM.blend",
    "beverly_editable_blend":"Beverly_SURGERY_CLONE_ONLY.blend",
    "original_certified_source":"Preserved outside scene, byte-identical copy in artifact",
    "clone_mesh_objects":len(clone_meshes),
    "clone_armatures":[{"name":o.name,"joints":len(o.data.bones)} for o in clone_arms],
    "donor_mesh_objects":len(donor_meshes),
    "donor_armatures":[{"name":o.name,"joints":len(o.data.bones)} for o in donor_arms],
    "donor_hidden_initially":True,
    "meshes_modified":False,
    "skeleton_transplanted":False,
    "blend_file_bytes":room_size,
    "blender_version":bpy.app.version_string,
}
(base/"Blender_Surgery_Room_QA.json").write_text(json.dumps(audit,indent=2)+"\n")
print("BEVERLY_SURGERY_ROOM_PREPARED",json.dumps(audit))
