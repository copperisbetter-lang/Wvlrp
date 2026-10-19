"""CAR 3.5B: install the proven CAR 3.5A body-skin material on CAR 3's fitted attachment.
Never overwrite the CAR 3 source model.
"""
import bpy, json, struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]
src=root/"assets/car3-integrated-vulva1.glb"
dst=root/"assets/car35b-integrated-skin.glb"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(src))
meshes=[o for o in bpy.data.objects if o.type=="MESH"]
addons=[o for o in meshes if "CAR3 Vulva1 MakeHuman fitted" in o.name]
bodies=[o for o in meshes if o not in addons and len(o.data.vertices)>10000]
if len(addons)!=1 or not bodies: raise RuntimeError("Expected exactly one attachment and source body")
addon=addons[0]
body=max(bodies,key=lambda o:len(o.data.vertices))
if not addon.data.uv_layers.active: raise RuntimeError("Attachment UVs missing")
skin=body.data.materials[0]
if skin is None: raise RuntimeError("Body material missing")
addon.data.materials.clear()
addon.data.materials.append(skin)
bpy.ops.export_scene.gltf(filepath=str(dst),export_format="GLB",export_skins=True,export_animations=True)
raw=dst.read_bytes()
if raw[:4]!=b"glTF": raise RuntimeError("Invalid GLB")
n,k=struct.unpack_from("<II",raw,12)
gltf=json.loads(raw[20:20+n])
if not gltf.get("textures"): raise RuntimeError("Skin texture missing in export")
print("CAR35B_READY",dst,len(raw))
