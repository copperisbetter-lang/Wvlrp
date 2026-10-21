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
print('LAURA_FULLBODY_VERTEX_COUNT', len(human.data.vertices))
"""
code = code[:begin] + replacement + code[finish:]
code = code.replace("out=ROOT/'assets/laura-head-combined.glb'", "out=ROOT/'assets/laura-2-native-fullbody.glb'")
code = code.replace("LAURA_NATIVE_MPFB_SUCCESS", "LAURA_NATIVE_MPFB_FULLBODY_SUCCESS")
exec(compile(code, str(source), 'exec'), {'__name__':'__main__','__file__':str(source)})
