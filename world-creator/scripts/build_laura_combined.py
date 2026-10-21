"""Build Laura head as a separate GLB; preserve original MakeHuman assets."""
import bpy, bmesh, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
source=root/'assets/morph-head-clone.glb'
assert source.is_file(), 'Missing original head clone'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert meshes, 'No head meshes'
body=max(meshes,key=lambda o:len(o.data.vertices))
# Hide obviously misplaced overlays; source clone stays untouched.
for obj in list(meshes):
    n=obj.name.lower()
    if any(t in n for t in ('hair','fringe','strand')):
        bpy.data.objects.remove(obj,do_unlink=True)
# Work in native source coordinates; Blender exports all meshes together.
bpy.context.view_layer.update()
pts=[body.matrix_world@Vector(v) for v in body.bound_box]
lo=Vector((min(p[i] for p in pts) for i in range(3)))
hi=Vector((max(p[i] for p in pts) for i in range(3)))
center=(lo+hi)/2
width=hi.x-lo.x;height=hi.z-lo.z;depth=hi.y-lo.y
assert width>0 and height>0 and depth>0
# IMPORTANT: A cropped GLB has no editable MPFB target stack.
# Never fake a native MakeHuman morph with direct vertex deformation.
# Official targets must be applied to an MPFB basemesh before extraction.
raise RuntimeError(
    "Laura native MPFB morph not configured: rebuild from an MPFB basemesh "
    "using TargetService.load_target() and official MakeHuman .target assets "
    "BEFORE cropping the head. Refusing to publish a fake morph."
)
# Build a continuous blonde cap conforming to the top of the head.
blonde=bpy.data.materials.new('Laura natural dark blonde')
blonde.diffuse_color=(.49,.35,.22,1)
blonde.use_nodes=True
blonde.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.49,.35,.22,1)
bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,location=(center.x,center.y,hi.z-height*.12))
cap=bpy.context.object
cap.name='Laura fitted blonde hair cap'
cap.scale=(width*.48,depth*.49,height*.30)
cap.data.materials.append(blonde)
# Remove lower hemisphere: hair should not cover the face.
bm=bmesh.new();bm.from_mesh(cap.data)
bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z < -.06],context='VERTS')
bm.to_mesh(cap.data);bm.free()
# Side hair uses layered tapered ribbons rather than floating eyeball-like primitives.
for side in (-1,1):
    for i in range(18):
        t=i/17
        curve=bpy.data.curves.new('Laura hair strand','CURVE')
        curve.dimensions='3D';curve.bevel_depth=width*.0025;curve.bevel_resolution=2
        spl=curve.splines.new('BEZIER');spl.bezier_points.add(3)
        coords=[
          (center.x+side*width*(.17+.26*t),center.y-depth*.30,hi.z-height*.10),
          (center.x+side*width*(.30+.20*t),center.y-depth*.28,hi.z-height*.28),
          (center.x+side*width*(.39+.11*t),center.y-depth*.16,center.z),
          (center.x+side*width*(.38+.10*t),center.y,lo.z+height*.08)]
        for b,co in zip(spl.bezier_points,coords):
            b.co=co;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
        obj=bpy.data.objects.new('Laura blonde hair layer',curve)
        bpy.context.collection.objects.link(obj);obj.data.materials.append(blonde)
# Correct glaring red emissive placeholders, but preserve other skin materials.
for obj in bpy.context.scene.objects:
    if obj.type!='MESH':continue
    for mat in obj.data.materials:
        if not mat:continue
        if mat.use_nodes:
            bs=mat.node_tree.nodes.get('Principled BSDF')
            if bs and 'Emission Strength' in bs.inputs:
                bs.inputs['Emission Strength'].default_value=0
        if any(t in obj.name.lower() for t in ('eye','iris','pupil')):
            if mat.diffuse_color.r>mat.diffuse_color.g*1.6:
                mat.diffuse_color=(.35,.45,.52,1)
out=root/'assets/laura-head-combined.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_animations=False)
assert out.stat().st_size>10000
print('LAURA_COMBINED_GLB_BUILT',out.stat().st_size)
