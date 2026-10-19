"""Standalone Vulva2 skin preview, following the CAR3.5A material-only experiment.
No changes to CAR2 or CAR3. Do not install into a character in this stage.
"""
import bpy,json,struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]
donor=root/"assets/car2-completed.glb"
target=root/"assets/car3-integrated-vulva1.glb"
output=root/"assets/vulva2-standalone-skin-preview.glb"
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(donor))
donor_objects=list(bpy.data.objects)
addons=[o for o in donor_objects if o.type=="MESH" and "vulva2" in o.name.lower()]
if len(addons)!=1:raise RuntimeError("Expected exactly one original CAR2 Vulva2 mesh: "+str([o.name for o in donor_objects if o.type=="MESH"]))
addon=addons[0]
if not addon.data.uv_layers.active:raise RuntimeError("Vulva2 UV map missing")
# Import CAR3 only to acquire its real skin shader and embedded image.
bpy.ops.import_scene.gltf(filepath=str(target))
new=[o for o in bpy.data.objects if o not in donor_objects]
bodies=[o for o in new if o.type=="MESH" and len(o.data.vertices)>10000 and "vulva" not in o.name.lower()]
if not bodies:raise RuntimeError("CAR3 body skin source missing")
body=max(bodies,key=lambda o:len(o.data.vertices))
if not body.data.materials or not body.data.materials[0]:raise RuntimeError("CAR3 body skin material missing")
skin=body.data.materials[0]
if not skin.use_nodes or not any(n.type=="TEX_IMAGE" and n.image for n in skin.node_tree.nodes):
 raise RuntimeError("Skin image texture missing")
addon.data.materials.clear();addon.data.materials.append(skin)
# Keep the original CAR2 attachment and its armature for a true standalone preview.
rig=addon.parent if addon.parent and addon.parent.type=="ARMATURE" else None
if rig is None:
 armatures=[m.object for m in addon.modifiers if m.type=="ARMATURE" and m.object]
 rig=armatures[0] if armatures else None
if rig is None:raise RuntimeError("CAR2 Vulva2 attachment armature missing")
bpy.ops.object.select_all(action="DESELECT")
addon.select_set(True);rig.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",export_skins=True,export_animations=False,use_selection=True)
raw=output.read_bytes()
if raw[:4]!=b"glTF":raise RuntimeError("Invalid GLB")
n,k=struct.unpack_from("<II",raw,12)
gltf=json.loads(raw[20:20+n])
if not gltf.get("textures") or not gltf.get("images"):raise RuntimeError("Export lost skin texture")
print("VULVA2_STANDALONE_READY",len(raw),output)
