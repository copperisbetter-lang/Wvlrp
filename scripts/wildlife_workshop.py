#!/usr/bin/env python3
"""The Wild: inspect imported animal GLB in Blender and make turntable previews.
No automatic 'rigging' claims: movement requires species-specific bones/weights.
"""
import bpy, json, math, os, sys
from mathutils import Vector

argv=sys.argv[sys.argv.index("--")+1:]
asset=argv[0]; out=argv[1]
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(asset))
meshes=[o for o in bpy.data.objects if o.type=="MESH"]
armatures=[o for o in bpy.data.objects if o.type=="ARMATURE"]
animations=list(bpy.data.actions)
if not meshes: raise RuntimeError("GLB contains no mesh objects")
bpy.context.view_layer.update()
pts=[o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
low=[min(p[i] for p in pts) for i in range(3)]
high=[max(p[i] for p in pts) for i in range(3)]
center=Vector([(low[i]+high[i])/2 for i in range(3)])
size=[high[i]-low[i] for i in range(3)]
report={
 "source_file":os.path.basename(asset),
 "mesh_count":len(meshes),
 "triangle_count":sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in meshes),
 "material_count":len(bpy.data.materials),
 "armature_count":len(armatures),
 "bone_count":sum(len(a.data.bones) for a in armatures),
 "animation_count":len(animations),
 "animation_names":[a.name for a in animations],
 "bounding_box_dimensions":size,
 "rigging_status":"has armature; review weights and motion" if armatures else "UNRIGGED — requires animal skeleton and skin weights",
 "production_ready":False,
 "notes":"Turntable preview only. No procedural limb deformation or validated animal motion."
}
with open(os.path.join(out,"inspection.json"),"w") as f:json.dump(report,f,indent=2)
print("INSPECTION",json.dumps(report))
# Render four studio-preview angles. Do not edit original source geometry.
bpy.ops.object.light_add(type="AREA", location=(4,-5,8))
bpy.context.object.data.energy=1200
bpy.context.object.data.shape="DISK"
bpy.context.object.data.size=5
world=bpy.context.scene.world or bpy.data.worlds.new("Workshop World")
bpy.context.scene.world=world
world.use_nodes=True
world.node_tree.nodes.get("Background").inputs["Color"].default_value=(0.20,0.23,0.25,1)
world.node_tree.nodes.get("Background").inputs["Strength"].default_value=0.8
bpy.ops.object.camera_add()
cam=bpy.context.object
bpy.context.scene.camera=cam
extent=max(size) if max(size)>0 else 1.0
scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE_NEXT" if bpy.app.version >= (4,2,0) else "BLENDER_EEVEE"
scene.render.resolution_x=720;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
for ix,angle in enumerate((0,90,180,270)):
 theta=math.radians(angle)
 cam.location=center+Vector((math.sin(theta)*extent*2.4,-math.cos(theta)*extent*2.4,extent*0.9))
 direction=center-cam.location
 cam.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
 cam.data.type="ORTHO"
 cam.data.ortho_scale=extent*2.5
 scene.render.filepath=os.path.abspath(os.path.join(out,f"view_{angle:03d}.png"))
 bpy.ops.render.render(write_still=True)
