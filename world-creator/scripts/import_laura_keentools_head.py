"""Import a privately generated KeenTools OBJ ZIP into Blender and export a review GLB.
Run: blender --background --python import_laura_keentools_head.py -- /private/head.zip /private/laura-head-review.glb
This is a HEAD REVIEW ONLY, not a MakeHuman topology transfer or body replacement.
"""
import bpy,sys,zipfile,tempfile
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args)!=2:raise SystemExit('Expected input ZIP and output GLB')
source,out=map(Path,args)
if not source.is_file():raise FileNotFoundError(source)
if not zipfile.is_zipfile(source):raise RuntimeError('Not a valid KeenTools OBJ ZIP')
with tempfile.TemporaryDirectory() as tmp:
    folder=Path(tmp)
    with zipfile.ZipFile(source) as archive:
        for member in archive.infolist():
            target=(folder/member.filename).resolve()
            if not target.is_relative_to(folder.resolve()):raise RuntimeError('Unsafe ZIP path')
            if not member.is_dir():archive.extract(member,folder)
    objs=list(folder.rglob('*.obj'))
    if len(objs)!=1:raise RuntimeError(f'Expected one OBJ, got {len(objs)}')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.wm.obj_import(filepath=str(objs[0]))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    if not meshes or sum(len(o.data.vertices) for o in meshes)<1000:raise RuntimeError('Imported head mesh missing or too small')
    out.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_animations=False)
    if out.stat().st_size<10000:raise RuntimeError('GLB review export unexpectedly small')
    print('LAURA_KEENTOOLS_HEAD_REVIEW_READY',str(out),out.stat().st_size)
