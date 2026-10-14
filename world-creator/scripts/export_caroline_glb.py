"""Export Caroline's validated Blender foundation to a GLB for private inspection.
Not a final approved clothed game character; public publication remains gated.
"""
import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
output=root/"assets"/"caroline-inspection.glb"
meshes=[o for o in bpy.data.objects if o.type=="MESH" and not o.hide_render]
rigs=[o for o in bpy.data.objects if o.type=="ARMATURE"]
if not meshes or not rigs:
    raise RuntimeError("Caroline export refused: mesh or armature missing")
if not any(len(o.data.vertices)>10000 for o in meshes):
    raise RuntimeError("Caroline export refused: complete basemesh missing")
bpy.ops.object.select_all(action="DESELECT")
for obj in bpy.data.objects:
    if obj.type in {"MESH","ARMATURE"} and not obj.hide_render:
        obj.select_set(True)
bpy.context.view_layer.objects.active=rigs[0]
output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",use_selection=True,export_apply=False)
if not output.exists() or output.stat().st_size<100000:
    raise RuntimeError("Caroline GLB missing or suspiciously small")
print("WVLRP_CAROLINE_GLB_SUCCESS",output,output.stat().st_size)
