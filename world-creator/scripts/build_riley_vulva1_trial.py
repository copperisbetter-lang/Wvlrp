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

# REPLACEMENT TRIAL: A 181-vertex donor cannot support four independently
# useful shaping controls. Subdivide the actual licensed mesh in Blender,
# preserving/interpolating its existing UVs, then add smooth bilateral labial
# ridges to the *same* skin-matched, hips-skinned removable attachment.
# The viewer handles user-selected 300% whole-size and 400% lip maxima;
# they are not baked here, so the user can dial them back without rebuilding.
import bmesh
bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.subdivide_edges(bm, edges=list(bm.edges),
                          cuts=2, use_grid_fill=True, smooth=0.0)
bm.to_mesh(mesh)
bm.free()
mesh.update()
assert len(mesh.vertices) > 800 and len(mesh.polygons) > 1000, (
    "Labial surface subdivision failed", len(mesh.vertices), len(mesh.polygons))
for poly in mesh.polygons:
    poly.use_smooth = True

def smoothstep01(v):
    v = min(1.0, max(0.0, v))
    return v * v * (3.0 - 2.0 * v)

outer_ridge_count = 0
inner_ridge_count = 0
for vertex in mesh.vertices:
    # Convert back to donor coordinates for dimensionless sculpt masks.
    # Source Z is head-to-toe; source X spans left-right. The sculpt leaves
    # the outer perimeter and the troublesome upper sheet largely untouched.
    src_x = abs(vertex.co.x) / scale
    src_z = z_middle + (vertex.co.z - z_middle_target) / scale
    lower_band = smoothstep01((src_z - .33) / .16)
    upper_band = 1.0 - smoothstep01((src_z - .84) / .16)
    span = lower_band * upper_band
    outer = math.exp(-2.0 * ((src_x - .091) / .060) ** 2) * span
    inner = math.exp(-2.0 * ((src_x - .029) / .023) ** 2) * span
    # Front is negative Blender Y. Small shallow sculpted ridges create
    # meaningful detail while keeping the source sheet and rig intact.
    vertex.co.y -= .0045 * outer + .0028 * inner
    outer_ridge_count += int(outer > .25)
    inner_ridge_count += int(inner > .25)
assert outer_ridge_count > 40 and inner_ridge_count > 30, (
    "Replacement labial sculpt did not cover enough geometry",
    outer_ridge_count, inner_ridge_count)
print("RILEY_REPLACEMENT_LABIAL_SCULPT_READY",
      "vertices", len(mesh.vertices),
      "polygons", len(mesh.polygons),
      "outer_region", outer_ridge_count, "inner_region", inner_ridge_count)

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


# Add the previously missing elbows-and-knees animation to the REVERSIBLE
# Riley Vulva 1 trial export only. Never rebuild or modify the approved base.
# Work from her already-existing hands-and-knees keyframe, then fit the elbows
# to knee height while holding the thigh/knee setup. Evaluate actual joint
# coordinates, rather than trusting arbitrary hand-authored Euler values.
from mathutils import Matrix, Vector
rig_data = arm.animation_data
assert rig_data is not None, "Riley armature has no imported animation tracks"
print("RILEY_IMPORTED_ACTIONS", [a.name for a in bpy.data.actions])
print("RILEY_IMPORTED_NLA", [(t.name, [st.action.name for st in t.strips]) for t in rig_data.nla_tracks])
hands_action = next((a for a in bpy.data.actions if "HandsAndKnees" in a.name), None)
assert hands_action is not None, "Base GLB has no Riley HandsAndKnees action to calibrate"
for track in rig_data.nla_tracks: track.mute = True
rig_data.action = None
bpy.context.scene.frame_set(0)
bpy.context.view_layer.update()
base = {p.name: p.matrix_basis.copy() for p in arm.pose.bones}
required = ["Hips", "Spine", "Chest", "LThigh", "RThigh", "LShin",
            "RShin", "LUpperArm", "RUpperArm", "LForearm", "RForearm",
            "LHand", "RHand"]
assert all(n in base for n in required), "Required Riley pose bones missing"

def apply_basis(pose_dict):
    for name, matrix in pose_dict.items():
        arm.pose.bones[name].matrix_basis = matrix.copy()
    bpy.context.view_layer.update()

def joint(name, which="head"):
    bpy.context.view_layer.update()
    p = arm.pose.bones[name]
    return arm.matrix_world @ (p.head if which=="head" else p.tail)

standing_floor = sum(joint(name,"tail").z for name in ("LToe","RToe"))/2 if all(
    n in arm.pose.bones for n in ("LToe","RToe")) else 0.04
rig_data.action = hands_action
bpy.context.scene.frame_set(round(hands_action.frame_range[1]))
bpy.context.view_layer.update()
hands_basis = {p.name: p.matrix_basis.copy() for p in arm.pose.bones}
rig_data.action = None
apply_basis(hands_basis)
before_knees = [joint("LShin").z,joint("RShin").z]
before_elbows = [joint("LForearm").z,joint("RForearm").z]
print("RILEY_HANDS_SOURCE", "knees", [round(z,3) for z in before_knees],
      "elbows", [round(z,3) for z in before_elbows], "floor", round(standing_floor,3))

# Small physical reach solver: choose the rotation that brings each elbow
# forward of its corresponding knee and down to that knee's level. The rig's
# imported bone axes are not assumed; scan each local axis for actual results.
# The root is subsequently lowered to seat the knees on the standing floor.
def rotate_relative(name, basis, axis, degrees):
    arm.pose.bones[name].matrix_basis = (
        basis @ Matrix.Rotation(math.radians(degrees), 4, axis)
    )
    bpy.context.view_layer.update()

