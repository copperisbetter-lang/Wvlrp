"""Export ONLY Caroline's validated inspection copy. No duplicated source heads.
Reject missing facial diffuse textures, body skin, skeletal animations and rigs.
The exported GLB is a QA artifact; public character approval is separate.
"""
import bpy, json, struct, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from face_materials import verify_photo_skin_glb
root_path=Path(__file__).resolve().parents[1]
output=root_path/"assets"/"caroline-inspection.glb"
marked=[o for o in bpy.data.objects if o.get("wvlrp_caroline_export_root",False)]
if len(marked)!=1:
    raise RuntimeError("Caroline export requires exactly one marked inspected character copy, got "+str(len(marked)))
avatar=marked[0]
members=[avatar]+list(avatar.children_recursive)
meshes=[o for o in members if o.type=="MESH" and not o.hide_render]
rigs=[o for o in members if o.type=="ARMATURE" and not o.hide_render]
if len(rigs)!=1:
    raise RuntimeError("Caroline export has "+str(len(rigs))+" armatures; expected exactly one")
if not any(len(o.data.vertices)>10000 for o in meshes):
    raise RuntimeError("Caroline export has no intact continuous adult basemesh")
if not any("period swept back hair" in o.name for o in meshes):
    raise RuntimeError("Caroline updo not on inspected copy")
rig=rigs[0]
nla=[t.name for t in rig.animation_data.nla_tracks] if rig.animation_data else []
required=["Caroline Stand","Caroline Walk","Caroline Run","Caroline Bend",
          "Caroline TouchToes","Caroline Sit","Caroline PickUp",
          "Caroline HandsAndKnees","Caroline ElbowsAndKnees",
          "Caroline Crawl","Caroline LieDown"]
missing=[n for n in required if n not in nla]
if missing:raise RuntimeError("Caroline animations missing from Blender: "+str(missing))
bpy.ops.object.select_all(action="DESELECT")
for ob in members:
    if ob.type in {"MESH","ARMATURE"} and not ob.hide_render:
        ob.select_set(True)
bpy.context.view_layer.objects.active=rig
output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",
    use_selection=True,export_apply=False,export_animations=True,
    export_nla_strips=True,export_materials="EXPORT")
if not output.exists() or output.stat().st_size<100000:
    raise RuntimeError("Caroline GLB missing or suspiciously small")
data=output.read_bytes()
if data[:4]!=b"glTF":raise RuntimeError("Caroline invalid GLB magic")
chunk_len,chunk_type=struct.unpack_from("<II",data,12)
meta=json.loads(data[20:20+chunk_len].decode("utf-8"))
verify_photo_skin_glb(meta,"Caroline")
clips={a.get("name","") for a in meta.get("animations",[])}
unexported=[name for name in required if name not in clips]
if unexported:raise RuntimeError("Caroline exported GLB animations missing: "+str(unexported))
if len(meta.get("skins",[]))!=1:raise RuntimeError("Caroline must export exactly one skin")
joints=len(meta["skins"][0].get("joints",[]))
if joints<25:raise RuntimeError("Caroline GLB rig has too few joints: "+str(joints))
names=[n.get("name","") for n in meta.get("nodes",[])]
if any("original human" in n.lower() for n in names):
    raise RuntimeError("Caroline source-copy contamination")
print("WVLRP_CAROLINE_GLB_SUCCESS",output,output.stat().st_size,
      "joints",joints,"animations",len(clips),"mesh_count",len(meta.get("meshes",[])))
