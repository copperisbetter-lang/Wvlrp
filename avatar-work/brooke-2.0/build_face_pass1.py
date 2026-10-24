"""Brooke 2.0 isolated full-body geometry pass. Requires Blender 4.x.
Preserves approved Sophie 1 file and all old Brooke versions.
This is an initial proportional sculpt, NOT verified photo likeness.
"""
import bpy, math
from pathlib import Path
SOURCE=Path("avatar-work/brooke-2.0/brooke-2.0.glb").resolve()
OUT=Path("avatar-work/brooke-2.0/brooke-2.0-face-pass1.glb").resolve()
assert SOURCE.exists(), f"Missing isolated clone: {SOURCE}"
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
meshes=[o for o in bpy.data.objects if o.type=='MESH']
assert meshes, "Clone contains no meshes"
# Only modify plausible head geometry; leave bodies, armatures, clothing and attachments untouched.
candidates=[]
for o in meshes:
    n=o.name.lower()
    if any(x in n for x in ('head','face')) and not any(x in n for x in ('eye','hair','teeth','tongue','lash','brow','attachment')):
        candidates.append(o)
if not candidates:
    print("NO_HEAD_MESH_FOUND: refusing to fake a facial sculpt")
    raise RuntimeError("No uniquely identifiable head mesh; manual mesh identification required")
if len(candidates)!=1:
    raise RuntimeError("Ambiguous head meshes: "+", ".join(o.name for o in candidates))
head=candidates[0]
# Guard against head objects that include the entire body.
world=[head.matrix_world @ v.co for v in head.data.vertices]
lo=min(v.z for v in world); hi=max(v.z for v in world)
scene_z=[o.matrix_world @ v.co for o in meshes for v in o.data.vertices[:min(50,len(o.data.vertices))]]
if scene_z:
    full_height=max(v.z for v in scene_z)-min(v.z for v in scene_z)
    if hi-lo>full_height*.60:
        raise RuntimeError("Head object spans body; refuse unsafe deformation")
# A non-destructive proportional correction via shape key, using head-local normalized bounds.
verts=head.data.vertices
xmin=min(v.co.x for v in verts); xmax=max(v.co.x for v in verts)
zmin=min(v.co.z for v in verts); zmax=max(v.co.z for v in verts)
width=max(xmax-xmin,1e-6); height=max(zmax-zmin,1e-6)
if not head.data.shape_keys: head.shape_key_add(name="Basis")
key=head.shape_key_add(name="Brooke20_Proportions_Pass1",from_mix=False)
for i,v in enumerate(verts):
    x,y,z=v.co
    nx=(x-(xmin+xmax)/2)/(width/2)
    nz=(z-zmin)/height
    # soften lower jaw and forehead ridge without distorting eyes or neck.
    lower=max(0,min(1,(.48-nz)/.30))
    temple=max(0,min(1,(nz-.62)/.20))
    key.data[i].co.x=x-(x-(xmin+xmax)/2)*(.075*lower+.025*temple)
key.value=1.0
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',export_animations=True,export_morph=True)
assert OUT.stat().st_size>1000
print("BROOKE20_PASS1",OUT,OUT.stat().st_size,head.name)
