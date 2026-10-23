"""Build a closed photo-derived head shell from a 3DDFA face patch.
This is a geometry-completion candidate, not a verified likeness or anatomical fit.
Usage: blender -b --python build_complete_head.py -- face.obj output.glb
"""
import bpy, sys, math, bmesh
from mathutils import Vector

source, destination = sys.argv[sys.argv.index('--')+1:][:2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
verts, faces = [], []
for line in open(source):
    p = line.split()
    if not p: continue
    if p[0] == 'v': verts.append(tuple(map(float, p[1:4])))
    if p[0] == 'f': faces.append(tuple(int(t.split('/')[0])-1 for t in p[1:]))
assert len(verts) > 1000 and len(faces) > 1000, 'Invalid photo reconstruction'
mesh = bpy.data.meshes.new('Brooke photo-derived continuous head skin')
mesh.from_pydata(verts, [], faces)
mesh.update()
head = bpy.data.objects.new('Brooke photo-derived head shell', mesh)
bpy.context.collection.objects.link(head)
bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.00001)
bm.verts.ensure_lookup_table()
xs=[v.co.x for v in bm.verts]; ys=[v.co.y for v in bm.verts]; zs=[v.co.z for v in bm.verts]
width=max(xs)-min(xs)
height=max(ys)-min(ys)
cx=(min(xs)+max(xs))/2
cy=(min(ys)+max(ys))/2
front=max(zs)
rear=min(zs)
assert width>0 and height>0
# Find closed boundary loops. A 3DDFA patch usually has one large outer loop.
boundary={e for e in bm.edges if e.is_boundary}
loops=[]
while boundary:
    first=next(iter(boundary))
    start=first.verts[0]
    previous=start
    current=first.verts[1]
    ring=[start,current]
    boundary.remove(first)
    while current != start:
        choices=[e for e in current.link_edges if e in boundary]
        assert len(choices)==1, 'Branching/non-loop boundary; refuse unsafe completion'
        edge=choices[0]
        boundary.remove(edge)
        following=edge.other_vert(current)
        if following!=start: ring.append(following)
        previous,current=current,following
        assert len(ring)<20000, 'Boundary traversal overflow'
    loops.append(ring)
assert loops, 'No boundary found'
# Outer boundary by 2D area, retaining original facial vertices unchanged.
def area(loop):
    return abs(sum(a.co.x*b.co.y-b.co.x*a.co.y
                   for a,b in zip(loop,loop[1:]+loop[:1]))/2)
loops.sort(key=area,reverse=True)
outer=loops[0]
assert len(outer)>=16, 'Photo patch boundary too short'
# Remaining holes are capped individually, without altering source facial features.
for loop in loops[1:]:
    try: bm.faces.new(loop)
    except ValueError: pass
# Generate rear skull in successive rings, maintaining one-to-one boundary topology.
# Each ring follows the silhouette of the photo-derived patch. This is a
# conservative closed-shell candidate, NOT an anatomical/likeness approval.
zspan=max(width*0.65, front-rear)
rings=[outer]
for fraction, shrink in [(0.25,1.08),(0.55,1.03),(0.85,0.72),(1.0,0.16)]:
    ring=[]
    for v in outer:
        x=cx+(v.co.x-cx)*shrink
        y=cy+(v.co.y-cy)*shrink
        z=rear-zspan*fraction
        ring.append(bm.verts.new((x,y,z)))
    rings.append(ring)
for a,b in zip(rings,rings[1:]):
    for i in range(len(a)):
        j=(i+1)%len(a)
        bm.faces.new((a[i],a[j],b[j],b[i]))
bm.faces.new(tuple(reversed(rings[-1])))
# Close shell and enforce consistent normals; strict manifold validation.
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
nonmanifold=[e for e in bm.edges if not e.is_manifold]
assert not nonmanifold, 'Head still has %d nonmanifold edges'%len(nonmanifold)
# A neck is NOT invented here: photo reconstruction lacks calibrated neck
# landmarks. Do not mislabel the generated cranium as a rig-ready head+neck.
bm.to_mesh(mesh)
bm.free()
mesh.update()
for polygon in mesh.polygons: polygon.use_smooth=True
head.location=(-cx,-cy,-rear)
head.scale=(1/width,1/width,1/width)
bpy.ops.object.select_all(action='DESELECT')
head.select_set(True)
bpy.context.view_layer.objects.active=head
bpy.ops.export_scene.gltf(filepath=destination,export_format='GLB',use_selection=True)
print('BROOKE_CLOSED_PHOTO_HEAD_CANDIDATE',destination,
      'vertices',len(mesh.vertices),'faces',len(mesh.polygons),
      'neck_status','NOT_FITTED','likeness_status','NOT_VERIFIED')
