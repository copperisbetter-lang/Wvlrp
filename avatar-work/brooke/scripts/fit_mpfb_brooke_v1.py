"""Build first *actual* non-destructive Brooke proportional morph on MPFB head.

Blender: blender -b --python avatar-work/brooke/scripts/fit_mpfb_brooke_v1.py
The front-photo ratios are used to shape eye spacing, nose width and mouth width.
This is a coarse parametric fit, NOT an identity-verified photographic reconstruction.
"""
import bpy, json, math
from mathutils import Vector
from pathlib import Path
root=Path(__file__).resolve().parents[3]
src=root/'world-creator/assets/morph-head-clone.glb'
data=json.loads((root/'avatar-work/brooke/brooke-photo-landmarks-front-profile-20261023.json').read_text())
out=root/'avatar-work/brooke/build/brooke-mpfb-first-proportional-fit.glb'
assert src.is_file(), 'Missing approved MPFB head GLB'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(src))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert meshes, 'No meshes in source'
# Head selection deliberately rejects ambiguous sources; never warp eyes or teeth.
candidates=[o for o in meshes if ('head' in o.name.lower() or 'face' in o.name.lower()) and len(o.data.vertices)>500]
if len(candidates)!=1:
    raise RuntimeError('Unique skin head mesh required; found '+str([(o.name,len(o.data.vertices)) for o in meshes]))
head=candidates[0]
# Work in local coordinates. A head that faces +/-Y has transverse X; Z is up.
verts=head.data.vertices
xs=[v.co.x for v in verts]; ys=[v.co.y for v in verts]; zs=[v.co.z for v in verts]
xmin,xmax=min(xs),max(xs); zmin,zmax=min(zs),max(zs)
span=xmax-xmin; height=zmax-zmin
assert span>0 and height>0
mid=(xmin+xmax)/2
# Coarse facial bands from the front photo. Keep shifts gentle and smooth to
# preserve closed topology and avoid detaching lips from surrounding skin.
photo=data['image_plane_ratios']
target_mouth_to_eye=photo['mouth_to_interpupillary_ratio']
target_nose_to_eye=photo['nose_to_interpupillary_ratio']
# These are conservative bounded deltas pending actual mesh vertex landmark correspondence.
mouth_factor=max(.96,min(1.04,1+.08*(target_mouth_to_eye-.75)))
nose_factor=max(.96,min(1.04,1+.08*(target_nose_to_eye-.45)))
head.shape_key_add(name='Basis',from_mix=False)
key=head.shape_key_add(name='Brooke_photo_proportions_v1',from_mix=False)
for i,v in enumerate(verts):
    x,y,z=v.co
    zn=(z-zmin)/height
    # Without verified source landmark coordinates, avoid inventing an eye line.
    # Apply bounded broad bands only, then require visual review.
    def bump(center,width):
        return math.exp(-.5*((zn-center)/width)**2)
    mouth=bump(.38,.065)
    nose=bump(.52,.07)
    scale=1+(mouth_factor-1)*mouth+(nose_factor-1)*nose
    key.data[i].co=(mid+(x-mid)*scale,y,z)
key.value=1.0
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_morph=True)
assert out.stat().st_size>10000
print('BROOKE_MPFB_FIRST_PROPORTIONAL_MORPH_EXPORTED',out)
print('MOUTH_FACTOR',mouth_factor,'NOSE_FACTOR',nose_factor)
print('NOT PHOTOGRAPHIC LIKENESS VERIFIED; source mesh orientation and bands need visual inspection')
