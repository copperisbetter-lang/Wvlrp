"""Blender 4.x: generate Charles Ingalls Season 3 prototype garments.

Run with Blender --background --python world-creator/ingalls/build_charles_wardrobe.py
Creates garment meshes in a separate .blend staging file, NOT a finished character GLB.
Fit and skin garments to Charles's eventual body rig before publication.
"""
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "charles-ingalls-s3-wardrobe-staging.blend"
OUT.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def fabric(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = 0.94
    return mat

red = fabric("Season 3 rust-red cotton work shirt", (0.42, 0.095, 0.075))
brown = fabric("Season 3 brown work trousers", (0.20, 0.145, 0.095))
leather = fabric("Worn brown leather boots and suspenders", (0.15, 0.095, 0.055))
buttons = fabric("Aged brass buttons", (0.42, 0.31, 0.15))

def cylinder(name, a, b, radius, mat, vertices=20):
    from mathutils import Vector
    p, q = Vector(a), Vector(b)
    mid = (p + q) / 2
    direction = q - p
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius,
                                        depth=direction.length, location=mid)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(mat)
    return obj

def loft(name, levels, mat, sides=32):
    verts = []
    faces = []
    for z, rx, ry, cx, cy in levels:
        for i in range(sides):
            angle = 2 * math.pi * i / sides
            verts.append((cx + rx * math.cos(angle), cy + ry * math.sin(angle), z))
    for j in range(len(levels)-1):
        for i in range(sides):
            a=j*sides+i
            b=j*sides+(i+1)%sides
            faces.append((a,b,b+sides,a+sides))
    mesh=bpy.data.meshes.new(name+" mesh")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for polygon in mesh.polygons: polygon.use_smooth=True
    solid=obj.modifiers.new("Fabric thickness","SOLIDIFY")
    solid.thickness=.004
    return obj

# Dimensions in meters: rough adult mannequin proportions for STAGING ONLY.
# Garments are not fitted, weighted, or attached to a finished human yet.
loft("Charles rust-red shirt torso", [
    (1.04,.205,.120,0,0),(1.18,.19,.115,0,0),
    (1.40,.235,.145,0,0),(1.51,.205,.12,0,0)], red)
for side, label in [(-1,"left"),(1,"right")]:
    cylinder("Charles "+label+" shirt sleeve",
             (side*.205,0,1.45),(side*.48,0,1.13),.073,red)
    loft("Charles "+label+" trouser leg", [
        (.14,.092,.09,side*.113,0),(.55,.10,.105,side*.113,0),
        (.98,.12,.115,side*.113,0)],brown)
    loft("Charles "+label+" leather boot", [
        (.015,.106,.14,side*.113,-.038),(.18,.095,.105,side*.113,0),
        (.32,.095,.10,side*.113,0)],leather)
    cylinder("Charles "+label+" suspender front",
             (side*.13,-.13,1.03),(side*.14,-.128,1.46),.014,leather,12)
    cylinder("Charles "+label+" suspender back",
             (side*.13,.13,1.03),(side*.14,.125,1.46),.014,leather,12)
for i in range(5):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,
                                        radius=.009,location=(0,-.13,1.16+i*.067))
    bpy.context.object.name="Charles shirt button %02d"%i
    bpy.context.object.data.materials.append(buttons)

bpy.ops.wm.save_as_mainfile(filepath=str(OUT))
print("WVLRP_CHARLES_WARDROBE_STAGING_SAVED", OUT)
print("NOT A RIGGED CHARACTER; must be fitted to real Charles body and inspected")
