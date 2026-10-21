"""Build Laura 2 with the native MPFB full-body human, without cutting the mesh.
This wrapper reuses the existing official-MPFB builder and preserves originals.
"""
from pathlib import Path
import runpy

source = Path(__file__).with_name("build_laura_native_mpfb.py")
code = source.read_text()
begin = code.index("# Export native MPFB whole head geometry")
finish = code.index("for obj in bpy.context.scene.objects:\n    if obj.type=='MESH':", begin)
replacement = """
# Keep the native MPFB human intact, with its original body topology.
bpy.context.view_layer.update()
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if human not in meshes or len(human.data.vertices) < 10000:
    raise RuntimeError('Native full body missing')
if hair not in meshes or len(hair.data.polygons) < 100:
    raise RuntimeError('Hair mesh missing')
for obj in list(meshes):
    if obj not in (human, hair) and not ('eye' in obj.name.lower() and 'brow' not in obj.name.lower() and 'lash' not in obj.name.lower()):
        bpy.data.objects.remove(obj, do_unlink=True)
# Repair the native body geometry before export. Preserve the principal connected
# skin surface and discard any detached pelvic appendage / accessory islands.
import bmesh
bm = bmesh.new()
bm.from_mesh(human.data)
bm.verts.ensure_lookup_table()
seen = set()
components = []
for v in bm.verts:
    if v in seen: continue
    stack = [v]; seen.add(v); component = []
    while stack:
        cur = stack.pop(); component.append(cur)
        for e in cur.link_edges:
            other = e.other_vert(cur)
            if other not in seen:
                seen.add(other); stack.append(other)
    components.append(component)
components.sort(key=len, reverse=True)
if not components or len(components[0]) < 10000:
    bm.free()
    raise RuntimeError('Cannot identify Laura main body surface; refusing unsafe export')
removed = sum(len(c) for c in components[1:])
if removed:
    bmesh.ops.delete(bm, geom=[v for c in components[1:] for v in c], context='VERTS')
    bm.to_mesh(human.data)
bm.free()
print('LAURA_DETACHED_BODY_VERTICES_REMOVED', removed)
# Hide the defective fringe by excluding it from the published model. The
# original hair asset remains available for later refitting, but is not exported.
if hair and hair.name in bpy.data.objects:
    bpy.data.objects.remove(hair, do_unlink=True)
print('LAURA_OBSTRUCTING_HAIR_REMOVED_FROM_EXPORT')
print('LAURA_FULLBODY_VERTEX_COUNT', len(human.data.vertices))
"""
code = code[:begin] + replacement + code[finish:]
# MPFB distributes its native anatomical targets compressed as .target.gz.
# Use the official installed target directory, as in MPFB script sample 02.
a = code.index("roots=[Path('/tmp/mpfb2/src/mpfb'),dest]")
b = code.index("print('LAURA_IDENTITY_TARGET_CANDIDATES'", a)
code = code[:a] + """roots=[Path(LocationService.get_mpfb_data('targets'))]
candidates=[]
for root in roots:
    if root.exists():
        candidates.extend(root.rglob('*.target.gz'))
""" + code[b:]
code = code.replace("name=p.stem.lower()", "name=p.name.lower()")
code = code.replace("p.stem.lower()", "p.name.lower()")
code = code.replace("('eye','large')", "('eye','scale')")
code = code.replace("('nose','narrow')", "('nose','scale-horiz-decr')")
code = code.replace("('mouth','wide')", "('mouth','scale-horiz-incr')")
code = code.replace("('chin','round')", "('chin','')")
code = code.replace("('jaw','narrow')", "('jaw','scale-horiz-decr')")
code = code.replace("('cheek','full')", "('cheek','volume-incr')")

code = code.replace("out=ROOT/'assets/laura-head-combined.glb'", "out=ROOT/'assets/laura-2-native-fullbody.glb'")
# Add mirrored anatomical targets instead of deforming only the left side.
code = code.replace("('eye','scale')", "('eye','scale')")
code = code.replace("('cheek','volume-incr')", "('cheek','volume-incr')")
code = code.replace("('jaw','scale-horiz-decr')", "('jaw','width-decr')")
# Apply matching right-side targets with the same weights when the left is selected.
needle = "print('LAURA_IDENTITY_TARGETS_APPLIED',selected)"
mirrors = """
for feature in ('eyes', 'cheeks'):
    if feature not in selected: continue
    left_path, weight = selected[feature]
    left = Path(left_path)
    if left.name.startswith('l-'):
        right = left.with_name('r-' + left.name[2:])
        if not right.exists(): raise RuntimeError('Missing symmetric target '+str(right))
        key = TargetService.load_target(human,str(right),weight=weight,name='Laura2 '+feature+' right')
        if key is None: raise RuntimeError('Could not load mirrored target '+str(right))
        key.value = weight
        print('LAURA_MIRRORED_TARGET_APPLIED',feature,right.name,weight)
"""
code = code.replace(needle, mirrors + "\n" + needle)
code = code.replace("LAURA_NATIVE_MPFB_SUCCESS", "LAURA_NATIVE_MPFB_FULLBODY_SUCCESS")
exec(compile(code, str(source), 'exec'), {'__name__':'__main__','__file__':str(source)})
