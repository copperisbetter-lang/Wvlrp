"""Validate a Brooke GLB exported from Blender: one connected head skin mesh.
Run inside Blender: blender -b --python avatar-work/brooke/mesh-validation.py -- path/to/brooke.glb
Does not modify the source GLB or Laura files.
"""
import bpy, sys, bmesh
from collections import deque

args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args) != 1:
    raise SystemExit('Usage: blender -b --python mesh-validation.py -- brooke.glb')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=args[0])
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
heads = [o for o in meshes if o.name.lower().startswith('brooke_head_skin')]
if len(heads) != 1:
    raise RuntimeError(f'Expected exactly one Brooke_Head_Skin object; found {len(heads)}')
head = heads[0]
bm = bmesh.new(); bm.from_mesh(head.data)
if not bm.verts or not bm.faces:
    raise RuntimeError('Head skin is empty')
if any(not e.is_manifold for e in bm.edges):
    raise RuntimeError('Head skin contains open or nonmanifold edges')
remaining = set(bm.verts); components = 0
while remaining:
    components += 1
    stack = [remaining.pop()]
    while stack:
        v = stack.pop()
        for e in v.link_edges:
            other = e.other_vert(v)
            if other in remaining:
                remaining.remove(other); stack.append(other)
if components != 1:
    raise RuntimeError(f'Head skin has {components} disconnected components')
# Catch additional skin shells disguised as other mesh objects.
for o in meshes:
    if o != head and any(t in o.name.lower() for t in ('face_skin','head_skin','face_plane','face_shell')):
        raise RuntimeError(f'Duplicate facial shell: {o.name}')
print(f'PASS: one connected manifold head skin ({len(bm.verts)} vertices), {len(meshes)} total mesh objects')
bm.free()
