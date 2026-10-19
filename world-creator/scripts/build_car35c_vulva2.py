"""CAR 3.5C: transfer CAR2's fitted Vulva2 mesh onto CAR3 and use CAR3 skin material.
This is an isolated fit/material test. Original assets are never overwritten.
"""
import bpy
from pathlib import Path
from mathutils import Matrix
root=Path(__file__).resolve().parents[1]
car3=root/"assets/car3-integrated-vulva1.glb"
car2=root/"assets/car2-completed.glb"
out=root/"assets/car35c-vulva2-integrated.glb"
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(car3))
rigs=[o for o in bpy.data.objects if o.type=="ARMATURE"]
if not rigs: raise RuntimeError("CAR3 armature missing")
rig=max(rigs,key=lambda x:len(x.data.bones))
bodies=[o for o in bpy.data.objects if o.type=="MESH" and len(o.data.vertices)>10000 and "CAR3 Vulva1" not in o.name]
if not bodies: raise RuntimeError("CAR3 body missing")
body=max(bodies,key=lambda o:len(o.data.vertices))
old=[o for o in bpy.data.objects if "CAR3 Vulva1 MakeHuman fitted" in o.name]
if len(old)!=1:raise RuntimeError("CAR3 Vulva1 not uniquely identified")
for o in old:bpy.data.objects.remove(o,do_unlink=True)
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(car2))
imported=[o for o in bpy.data.objects if o not in before]
addons=[o for o in imported if o.type=="MESH" and "vulva2" in o.name.lower()]
if len(addons)!=1:raise RuntimeError("CAR2 fitted Vulva2 not uniquely identified: "+str([o.name for o in imported if o.type=="MESH"]))
addon=addons[0]
# Transfer the exact CAR2 mesh placement in world coordinates, then bind to CAR3 pelvis.
world=addon.matrix_world.copy()
for mod in list(addon.modifiers):
 if mod.type=="ARMATURE":addon.modifiers.remove(mod)
addon.parent=None;addon.matrix_world=world
for group in list(addon.vertex_groups):addon.vertex_groups.remove(group)
group=addon.vertex_groups.new(name="Pelvis")
group.add(list(range(len(addon.data.vertices))),1.0,"REPLACE")
mod=addon.modifiers.new("CAR3 pelvis attachment","ARMATURE");mod.object=rig
addon.parent=rig
addon.matrix_world=world
# Use CAR3's own texture material and UV coordinates where the donor UV layout is compatible.
# A material-only swap is not proof of UV compatibility; visual inspection remains mandatory.
if not body.data.materials or not addon.data.uv_layers.active:
 raise RuntimeError("Missing body material or donor UV")
addon.data.materials.clear();addon.data.materials.append(body.data.materials[0])
for o in imported:
 if o!=addon:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format="GLB",export_skins=True,export_animations=True)
if out.stat().st_size<100000:raise RuntimeError("Export too small")
print("CAR35C_READY",out,out.stat().st_size)
