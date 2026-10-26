"""Run with Blender --background --python verify_pelvis.py after the build.
Audits actual exported GLB, including every corner of its three morph sliders.
Welding happens only on temporary audit meshes, never on the character.
"""
import bpy, bmesh, itertools, json
from pathlib import Path
from mathutils.kdtree import KDTree

BASE=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(BASE/'build/Sandy_Blonde_Sculpt_WIP.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
body=next(o for o in meshes if o.data.name.startswith('base.'))
pelvis=next(o for o in meshes if 'Vulva2 MHX2 true auto-fit' in o.name)
names=['Sandy - reference body shape','Sandy - unique facial sculpt','Sandy - chest contour']
assert len(pelvis.data.polygons)==608
# The importer duplicates materials for meshes carrying neutral vertex colors.
# Validate the exported binding itself, rather than Blender material identity.
import struct
binary=(BASE/'build/Sandy_Blonde_Sculpt_WIP.glb').read_bytes()
length=struct.unpack_from('<I',binary,12)[0]
doc=json.loads(binary[20:20+length])
base_mesh=next(m for m in doc['meshes'] if m['name'].startswith('base.'))
part_mesh=next(m for m in doc['meshes'] if 'fitted topology' in m['name'])
assert base_mesh['primitives'][0]['material']==part_mesh['primitives'][0]['material'], 'Different exported skin materials' 
def rim(ob):
    evaluated=ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    bm=bmesh.new();bm.from_mesh(evaluated.to_mesh())
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
    result=[ob.matrix_world@v.co for v in bm.verts if any(e.is_boundary for e in v.link_edges)]
    bm.free();evaluated.to_mesh_clear()
    return result
checks=[]
for weights in list(itertools.product((0.,1.),repeat=3))+[(1.,1.,.76),(.4,.7,.5)]:
    for ob in (body,pelvis):
        for name,value in zip(names,weights):ob.data.shape_keys.key_blocks[name].value=value
    bpy.context.view_layer.update()
    a,b=rim(body),rim(pelvis)
    assert len(a)==len(b)==28,(len(a),len(b))
    tree=KDTree(len(b))
    for i,p in enumerate(b):tree.insert(p,i)
    tree.balance()
    gap=max(tree.find(p)[2] for p in a)
    assert gap<1e-6,(weights,gap)
    # The combined surface must actually close, not merely look close in a render.
    combined=bmesh.new()
    deps=bpy.context.evaluated_depsgraph_get()
    for ob in (body,pelvis):
        evaluated=ob.evaluated_get(deps);mesh=evaluated.to_mesh()
        vv=[combined.verts.new(ob.matrix_world@v.co) for v in mesh.vertices]
        for p in mesh.polygons:combined.faces.new([vv[i] for i in p.vertices])
        evaluated.to_mesh_clear()
    bmesh.ops.remove_doubles(combined,verts=list(combined.verts),dist=1e-6)
    boundary=sum(e.is_boundary for e in combined.edges)
    nonmanifold=sum(not e.is_manifold for e in combined.edges)
    combined.free()
    assert boundary==nonmanifold==0,(weights,boundary,nonmanifold)
    checks.append({'weights':weights,'max_rim_gap_m':gap,'boundary_edges':boundary,'nonmanifold_edges':nonmanifold})
report={'exported_glb_verified':True,'retained_pelvis_faces':608,'shared_skin_material':True,'morph_checks':checks}
(BASE/'build/pelvis-verification.json').write_text(json.dumps(report,indent=2))
print('SANDY_PELVIS_VERIFIED',json.dumps(report))