# Try a few moderate spine angles; choose an overall elbow contact improvement.
candidate=None
for spine_delta in (-30,-20,-10,0,10,20,30):
    apply_basis(hands_basis)
    rotate_relative("Spine",hands_basis["Spine"],"X",spine_delta)
    current={n:p.matrix_basis.copy() for n,p in ((b.name,b) for b in arm.pose.bones)}
    total=0
    for prefix in ("L","R"):
        knee=joint(prefix+"Shin")
        best=None
        for axis in ("X","Y","Z"):
            for degrees in range(-95,100,5):
                rotate_relative(prefix+"UpperArm",current[prefix+"UpperArm"],axis,degrees)
                elbow=joint(prefix+"Forearm")
                # Forward/rear offset is intentionally generous for a
                # quadrupedal pose while the knees remain under the pelvis.
                dz=elbow.z-knee.z
                dist=abs(elbow.y-knee.y)
                cost=650*dz*dz+24*(dist-.42)**2+9*(elbow.x-knee.x)**2+.000025*degrees*degrees
                if best is None or cost<best[0]:
                    best=(cost,axis,degrees)
        rotate_relative(prefix+"UpperArm",current[prefix+"UpperArm"],best[1],best[2])
        total+=best[0]
    total+=.00018*spine_delta*spine_delta
    if candidate is None or total<candidate[0]:
        candidate=(total,spine_delta,
                   {p.name:p.matrix_basis.copy() for p in arm.pose.bones})
assert candidate is not None
apply_basis(candidate[2])
# Find a root translation axis that moves the knees vertically in world space.
hips=arm.pose.bones["Hips"]
hips_basis=hips.matrix_basis.copy()
knee_z=(joint("LShin").z+joint("RShin").z)/2
target_knee=standing_floor+.018
best_axis=None
for axis in range(3):
    test=hips_basis.copy()
    test[axis][3]+=.08
    hips.matrix_basis=test
    new_z=(joint("LShin").z+joint("RShin").z)/2
    derivative=(new_z-knee_z)/.08
    if best_axis is None or abs(derivative)>abs(best_axis[1]):
        best_axis=(axis,derivative)
hips.matrix_basis=hips_basis
assert best_axis and abs(best_axis[1])>.15, "Could not move hips vertically in imported rig"
final_hips=hips_basis.copy()
final_hips[best_axis[0]][3]+=(target_knee-knee_z)/best_axis[1]
hips.matrix_basis=final_hips
bpy.context.view_layer.update()
# Forearms rest roughly level with the supported elbows, allowing a side
# inspection view without hands piercing the floor. Optimize wrist height.
for prefix in ("L","R"):
    bone_name=prefix+"Forearm"
    original=arm.pose.bones[bone_name].matrix_basis.copy()
    elbow=joint(bone_name)
    best=None
    for axis in ("X","Y","Z"):
        for degrees in range(-135,140,5):
            rotate_relative(bone_name,original,axis,degrees)
            wrist=joint(prefix+"Hand")
            cost=350*(wrist.z-elbow.z)**2+15*(abs(wrist.y-elbow.y)-.17)**2+.00001*degrees*degrees
            if best is None or cost<best[0]: best=(cost,axis,degrees)
    rotate_relative(bone_name,original,best[1],best[2])

elbow_pose={p.name:p.matrix_basis.copy() for p in arm.pose.bones}
knees=[joint(prefix+"Shin") for prefix in ("L","R")]
elbows=[joint(prefix+"Forearm") for prefix in ("L","R")]
wrists=[joint(prefix+"Hand") for prefix in ("L","R")]
joint_heights=[round(v.z,3) for v in knees+elbows]
maximum_error=max(abs(v.z-target_knee) for v in knees+elbows)
print("RILEY_ELBOWS_KNEES_QA", "knee_elbow_z",joint_heights,
      "wrist_z",[round(v.z,3) for v in wrists],
      "ground",round(target_knee,3),"max_contact_error",round(maximum_error,3),
      "spine_delta",candidate[1])
# Pose still needs real side/rear visual approval; fail blatantly unsupported
# poses instead of publishing a falsely labeled floor position.
assert maximum_error < .085, ("Riley elbows or knees not grounded", maximum_error)

def record_pose(frame,matrices):
    for p in arm.pose.bones:
        loc,rot,scale=matrices[p.name].decompose()
        p.rotation_mode="QUATERNION"
        p.location=loc
        p.rotation_quaternion=rot
        p.scale=scale
        p.keyframe_insert(data_path="location",frame=frame,group=p.name)
        p.keyframe_insert(data_path="rotation_quaternion",frame=frame,group=p.name)

elbow_action=bpy.data.actions.new("Riley ElbowsAndKnees")
rig_data.action=elbow_action
record_pose(1,base)
record_pose(40,elbow_pose)
elbow_track=rig_data.nla_tracks.new()
elbow_track.name="Riley ElbowsAndKnees"
elbow_strip=elbow_track.strips.new("Riley ElbowsAndKnees",1,elbow_action)
elbow_strip.action_frame_start=1
elbow_strip.action_frame_end=40
rig_data.action=None
apply_basis(base)
for track in rig_data.nla_tracks:track.mute=False
bpy.context.scene.frame_set(0)
print("RILEY_ELBOWS_ACTION_READY",elbow_action.name)

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
