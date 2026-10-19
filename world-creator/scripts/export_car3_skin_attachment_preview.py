"""Build a standalone CAR3 skin-material inspection GLB without modifying CAR3.
Run after build_car3_vulva1.py:
 blender -b -t 2 --python world-creator/scripts/export_car3_skin_attachment_preview.py
The resulting GLB is an isolated inspection asset, NOT an installed character.
"""
import bpy
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / "assets/car3-integrated-vulva1.glb"
output = root / "assets/car3-skin-attachment-preview.glb"
if not source.is_file():
    raise RuntimeError("Build car3-integrated-vulva1.glb first; original CAR3 remains untouched")
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
addons = [o for o in bpy.data.objects if o.type == "MESH"
          and "CAR3 Vulva1 MakeHuman fitted" in o.name]
bodies = [o for o in bpy.data.objects if o.type == "MESH"
          and "CAR3 Vulva1 MakeHuman fitted" not in o.name
          and len(o.data.vertices) > 10000]
if len(addons) != 1 or not bodies:
    raise RuntimeError("Expected one fitted attachment and one high-resolution source body")
addon = addons[0]
body = max(bodies, key=lambda o: len(o.data.vertices))
if not body.data.materials or not body.data.materials[0]:
    raise RuntimeError("CAR3 body skin material missing")
if not addon.data.uv_layers.active:
    raise RuntimeError("Attachment has no UV map: do not export flat color")
# Reuse the SAME source material datablock, not a guessed RGB tint.
skin = body.data.materials[0]
addon.data.materials.clear()
addon.data.materials.append(skin)
if skin.use_nodes and not any(n.type == "TEX_IMAGE" and n.image
                              for n in skin.node_tree.nodes):
    raise RuntimeError("No image texture found in skin shader; inspect source before approval")
# Keep original rig to preserve attachment placement/skinning in preview.
rig = addon.parent if addon.parent and addon.parent.type == "ARMATURE" else None
if rig is None:
    raise RuntimeError("Attachment lost pelvis rig; refusing misleading preview")
for o in bpy.data.objects:
    o.select_set(False)
addon.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB",
                          export_skins=True, export_animations=False,
                          use_selection=True)
raw = output.read_bytes()
if raw[:4] != b"glTF":
    raise RuntimeError("Invalid standalone GLB")
length, kind = struct.unpack_from("<II", raw, 12)
if kind != 0x4e4f534a:
    raise RuntimeError("Invalid JSON chunk")
gltf = json.loads(raw[20:20+length])
if not any("CAR3 Vulva1 MakeHuman fitted" in n.get("name","")
           for n in gltf.get("nodes", [])):
    raise RuntimeError("Standalone export lost attachment")
if not gltf.get("textures") or not gltf.get("images"):
    raise RuntimeError("Standalone export lost actual skin texture")
print("CAR3_STANDALONE_SKIN_ATTACHMENT_READY", output, len(raw),
      "images", len(gltf["images"]), "textures", len(gltf["textures"]))
