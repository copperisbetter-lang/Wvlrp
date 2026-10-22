"""Render an inspection PNG from Brooke's generated GLB using Blender."""
import bpy, math
from pathlib import Path
from mathutils import Vector
source=Path('avatar-work/brooke/brooke-head-prototype.glb').resolve()
if not source.is_file(): raise FileNotFoundError(source)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes: raise RuntimeError('GLB has no meshes')
bpy.ops.object.camera_add(location=(2.0,-3.8,1.1))
camera=bpy.context.object
direction=Vector((0,0,0))-camera.location
camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=3.0
bpy.context.scene.camera=camera
for pos,power,size in [((2,-3,4),650,4),((-3,-2,2),350,3)]:
 bpy.ops.object.light_add(type='AREA',location=pos)
 light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.render.resolution_x=800;scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world.color=(.13,.13,.13)
out=Path('avatar-work/brooke/brooke-preview.png').resolve()
scene.render.filepath=str(out)
bpy.ops.render.render(write_still=True)
print('BROOKE_PREVIEW_EXPORTED',out)
