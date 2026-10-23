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
# SAFETY REPAIR: do not create a guessed sphere/cylinder or voxel-remesh over
# photo-derived facial features. The former oversized sphere obscured the face.
# Preserve the original photo-derived geometry as a face-only inspection model.
# A complete head/neck requires a separately fitted, validated anatomical shell.
face.name='Brooke photo-derived face — preserved, no blob'
for polygon in face.data.polygons: polygon.use_smooth=True
head=face
# Normalize dimensions for the WebGL viewer.
head.location=(-cx,-cy,-rear)
head.scale=(1/w,1/w,1/w)
bpy.ops.object.transform_apply(location=True,rotation=False,scale=True)
assert len(head.data.vertices)>1000, 'Unusable photo face'
bpy.ops.export_scene.gltf(filepath=destination,export_format='GLB',use_selection=False)
print('FACE_ONLY_INSPECTION_GLB',destination,'vertices',len(head.data.vertices))
