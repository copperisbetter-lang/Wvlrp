"""Isolated Sav adult MakeHuman Vulva1 mesh-fitting QA. Never changes the original Sav GLB.
Uses Thomas Larsson's original MakeHuman Vulva1 vertices/faces/UVs already
retained under world-creator/assets/riley-vulva1-source.json (AGPL-3).
Unlike the Riley trial, fits to the *actual* imported Sav body and pelvis.
Not an automatically approved cosmetic/anatomical final model.
"""
import bpy
import json
import math
import struct
from pathlib import Path
from collections import Counter
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "sav-realistic-shell.glb"
DONOR = ROOT / "assets" / "riley-vulva1-source.json"
OUT = ROOT / "assets" / "sav-vulva1-trial.glb"
if not SOURCE.is_file() or SOURCE.stat().st_size < 500_000:
    raise RuntimeError("Published Sav human-shell GLB missing; refuse placeholder mesh")
data = json.loads(DONOR.read_text())
geo = data["mesh"]
if "Vulva 1" not in data["name"] or len(geo["vertices"]) != 181 or len(geo["faces"]) != 168:
    raise RuntimeError("Original MakeHuman Vulva1 source failed provenance/topology gate")
if len(geo["uv_faces"]) != len(geo["faces"]):
    raise RuntimeError("Vulva1 UV topology mismatch")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE.resolve()))
rigs = [o for o in bpy.data.objects if o.type == "ARMATURE" and
        len(o.data.bones) == 56 and "Pelvis" in o.data.bones]
if len(rigs) != 1:
    raise RuntimeError("Sav 56-bone armature missing or ambiguous")
rig = rigs[0]
all_meshes = [o for o in bpy.data.objects if o.type == "MESH"]
if any("vulva2" in o.name.lower() for o in bpy.data.objects):
    raise RuntimeError("Vulva2 contamination in base Sav GLB")
# Prefer source basemesh; a GLB import can prefix object names.
bodies = sorted([o for o in all_meshes if len(o.data.vertices) > 10_000],
                key=lambda o: ("basemesh" in o.name.lower(), len(o.data.vertices)),
                reverse=True)
if not bodies:
    raise RuntimeError("Continuous high-resolution Sav body missing")
body = bodies[0]
if not body.data.materials or body.data.materials[0] is None:
    raise RuntimeError("Sav source skin material missing")
if any("vulva1" in o.name.lower() for o in bpy.data.objects):
    raise RuntimeError("Sav already contains a Vulva1 overlay; refusing duplicate")

# Prevent the *old sculpt controls* from superimposing a second labial relief.
# Keep all unrelated Sav body/face morphs and skeletal clips intact.
if body.data.shape_keys:
    for block in list(body.data.shape_keys.key_blocks):
        if block.name in ("Labia_Left_Open", "Labia_Right_Open"):
            body.shape_key_remove(block)
    for block in body.data.shape_keys.key_blocks:
        block.value = 0.0

bpy.context.scene.frame_set(0)
bpy.context.view_layer.update()
pelvis_z = (rig.matrix_world @ rig.data.bones["Pelvis"].head_local).z
body_world = body.matrix_world.copy()
inv = body_world.inverted_safe()

def front_surface_y(x, z):
    # Front faces negative Y for the current Sav skeleton.
    origin = Vector((x, -2.0, z))
    direction = Vector((0, 1, 0))
    hit, point, normal, face = body.ray_cast(inv @ origin, inv.to_3x3() @ direction)
    if not hit:
        return None
    result = body_world @ point
    if abs(result.x - x) > .004 or abs(result.z - z) > .004:
        return None
    return float(result.y)

# Determine Sav's actual pelvic width at rest, then scale the ORIGINAL
# MakeHuman donor's measured X and Z spans to match it. Never reuse Riley's
# fixed coordinate/size or the misaligned Vulva2 source offsets.
hip_band = [abs((body_world @ v.co).x) for v in body.data.vertices
            if abs((body_world @ v.co).z - (pelvis_z + .015)) < .035
            and abs((body_world @ v.co).x) < .32]
if len(hip_band) < 40:
    raise RuntimeError("Sav pelvic body landmarks insufficient")
hip_half = sorted(hip_band)[int(.85 * (len(hip_band) - 1))]
target_width = min(.121, max(.087, hip_half * .56))
target_height = min(.122, max(.087, target_width * .99))
original = [tuple(map(float, row)) for row in geo["vertices"]]
xmin = min(v[0] for v in original)
xmax = max(v[0] for v in original)
zmin = min(v[2] for v in original)
zmax = max(v[2] for v in original)
ymin = min(v[1] for v in original)
ymax = max(v[1] for v in original)
if abs(xmin + xmax) > .02 or xmax - xmin < .9 or zmax-zmin < .85:
    raise RuntimeError("Unexpected MakeHuman Vulva1 donor metric extents")
