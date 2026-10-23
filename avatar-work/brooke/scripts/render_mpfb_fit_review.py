"""Render non-production orthographic inspection views of Brooke MPFB candidate.
Usage: blender -b --python render_mpfb_fit_review.py -- candidate.glb output_dir
"""
import bpy, sys, math, json
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
source, dest=Path(args[0]),Path(args[1])
assert source.is_file(), f"Candidate missing: {source}"
dest.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert meshes, 'No mesh found in exported GLB'
assert all(len(o.data.vertices)>0 for o in meshes), 'Export contains an empty mesh'
# Compute world-space bounds, including imported GLB node transforms.
points=[o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
lo=Vector([min(p[i] for p in points) for i in range(3)])
hi=Vector([max(p[i] for p in points) for i in range(3)])
center=(lo+hi)*.5
size=max((hi-lo).length, .01)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=800
scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.world.color=(.18,.18,.18)
camera_data=bpy.data.cameras.new('Review orthographic camera')
camera=bpy.data.objects.new('Review camera',camera_data)
scene.collection.objects.link(camera)
scene.camera=camera
camera_data.type='ORTHO'
camera_data.ortho_scale=size*1.35
light_data=bpy.data.lights.new('Review area light','AREA')
light=bpy.data.objects.new('Review light',light_data)
scene.collection.objects.link(light)
light.location=center+Vector((size,size,size))
light_data.energy=850
light_data.shape='DISK'
light_data.size=size*1.2
def render(label,offset):
    camera.location=center+Vector(offset)*size
    direction=center-camera.location
    camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(dest/(label+'.png'))
    bpy.ops.render.render(write_still=True)
for name,offset in [('front',(0,-2,0)),('back',(0,2,0)),('left',(-2,0,0)),('right',(2,0,0)),('top',(0,0,2))]:
    render(name,offset)
(dest/'inspection.json').write_text(json.dumps({'source':str(source),'mesh_count':len(meshes),'meshes':[{'name':o.name,'vertices':len(o.data.vertices),'faces':len(o.data.polygons)} for o in meshes],'world_bounds_min':list(lo),'world_bounds_max':list(hi),'camera_assumption':'front -Y, verify visually','likeness_approved':False},indent=2))
print('BROOKE_REVIEW_RENDERS',str(dest),'meshes',len(meshes),'bounds',list(lo),list(hi))
print('VIEW LABELS ASSUME FRONT FACES -Y; verify orientation before likeness signoff')
