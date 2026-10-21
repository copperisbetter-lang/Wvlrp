"""Extract reusable example head from the existing MPFB Sha GLB.
Original source avatar remains untouched. Outputs two identical head GLBs.
The cut is an approximate neck crop, NOT a photo-fitted Laura likeness.
"""
import bpy, bmesh
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
src=root/'assets/sha-mpfb-trial.glb'
if not src.exists(): raise RuntimeError('Missing source MPFB GLB: '+str(src))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(src))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes: raise RuntimeError('No MPFB meshes in source')
# Use the source body's bounding box to locate the neck, rather than guessing fixed units.
body=max(meshes,key=lambda o:len(o.data.vertices))
world=[body.matrix_world @ Vector(c) for c in body.bound_box]
lo=min(p.z for p in world);hi=max(p.z for p in world)
cut=lo+(hi-lo)*.865
for o in list(meshes):
    zs=[(o.matrix_world @ Vector(c)).z for c in o.bound_box]
    if max(zs)<cut:
        bpy.data.objects.remove(o,do_unlink=True)
        continue
    if min(zs)<cut:
        # Apply transforms before a horizontal cut, preserving the imported materials.
        bpy.context.view_layer.objects.active=o;o.select_set(True)
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
        bm=bmesh.new();bm.from_mesh(o.data)
        local_cut=(o.matrix_world.inverted() @ Vector((0,0,cut))).z
        geom=list(bm.verts)+list(bm.edges)+list(bm.faces)
        result=bmesh.ops.bisect_plane(bm,geom=geom,dist=.00001,plane_co=(0,0,local_cut),plane_no=(0,0,1),clear_inner=True,clear_outer=False)
        bm.to_mesh(o.data);bm.free();o.data.update()
    o.select_set(False)
# Remove armatures and animations: head example is a static morphing base.
for o in list(bpy.context.scene.objects):
    if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
for o in bpy.context.scene.objects:
    o.parent=None
    for m in list(o.modifiers):
        if m.type=='ARMATURE':o.modifiers.remove(m)
    o.animation_data_clear()
out=root/'assets';out.mkdir(exist_ok=True)
for name in ('original-head-example.glb','morph-head-clone.glb'):
    bpy.ops.export_scene.gltf(filepath=str(out/name),export_format='GLB',export_animations=False,export_skins=False)
    assert (out/name).stat().st_size>10000
print('WVLRP_EXAMPLE_HEADS_SUCCESS',cut)
