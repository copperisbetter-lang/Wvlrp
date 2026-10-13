"""Add licensed MakeHuman Vulva 1 as a reversible, skin-matched test overlay.
Riley Top Shelf base GLB stays untouched. Blender 3/4 compatible.
This is an experimental fit, not an anatomically verified seamless integration.
"""
import bpy, json, math, collections
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "riley-top-shelf-blender-trial.glb"
GEOMETRY = ROOT / "assets" / "riley-vulva1-source.json"
OUT = ROOT / "assets" / "riley-top-shelf-vulva1-trial.glb"
assert SOURCE.is_file() and SOURCE.stat().st_size > 1_000_000
data = json.loads(GEOMETRY.read_text())
m = data["mesh"]
assert len(m["vertices"]) == 181 and len(m["faces"]) == 168
assert len(m["uv_faces"]) == len(m["faces"])

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
arm = next((o for o in bpy.data.objects if o.type == "ARMATURE" and "Riley" in o.name), None)
body = next((o for o in bpy.data.objects if o.type == "MESH" and
             "Riley sculpted anatomical body" in o.name), None)
assert arm is not None, "Riley base skeleton missing"
assert body is not None, "Riley sculpted body missing"
assert "Hips" in arm.pose.bones, "Riley Hips skeleton bone missing"
assert len(body.data.vertices) > 8000
assert len(body.data.materials) >= 1
# Use Riley's actual current skin material. A generic pink overlay would
# mismatch her body and face; reusing the body PBR material avoids it.
skin = body.data.materials[0]
assert skin is not None

# Scan body surface along +Y from in front of Riley. This follows actual
# pelvis curvature instead of a hard-coded flat floating patch.
to_body = body.matrix_world.inverted()
def body_front(x, z):
    for dz in (0.0, .008, -.008, .018, -.018, .035):
        origin = Vector((x, -.65, z + dz))
        local_origin = to_body @ origin
        local_dir = to_body.to_3x3() @ Vector((0, 1, 0))
        ok, point, normal, index = body.ray_cast(local_origin, local_dir)
        if ok:
            world_hit = body.matrix_world @ point
            return world_hit.y
    return None

faces = [tuple(f) for f in m["faces"]]
edge_counts = collections.Counter()
for face in faces:
    for a, b in zip(face, face[1:] + face[:1]):
        edge_counts[tuple(sorted((a, b)))] += 1
boundary = set()
for (a, b), count in edge_counts.items():
    if count == 1:
        boundary.add(a); boundary.add(b)
s_z = [v[2] for v in m["vertices"]]
z_middle = (min(s_z) + max(s_z)) / 2
scale = .090  # MakeHuman decimeter-style source coordinates -> meters
z_middle_target = .868
hits = 0
surface_y = []
for xsrc, ysrc, zsrc in m["vertices"]:
    x = xsrc * scale
    z = z_middle_target + (zsrc - z_middle) * scale
    surf = body_front(x, z)
    surface_y.append(surf)
    if surf is not None:
        hits += 1
assert hits >= 75, ("Body pelvis raycast failed; refusing blind fit", hits)
valid = [v for v in surface_y if v is not None]
fallback = sorted(valid)[len(valid)//2]

# Source geometry supplies the folds and relief. The center is gently raised;
# outside boundary vertices approach or sink just below the surface to minimize
# a visible artificial edge. Placement is adjustable on the isolated trial.
verts = []
for i, (xsrc, ysrc, zsrc) in enumerate(m["vertices"]):
    x = xsrc * scale
    z = z_middle_target + (zsrc - z_middle) * scale
    surface = surface_y[i] if surface_y[i] is not None else fallback
    relief = (ysrc + .52) * .034
    y = surface - .004 + relief
    if i in boundary:
        y = surface + .0015
    verts.append((x, y, z))

mesh = bpy.data.meshes.new("Original Vulva 1 licensed MakeHuman topology")
mesh.from_pydata(verts, [], faces)
mesh.update()
mesh.materials.append(skin)
uv_layer = mesh.uv_layers.new(name="Original MakeHuman UVs")
for poly, src_uv_indices in zip(mesh.polygons, m["uv_faces"]):
    assert len(poly.loop_indices) == len(src_uv_indices)
    for loop_i, uv_i in zip(poly.loop_indices, src_uv_indices):
        uv_layer.data[loop_i].uv = m["uv_coordinates"][uv_i]
    poly.use_smooth = True
addon = bpy.data.objects.new("Riley Vulva1 | removable anatomical trial", mesh)
bpy.context.collection.objects.link(addon)
# The fitted points are world-space; convert to the rig's local space.
inv_arm = arm.matrix_world.inverted()
for v in addon.data.vertices:
    v.co = inv_arm @ v.co
addon.parent = arm
addon.matrix_world = arm.matrix_world.copy()
weights = addon.vertex_groups.new(name="Hips")
weights.add(list(range(len(mesh.vertices))), 1.0, "REPLACE")
mod = addon.modifiers.new("Riley Hips skeletal deformation", "ARMATURE")
mod.object = arm

# Never overwrite the approved base mesh or its styling, animations or proportions.
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.context.view_layer.objects.active = addon
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format="GLB",
    export_apply=False, export_materials="EXPORT",
    export_animations=True, export_nla_strips=True,
    export_image_format="AUTO", use_selection=False)
assert OUT.is_file() and OUT.stat().st_size > 1_000_000
print("RILEY_VULVA1_TRIAL_SUCCESS", OUT, OUT.stat().st_size,
      "vertices", len(mesh.vertices), "faces", len(mesh.polygons),
      "skin", skin.name, "pelvis_hits", hits, "boundary_vertices", len(boundary),
      "original_animations_retained", len(bpy.data.actions))
