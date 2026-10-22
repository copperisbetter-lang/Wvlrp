"""Blender background build: merge 3DDFA face with full cranium and neck.
Intermediate geometry; visual likeness must still be reviewed.
Usage: blender -b -t 2 --python build_complete_head.py -- input.obj output.glb
"""
import bpy, sys, math
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
source,destination=args[:2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
verts=[]; faces=[]
for line in open(source):
    p=line.split()
    if not p: continue
    if p[0]=='v': verts.append(tuple(map(float,p[1:4])))
    elif p[0]=='f': faces.append(tuple(int(t.split('/')[0])-1 for t in p[1:]))
assert len(verts)>100 and len(faces)>100
mesh=bpy.data.meshes.new('Photo reconstructed facial geometry')
mesh.from_pydata(verts,[],faces);mesh.update()
face=bpy.data.objects.new('Photo face',mesh);bpy.context.collection.objects.link(face)
# 3DDFA image-space coordinates: X horizontal, Y down, Z toward viewer.
lo=[min(v[i] for v in verts) for i in range(3)]
hi=[max(v[i] for v in verts) for i in range(3)]
w=hi[0]-lo[0]; h=hi[1]-lo[1]
assert w>0 and h>0
cx=(lo[0]+hi[0])/2; cy=(lo[1]+hi[1])/2
front=hi[2]; rear=lo[2]
# Make a rear cranium with its front hemisphere intersecting the photo face.
bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=40,location=(cx,cy-0.13*h,rear-0.18*w))
skull=bpy.context.object;skull.name='Complete rear cranium'
skull.scale=(0.57*w,0.70*h,0.54*w)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
# Neck extends from jaw toward shoulders in positive image-space Y.
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=1,depth=1,location=(cx,cy+0.72*h,rear-0.13*w))
neck=bpy.context.object;neck.name='Neck to shoulder attachment'
neck.scale=(0.23*w,0.23*w,0.48*h)
neck.rotation_euler[0]=math.pi/2
bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
# Merge intersections into one contiguous surface; smooth shading.
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active=face
bpy.ops.object.join()
head=bpy.context.object;head.name='Brooke head and neck — photo fit WIP'
head.data.remesh_voxel_size=max(w,h)/180
bpy.context.view_layer.objects.active=head
bpy.ops.object.voxel_remesh()
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False) if hasattr(bpy.ops.mesh,'normals_make_consistent') else None
bpy.ops.object.mode_set(mode='OBJECT')
for poly in head.data.polygons: poly.use_smooth=True
# Normalize dimensions for the WebGL viewer.
head.location=(-cx,-cy,-rear)
head.scale=(1/w,1/w,1/w)
bpy.ops.object.transform_apply(location=True,rotation=False,scale=True)
assert len(head.data.vertices)>1000, 'Unusable mesh after union'
bpy.ops.export_scene.gltf(filepath=destination,export_format='GLB',use_selection=False)
print('COMPLETE_HEAD_GLB',destination,'vertices',len(head.data.vertices))
