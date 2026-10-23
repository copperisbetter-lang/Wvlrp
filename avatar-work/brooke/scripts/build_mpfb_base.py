"""Brooke MPFB anatomical base, non-destructive starting point.
Requires world-creator/assets/morph-head-clone.glb from approved MPFB extraction.
No claim of photo-matched likeness: face fitting is a separate gated stage.
"""
import bpy, sys, os
from pathlib import Path
root=Path(__file__).resolve().parents[3]
src=root/'world-creator/assets/morph-head-clone.glb'
out=root/'avatar-work/brooke/build/brooke-mpfb-anatomical-base.glb'
assert src.is_file(), 'Missing MPFB head clone'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(src))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert meshes, 'MPFB source has no meshes'
# Preserve original anatomical surfaces, materials and eyes. Never add the
# 3DDFA face as a second intersecting skin or build a rear extrusion.
for o in meshes:
    o.name='Brooke anatomical base / '+o.name
    for p in o.data.polygons: p.use_smooth=True
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_animations=False)
assert out.stat().st_size>10000
print('BROOKE_MPFB_BASE_READY',out,'meshes',len(meshes))
print('PHOTO_FIT_PENDING: do not publish as Brooke likeness')
