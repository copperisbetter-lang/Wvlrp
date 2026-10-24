import bpy,sys
from pathlib import Path
src,out=sys.argv[sys.argv.index('--')+1:][:2]
def load(p):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=p)
 return [o for o in bpy.context.scene.objects if o.type=='MESH']
a=load(src);base={o.name for o in a};assert len(a)>1, 'Baseline is not a full-body scene'
b=load(out);names={o.name for o in b}
assert len(b)>len(a), f'Fitted candidate did not add mesh: {len(a)} -> {len(b)}'
assert any('Photo_Face_CANDIDATE' in n for n in names), 'Photo face absent'
assert Path(out).stat().st_size>10000
print('STRUCTURAL PASS ONLY - NOT VISUAL APPROVAL',len(a),len(b),out)
