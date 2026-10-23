"""Blender background build: merge 3DDFA face with full cranium and neck.
Intermediate geometry; visual likeness must still be reviewed.
Usage: blender -b -t 2 --python build_complete_head.py -- input.obj output.glb
"""
import bpy, sys, math, bmesh
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
# Repair only tiny accidental holes; do not bridge eye sockets, mouth, or
# the open outer perimeter of the photo-derived face.
bm=bmesh.new();bm.from_mesh(face.data)
boundary=[e for e in bm.edges if e.is_boundary]
seen=set();repaired=0;skipped=0
for edge in boundary:
    if edge in seen: continue
    stack=[edge];loop_edges=[];seen.add(edge)
    while stack:
        e=stack.pop();loop_edges.append(e)
        for v in e.verts:
            for neighbor in v.link_edges:
                if neighbor.is_boundary and neighbor not in seen:
                    seen.add(neighbor);stack.append(neighbor)
    vertices=set(v for e in loop_edges for v in e.verts)
    xs=[v.co.x for v in vertices];ys=[v.co.y for v in vertices]
    span=max(max(xs)-min(xs),max(ys)-min(ys))
    # Conservative threshold: maximum 1.5% of the face width.
    if len(vertices)>=3 and len(vertices)<=16 and span<0.015*w:
        try:
            bmesh.ops.holes_fill(bm,edges=loop_edges,sides=16)
            repaired+=1
        except (ValueError,RuntimeError):
            skipped+=1
    else: skipped+=1
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(face.data);bm.free();face.data.update()
print('BROOKE_BOUNDARY_DIAGNOSTIC', 'boundary_edges',len(boundary),
      'tiny_holes_repaired',repaired,'large_or_sensitive_loops_preserved',skipped)
for polygon in face.data.polygons: polygon.use_smooth=True
head=face
# Explicitly select the photo face: no sphere primitive exists to make it active.
bpy.ops.object.select_all(action='DESELECT')
head.select_set(True)
bpy.context.view_layer.objects.active=head
# Normalize dimensions for the WebGL viewer.
head.location=(-cx,-cy,-rear)
head.scale=(1/w,1/w,1/w)
bpy.ops.object.transform_apply(location=True,rotation=False,scale=True)
assert len(head.data.vertices)>1000, 'Unusable photo face'
bpy.ops.export_scene.gltf(filepath=destination,export_format='GLB',use_selection=True)
print('FACE_ONLY_INSPECTION_GLB',destination,'vertices',len(head.data.vertices))