sx = target_width / (xmax - xmin)
sz = target_height / (zmax - zmin)
z_middle = (zmax + zmin) * .5
# Current Sav shell's own anatomical reference is the pelvis head minus
# .205 m. This is a *bone-relative location* from her model, not Riley's .868.
center_z = pelvis_z - .205
if not .6 < center_z < .95:
    raise RuntimeError("Sav source rig uses unexpected pelvis elevation")
coords = []
hits = []
for src_x,src_y,src_z in original:
    x = src_x * sx
    z = center_z + (src_z-z_middle)*sz
    y = front_surface_y(x,z)
    coords.append((x,z,y,src_y))
    if y is not None:
        hits.append((x,z,y))
# Debug coverage by source height / lateral position. This report never
# approves a fit; the hard surface-support gate below remains in place.
misses = [(x,z) for x,z,y,src_y in coords if y is None]
nearest_missed = sorted([min(math.hypot(x-h[0],z-h[1]) for h in hits)
                         for x,z in misses]) if hits else []
def _coverage(lo,hi):
    rows=[(x,z,y) for x,z,y,_ in coords if lo <= z < hi]
    return (len(rows),sum(y is not None for _,_,y in rows))
print("SAV_VULVA1_DEBUG", "body", body.name, "body_vertices",len(body.data.vertices),
      "pelvis_z",pelvis_z, "center_z",center_z, "hip_half",hip_half,
      "original_hits",len(hits), "misses",len(misses),
      "nearest_missing_distances", [round(nearest_missed[int((len(nearest_missed)-1)*p)],4)
                                     for p in (0,.5,.9,1)] if nearest_missed else [],
      "coverage_low",_coverage(center_z-.065,center_z-.02),
      "coverage_mid",_coverage(center_z-.02,center_z+.02),
      "coverage_high",_coverage(center_z+.02,center_z+.065))
# In Sav's MakeHuman shell the actual front crotch is open below the
# pubic surface: a valid natural vulvar patch can bridge this space, but its
# top MUST fit directly to real body geometry. Never shift it upward merely
# to force a high surface-hit count.
upper=[(x,z,y) for x,z,y,_ in coords if z>=center_z+.022]
upper_supported=sum(y is not None for x,z,y in upper)
if len(hits)<60 or upper_supported < len(upper)*.92:
    raise RuntimeError("Sav Vulva1 upper skin perimeter not securely fitted: %d/%d" %
                       (upper_supported,len(upper)))
if any(y is None and z>center_z+.028 for x,z,y,_ in coords):
    raise RuntimeError("An unsupported Vulva1 vertex occurs above Sav's groin junction")
if nearest_missed and nearest_missed[-1]>.074:
    raise RuntimeError("Sav lower skin gap too large for bounded anatomical bridge: %.4f" %
                       nearest_missed[-1])
print("SAV_VULVA1_BRIDGED_LOWER_SURFACE",
      "upper_supported",upper_supported,"upper_total",len(upper),
      "max_lower_gap",round(nearest_missed[-1],4) if nearest_missed else 0)

# Only short interpolation inside the actual measured surface is allowed.
# A donor corner with no nearby body support aborts rather than floats.
positions = []
for x,z,y,src_y in coords:
    if y is None:
        near = sorted(hits, key=lambda h: (h[0]-x)**2+(h[1]-z)**2)
        dist = math.hypot(near[0][0]-x,near[0][1]-z)
        if dist > .074 or z > center_z+.028:
            raise RuntimeError("Vulva1 point lacks bounded lower pelvic bridge support: %.4f" % dist)
        y = sum(h[2]/max(.002, math.hypot(h[0]-x,h[1]-z)) for h in near[:4]) / sum(
            1/max(.002, math.hypot(h[0]-x,h[1]-z)) for h in near[:4])
        # Sink lower bridge gently toward the interior instead of projecting
        # a long unsupported appendage forward from the pubic mound.
        y += min(.023, dist*.36)
    # Keep the original donor depth contour, but fit its surface to Sav.
    # More negative donor Y means more anterior relief.
    depth = max(0.0, min(1.0, (ymax-src_y)/(ymax-ymin)))
    positions.append((x, y-.005-.012*depth, z))

faces = [tuple(f) for f in geo["faces"]]
edges = Counter(tuple(sorted((a,b))) for f in faces for a,b in zip(f,f[1:]+f[:1]))
boundary = {v for pair,count in edges.items() if count==1 for v in pair}
if not 8 <= len(boundary) <= 140:
    raise RuntimeError("Unrecognized MakeHuman donor boundary; cannot seam-blend")
# Donor perimeter joins body at the scanned surface. Interior gets shallow
# relief; this suppresses overlapping old body relief instead of adding a
# forward floating capsule.
for i in boundary:
    x,z,y,source_depth=coords[i]
    if y is not None:
        positions[i]=(x,y-.0004,z)
# Lower border spans the natural gap between the inner thighs rather than
# falsely snapping to a nonexistent centerline front polygon.
unsupported_boundary=sum(coords[i][2] is None for i in boundary)
if unsupported_boundary>12:
    raise RuntimeError("Too many open perimeter vertices in Sav pelvic bridge: %d" %
                       unsupported_boundary)
