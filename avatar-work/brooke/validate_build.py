"""Validate Brooke prototype GLB in Blender: blender -b --python avatar-work/brooke/validate_build.py -- path/to/head.glb"""
import bpy, bmesh, sys
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args)!=1: raise SystemExit('Expected GLB path')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=args[0])
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
heads=[o for o in meshes if o.name.startswith('Brooke_Head_Skin')]
assert len(heads)==1, 'Expected exactly one head skin'
head=heads[0]
bm=bmesh.new()
bm.from_mesh(head.data)
assert len(bm.verts)>1000, 'Head unexpectedly sparse'
# glTF may split vertices at UV seams on import. Weld coincident positions for topology inspection.
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.000001)
bm.normal_update()
bad_edges=[e for e in bm.edges if not e.is_manifold]
assert not bad_edges, f'Head has {len(bad_edges)} nonmanifold edges after imported seam welding (vertices={len(bm.verts)}, faces={len(bm.faces)})'
remaining=set(bm.verts)
parts=0
while remaining:
    parts+=1
    stack=[remaining.pop()]
    while stack:
        v=stack.pop()
        for edge in v.link_edges:
            other=edge.other_vert(v)
            if other in remaining:
                remaining.remove(other)
                stack.append(other)
assert parts==1, f'Disconnected head geometry: {parts} components'
keys=set(head.data.shape_keys.key_blocks.keys()) if head.data.shape_keys else set()
print('Imported mesh names:', [o.name for o in meshes], flush=True)
print('Imported morph names:', sorted(keys), flush=True)
assert {'Basis','FaceWidth','JawWidth','NoseProjection'}<=keys, f'Missing shape keys: {sorted(set(["Basis","FaceWidth","JawWidth","NoseProjection"])-keys)}'
for side in ('Left','Right'):
    for part in ('Eyeball','Iris','Pupil'):
        assert any(o.name.startswith(side+'_'+part) for o in meshes), 'Missing eye component'
assert not [o.name for o in meshes if o!=head and any(t in o.name.lower() for t in ('face_shell','face_plane','head_skin'))], 'Duplicate face shell'
print('PASS: single connected manifold head, three morphs, two eyes')
bm.free()
