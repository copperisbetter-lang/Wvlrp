"""Fit a photo head for inspection on Brooke 1.0; preserve the source clone.
Blender coordinates: Z up, -Y forward. 3DDFA source: Y up, +Z forward.
No claim of seamless replacement or approved likeness.
"""
import bpy, sys, json, hashlib
from pathlib import Path
from mathutils import Vector, Matrix
base, face, destination = sys.argv[sys.argv.index('--')+1:][:3]
dest=Path(destination); dest.parent.mkdir(parents=True,exist_ok=True)
digest=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
original_hash=digest(base)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=base)
bpy.context.view_layer.update()
original=set(bpy.context.scene.objects)
body=[o for o in original if o.type=='MESH']
assert body, 'Clone contains no meshes'
# Use actual rig weights, not a percentage of full-body bounds.
head_points=[]
for obj in body:
    indices={g.index for g in obj.vertex_groups if g.name.lower().split(':')[-1]=='head'}
    for v in obj.data.vertices:
        if any(g.group in indices and g.weight>=.5 for g in v.groups):
            head_points.append(obj.matrix_world@v.co)
assert len(head_points)>100, 'Missing trustworthy head vertex weights; manual landmarks needed'
def bounds(points):
    return Vector([min(p[i] for p in points) for i in range(3)]),Vector([max(p[i] for p in points) for i in range(3)])
lo,hi=bounds(head_points); target_center=(lo+hi)/2
assert .08<hi.x-lo.x<.4, 'Head width outside human scale; refuse fitting'
base_geometry={o.name:tuple(tuple(v.co) for v in o.data.vertices) for o in body}
bpy.ops.import_scene.gltf(filepath=face)
bpy.context.view_layer.update()
new=[o for o in bpy.context.scene.objects if o not in original]
shell=[o for o in new if o.type=='MESH']
assert shell, 'Photo reconstruction has no meshes'
# Transform ALL imported objects with one shared similarity transform.
# Keep their relative orientation and spacing; never zero object rotations.
points=[o.matrix_world@v.co for o in shell for v in o.data.vertices]
remap=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
points=[remap@p for p in points]
fl,fh=bounds(points); fc=(fl+fh)/2
scale=(hi.x-lo.x)/(fh.x-fl.x)
transform=Matrix.Translation(target_center)@Matrix.Scale(scale,4)@Matrix.Translation(-fc)@remap
# Capture world matrices before changing parents; unparent imported source only.
world={o:o.matrix_world.copy() for o in new}
for o in new:
    o.parent=None
    o.matrix_world=transform@world[o]
for i,o in enumerate(shell):
    o.name='BROOKE_PHOTO_HEAD_INSPECTION_%02d'%i
    o['review_status']='PROVISIONAL: landmark alignment and neck join unverified'
assert all(base_geometry[o.name]==tuple(tuple(v.co) for v in o.data.vertices) for o in body), 'Source clone vertices changed'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB')
assert digest(base)==original_hash, 'Source clone bytes changed'
# Head-only framing keeps the inspection focused on the requested task.
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=640; scene.render.resolution_y=640
scene.render.resolution_percentage=100
scene.world.color=(.22,.22,.22)
camdata=bpy.data.cameras.new('Head review camera')
cam=bpy.data.objects.new('Head review camera',camdata)
scene.collection.objects.link(cam); scene.camera=cam; camdata.type='ORTHO'
camdata.ortho_scale=max((hi-lo).z,(hi-lo).x)*1.7
radius=camdata.ortho_scale*3
for name,offset in [('key',(-1,-2,2)),('fill',(2,-1,1)),('rim',(0,2,2))]:
    data=bpy.data.lights.new(name,'AREA'); light=bpy.data.objects.new(name,data)
    scene.collection.objects.link(light)
    light.location=target_center+Vector(offset)*radius
    light.rotation_euler=(target_center-light.location).to_track_quat('-Z','Y').to_euler()
    data.energy=80; data.size=radius*2
review=dest.parent/'head-review'; review.mkdir(exist_ok=True)
for label,offset in [('front',(0,-1,0)),('back',(0,1,0)),('left',(-1,0,0)),('right',(1,0,0)),('top',(0,0,1)),('three-quarter',(.7,-1,.15))]:
    cam.location=target_center+Vector(offset)*radius
    cam.rotation_euler=(target_center-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(review/(label+'.png'))
    bpy.ops.render.render(write_still=True)
report={'source_clone_sha256':original_hash,'source_clone_unchanged':True,'anchor':'head vertex-group weight >= 0.5','anchor_vertices':len(head_points),'head_bounds':[list(lo),list(hi)],'shared_uniform_scale':scale,'source_axes':'3DDFA Y-up +Z-forward remapped to Blender Z-up -Y-forward','candidate_only':True,'neck_join_verified':False,'likeness_approved':False,'photo_texture_present':any(o.data.uv_layers for o in shell)}
(review/'fit-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
