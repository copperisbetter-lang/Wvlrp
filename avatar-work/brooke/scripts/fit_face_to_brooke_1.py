"""Fit photo-reconstructed Brooke facial geometry as a separate inspection layer
on the independent Brooke 1.0 body. Never overwrite Sophie 1 or claim a
seamless head replacement before topology and landmark validation.
Usage: blender -b --python fit_face_to_brooke_1.py -- base.glb face.glb out.glb
"""
import bpy, sys
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
base, face, destination=args[:3]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=base)
body=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert body,'Brooke 1.0 base has no meshes'
# Preserve the approved clone exactly: never alter source mesh vertex arrays.
bbox=[o.matrix_world@Vector(corner) for o in body for corner in o.bound_box]
minx,maxx=min(p.x for p in bbox),max(p.x for p in bbox)
miny,maxy=min(p.y for p in bbox),max(p.y for p in bbox)
minz,maxz=min(p.z for p in bbox),max(p.z for p in bbox)
height=maxy-miny
assert height>0,'Body bounds invalid'
# Head region estimate only. Human inspection is mandatory before merging.
head_center=Vector(((minx+maxx)/2,maxy-height*.095,(minz+maxz)/2))
bpy.ops.import_scene.gltf(filepath=face)
new=[o for o in bpy.context.selected_objects if o.type=='MESH']
assert new,'No photo face mesh found'
for i,obj in enumerate(new):
    obj.name='BROOKE_FACE_FIT_CANDIDATE_%02d'%i
    obj.rotation_euler=(0,0,0)
    bpy.context.view_layer.update()
    local=[obj.matrix_world@Vector(c) for c in obj.bound_box]
    size=max(p.x for p in local)-min(p.x for p in local)
    assert size>0,'Photo face bounds invalid'
    target_width=height*.115
    obj.scale*=target_width/size
    bpy.context.view_layer.update()
    local=[obj.matrix_world@Vector(c) for c in obj.bound_box]
    center=sum(local,Vector())/len(local)
    obj.location+=head_center-center
    obj['review_status']='PROVISIONAL - manual landmark alignment required'
    obj['source']='Brooke photo-derived 3DDFA mesh'
# Do not silently merge geometry or replace head until eye/nose/jaw landmarks
# have been verified. Export visible fit candidate for actual viewer inspection.
bpy.ops.export_scene.gltf(filepath=destination,export_format='GLB')
print('BROOKE_1_FACE_FIT_PROVISIONAL',destination,'base_meshes',len(body),'face_meshes',len(new))
