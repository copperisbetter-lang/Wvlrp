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
if not any("Caroline light blue eyes" in o.name for o in meshes):
    raise RuntimeError("Carolyn natural blue iris meshes are missing")
if not any("period swept back hair" in o.name for o in meshes):
    raise RuntimeError("Caroline updo not on inspected copy")
rig=rigs[0]
if not any(o.data.shape_keys and "Carolyn Season 3 Facial Study" in o.data.shape_keys.key_blocks
           for o in meshes):
    raise RuntimeError("Carolyn face-morph shape key missing in inspection build")
wardrobe_names=("WVLRP WARDROBE Blouse","WVLRP WARDROBE Skirt","WVLRP WARDROBE Apron","WVLRP WARDROBE Left Boot","WVLRP WARDROBE Right Boot","WVLRP WARDROBE Sweater","WVLRP WARDROBE Pants")
missing_clothes=[name for name in wardrobe_names if not any(o.name==name and o.type=="MESH" and any(m.type=="ARMATURE" and m.object==rig for m in o.modifiers) for o in meshes)]
if missing_clothes:raise RuntimeError("Carolyn wardrobe meshes missing or unrigged: "+str(missing_clothes))
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

# Repair the known Mixamo pelvis-scale mismatch IN THE GLB, not in the
# viewer. Blender ground-fit logs show a 14.145-unit local hip adjustment
# corresponds to only 0.439m of body movement; the uncorrected exporter
# encodes the raw 14m and causes flight during Crawl and kneeling poses.
def repair_hip_translation(glb_path):
    raw=bytearray(glb_path.read_bytes())
    json_len,json_type=struct.unpack_from("<II",raw,12)
    if json_type!=0x4e4f534a:raise RuntimeError("GLB JSON chunk invalid")
    doc=json.loads(raw[20:20+json_len].decode("utf-8"))
    bin_at=20+json_len
    bin_size,bin_type=struct.unpack_from("<II",raw,bin_at)
    if bin_type!=0x004e4942:raise RuntimeError("GLB binary chunk invalid")
    bin_start=bin_at+8
    repaired=[]
    for anim in doc.get("animations",[]):
        for channel in anim.get("channels",[]):
            target=channel.get("target",{})
            if target.get("path")!="translation":continue
            node=doc["nodes"][target["node"]]
            if not node.get("name","").lower().endswith("hips"):continue
            accessor=doc["accessors"][anim["samplers"][channel["sampler"]]["output"]]
            if accessor["componentType"]!=5126 or accessor["type"]!="VEC3":
                raise RuntimeError("Unexpected exported hip translation format")
            view=doc["bufferViews"][accessor["bufferView"]]
            offset=bin_start+view.get("byteOffset",0)+accessor.get("byteOffset",0)
            stride=view.get("byteStride",12)
            baseline=node.get("translation",[0,0,0])
            samples=[]
            furthest=0.
            for i in range(accessor["count"]):
                at=offset+i*stride
                values=struct.unpack_from("<3f",raw,at)
                furthest=max(furthest,max(abs(values[j]-baseline[j]) for j in range(3)))
                samples.append((at,values))
            if furthest>1.5:
                for at,values in samples:
                    # glTF Y is UP and is already the correct 0.44m downward motion.
                    # Only X and Z contain the unscaled sideways/backward drift.
                    corrected=[baseline[0]+(values[0]-baseline[0])*0.0310,
                               values[1],
                               baseline[2]+(values[2]-baseline[2])*0.0310]
                    struct.pack_into("<3f",raw,at,*corrected)
                furthest*=0.0310
                repaired.append(anim.get("name","unnamed"))
            if furthest>.85:
                raise RuntimeError(anim.get("name","?")+" exported hip travel unsafe: "+
                                   str(round(furthest,3))+"m")
    if len(repaired)<3:
        raise RuntimeError("Expected to repair hip tracks for 3 grounded animations: "+str(repaired))
    glb_path.write_bytes(raw)
    print("WVLRP_CAROLINE_HIP_EXPORT_REPAIRED",repaired)

repair_hip_translation(output)
data=output.read_bytes()
if data[:4]!=b"glTF":raise RuntimeError("Caroline invalid GLB magic")
chunk_len,chunk_type=struct.unpack_from("<II",data,12)
meta=json.loads(data[20:20+chunk_len].decode("utf-8"))
verify_photo_skin_glb(meta,"Caroline")
wardrobe_materials={"WVLRP Wardrobe Blouse","WVLRP Wardrobe Skirt","WVLRP Wardrobe Apron","WVLRP Wardrobe Boots","WVLRP Wardrobe Sweater","WVLRP Wardrobe Pants"}
existing_materials={m.get("name","") for m in meta.get("materials",[])}
if not any("Caroline light blue iris" in m for m in existing_materials):
    raise RuntimeError("Carolyn blue-iris material missing from GLB")
missing_materials=wardrobe_materials-existing_materials
if missing_materials:raise RuntimeError("Missing exported clothing materials: "+str(sorted(missing_materials)))
clips={a.get("name","") for a in meta.get("animations",[])}
unexported=[name for name in required if name not in clips]
if unexported:raise RuntimeError("Caroline exported GLB animations missing: "+str(unexported))
if not any("Carolyn Season 3 Facial Study" in name
           for mesh in meta.get("meshes",[])
           for name in mesh.get("extras",{}).get("targetNames",[]) if isinstance(name,str)):
    raise RuntimeError("Carolyn face morph not exported to GLB")
if len(meta.get("skins",[]))!=1:raise RuntimeError("Caroline must export exactly one skin")
joints=len(meta["skins"][0].get("joints",[]))
if joints<25:raise RuntimeError("Caroline GLB rig has too few joints: "+str(joints))
names=[n.get("name","") for n in meta.get("nodes",[])]
if any("original human" in n.lower() for n in names):
    raise RuntimeError("Caroline source-copy contamination")
print("WVLRP_CAROLINE_GLB_SUCCESS",output,output.stat().st_size,
      "joints",joints,"animations",len(clips),"mesh_count",len(meta.get("meshes",[])))