print("SAV_VULVA1_BOUNDARY_QA",len(boundary),unsupported_boundary)

mesh = bpy.data.meshes.new("Sav original Thomas Larsson Vulva1 topology")
mesh.from_pydata(positions, [], faces)
mesh.update()
skin = body.data.materials[0].copy()
skin.name = "Sav Vulva1 original MakeHuman UV skin"
mesh.materials.append(skin)
uv = mesh.uv_layers.new(name="Original MakeHuman Vulva1 UV")
for face,uv_face in zip(mesh.polygons,geo["uv_faces"]):
    if len(face.loop_indices)!=len(uv_face):
        raise RuntimeError("Source Vulva1 face/UV winding mismatch")
    for loop_index,uv_index in zip(face.loop_indices,uv_face):
        uv.data[loop_index].uv=geo["uv_coordinates"][uv_index]
    face.use_smooth=True

addon = bpy.data.objects.new("Sav Vulva1 MakeHuman fitted",mesh)
bpy.context.collection.objects.link(addon)
addon["makehuman_source_uuid"]=data["source_uuid"]
addon["makehuman_original_vertex_count"]=181
addon["sav_trial_only"]=True

# Optional separate *non-baked* volume shapes for future fit adjustments.
# The original donor rest shape is zero for both keys.
addon.shape_key_add(name="Basis",from_mix=False)
for morph_name,x_at,amplitude in (("Vulva1_Outer_Fullness",.023,.009),
                                  ("Vulva1_Inner_Fullness",.009,.005)):
    key=addon.shape_key_add(name=morph_name,from_mix=False)
    count=0
    for i,v in enumerate(mesh.vertices):
        if i in boundary: continue
        p=v.co
        influence=math.exp(-((abs(p.x)-x_at)/.016)**2) * math.exp(-((p.z-center_z)/.043)**4)
        if influence>.025:
            key.data[i].co.y-=amplitude*influence
            count+=1
    if count<6:
        raise RuntimeError("Original donor %s morphed too few vertices" % morph_name)

# Fix geometry to one bone: pelvis *only*, never left/right thigh weights.
# Match transform convention of earlier licensed Riley skinning trial.
inverse_rig=rig.matrix_world.inverted_safe()
for v in addon.data.vertices:
    v.co=inverse_rig @ v.co
addon.parent=rig
addon.matrix_world=rig.matrix_world.copy()
group=addon.vertex_groups.new(name="Pelvis")
group.add(list(range(len(mesh.vertices))),1.0,"REPLACE")
mod=addon.modifiers.new("Sav Pelvis only; no thigh split","ARMATURE")
mod.object=rig
if len([g for g in addon.vertex_groups if g.name in ("Pelvis","LThigh","RThigh")])!=1:
    raise RuntimeError("Donor weights must be pelvis-only")

bpy.context.view_layer.update()
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
# All source character meshes and armature, including donor; no stale proxy.
for o in bpy.data.objects:
    if o.type in {"MESH","ARMATURE","EMPTY"}:
        o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT.resolve()),export_format="GLB",
                          export_animations=True,export_skins=True,
                          export_nla_strips=True,export_apply=False,
                          use_selection=True)
if not OUT.is_file() or OUT.stat().st_size < 500_000:
    raise RuntimeError("Sav Vulva1 3D export missing or incomplete")
raw=OUT.read_bytes()
if raw[:4]!=b"glTF":
    raise RuntimeError("Invalid Sav GLB magic")
size,kind=struct.unpack_from("<II",raw,12)
if kind!=0x4e4f534a:
    raise RuntimeError("Sav GLB JSON chunk invalid")
gltf=json.loads(raw[20:20+size])
nodes=[node.get("name","") for node in gltf.get("nodes",[])]
if sum("Sav Vulva1 MakeHuman fitted" in n for n in nodes)!=1:
    raise RuntimeError("Exactly one real Vulva1 addon must exist in exported GLB")
if any("vulva2" in n.lower() for n in nodes):
    raise RuntimeError("Unexpected Vulva2 node in Sav isolated output")
if not any(len(s.get("joints",[]))==56 for s in gltf.get("skins",[])):
    raise RuntimeError("Lost Sav 56-joint skeleton")
if not gltf.get("animations"):
    raise RuntimeError("Lost Sav pose actions")
print("SAV_VULVA1_MEASUREMENTS",{"pelvis_bone_z":round(pelvis_z,4),
                                "center_z":round(center_z,4),
                                "hip_half_width":round(hip_half,4),
                                "original_source_span_x":round(xmax-xmin,4),
                                "original_source_span_z":round(zmax-zmin,4),
                                "final_width_m":round(target_width,4),
                                "final_height_m":round(target_height,4),
                                "body_raycast_hits":len(hits),
                                "body_vertices":len(body.data.vertices)})
print("SAV_VULVA1_FITTING_SUCCESS",OUT,OUT.stat().st_size,
      "original_vertices",len(original),"original_faces",len(faces),
      "rig_bones",len(rig.data.bones),
      "animations",len(gltf.get("animations",[])),
      "no_vulva2",True)
