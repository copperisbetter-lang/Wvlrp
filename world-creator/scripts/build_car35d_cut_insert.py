"""CAR 3.5D isolated cut-and-insert Vulva2 fit from approved standalone skin test.
Never alters CAR2, CAR3 or the standalone colored donor.
"""
import bpy,bmesh,json,struct
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
base=root/"assets/car3-integrated-vulva1.glb"
donor=root/"assets/vulva2-standalone-skin-preview.glb"
output=root/"assets/car35d-vulva2-cut-fit.glb"
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(base))
original=set(bpy.data.objects)
bodies=[o for o in original if o.type=="MESH" and len(o.data.vertices)>10000 and "vulva" not in o.name.lower()]
if not bodies:raise RuntimeError("CAR3 body missing")
body=max(bodies,key=lambda o:len(o.data.vertices))
old=[o for o in original if o.type=="MESH" and "CAR3 Vulva1 MakeHuman fitted" in o.name]
if len(old)!=1:raise RuntimeError("CAR3 Vulva1 ambiguous")
bpy.data.objects.remove(old[0],do_unlink=True)
rigs=[o for o in bpy.data.objects if o.type=="ARMATURE"]
if not rigs:raise RuntimeError("CAR3 rig missing")
rig=max(rigs,key=lambda o:len(o.data.bones))
bpy.ops.import_scene.gltf(filepath=str(donor))
imported=[o for o in bpy.data.objects if o not in original]
addons=[o for o in imported if o.type=="MESH" and "vulva2" in o.name.lower()]
if len(addons)!=1:raise RuntimeError("Standalone Vulva2 donor missing or ambiguous")
addon=addons[0]
# The donor is a thin surface: keep both sides visible at all camera distances.
for material in addon.data.materials:
 if material:
  material.use_backface_culling=False
  if hasattr(material,"surface_render_method"): material.surface_render_method="DITHERED"
if not addon.data.materials or not addon.data.uv_layers.active:raise RuntimeError("Approved colored donor missing texture/UV")
# Preserve the approved donor's actual material. Do not recolor CAR3.
world=addon.matrix_world.copy()
for mod in list(addon.modifiers):
 if mod.type=="ARMATURE":addon.modifiers.remove(mod)
addon.parent=None;addon.matrix_world=world
for group in list(addon.vertex_groups):addon.vertex_groups.remove(group)
pelvis=next((name for name in ("Pelvis","Hips","pelvis","hips") if name in rig.data.bones),None)
if not pelvis:raise RuntimeError("No compatible CAR3 pelvis bone")
g=addon.vertex_groups.new(name=pelvis);g.add(list(range(len(addon.data.vertices))),1.0,"REPLACE")
mod=addon.modifiers.new("CAR3 pelvis binding","ARMATURE");mod.object=rig
addon.parent=rig;addon.matrix_world=world
# Isolated CAR 3.5D test correction; never modify donor or original builds.
FIT_LOWER_METERS = 0.065
fit_world=addon.matrix_world.copy()
fit_world.translation.z -= FIT_LOWER_METERS
addon.matrix_world=fit_world
# Offset the insert slightly toward the viewer to prevent depth fighting with
# the host skin when zoom changes; keep the approved geometry and texture.
fit_world=addon.matrix_world.copy()
fit_world.translation.y -= 0.004
addon.matrix_world=fit_world
# Geometry-aware CAR 3.5D integration: use the donor's actual silhouette,
# rather than cutting a rectangular hole or displacing its edge by a fixed 6 mm.
bpy.context.view_layer.update()
from mathutils.bvhtree import BVHTree
from mathutils import Vector
from math import sqrt

# Build a silhouette polygon in XZ from donor vertices.  The projected convex
# hull is deliberately conservative; no face is removed unless its center is
# also close to the donor surface in depth.
points=[addon.matrix_world @ v.co for v in addon.data.vertices]
coords=sorted(set((round(p.x,7),round(p.z,7)) for p in points))
def cross(o,a,b):return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
lower=[]
for p in coords:
 while len(lower)>1 and cross(lower[-2],lower[-1],p)<=0:lower.pop()
 lower.append(p)
upper=[]
for p in reversed(coords):
 while len(upper)>1 and cross(upper[-2],upper[-1],p)<=0:upper.pop()
 upper.append(p)
hull=lower[:-1]+upper[:-1]
if len(hull)<3:raise RuntimeError("Invalid donor projected silhouette")
def inside(x,z):
 sign=None
 for i in range(len(hull)):
  c=cross(hull[i],hull[(i+1)%len(hull)],(x,z))
  if abs(c)<1e-9:continue
  s=c>0
  if sign is not None and sign!=s:return False
  sign=s
 return True

# Work in body-local coordinates to avoid incorrect world/local cuts.
bm=bmesh.new();bm.from_mesh(body.data);bm.faces.ensure_lookup_table()
body_world=body.matrix_world
min_y=min(p.y for p in points);max_y=max(p.y for p in points)
faces=[]
for face in bm.faces:
 c=body_world @ face.calc_center_median()
 if inside(c.x,c.z) and min_y-.035 <= c.y <= max_y+.035:
  faces.append(face)
if not 5<len(faces)<450:
 bm.free();raise RuntimeError("Unsafe silhouette cut: "+str(len(faces)))
bmesh.ops.delete(bm,geom=faces,context="FACES_ONLY")
bm.to_mesh(body.data);bm.free();body.data.update()

# Never pull all donor boundary vertices along Y: that produced the spikes
# shown in the mobile screenshots.  Keep the approved donor shape untouched.
# Report boundary counts for validation and subsequent edge-bridge work.
edge_counts={}
for poly in addon.data.polygons:
 for k in poly.edge_keys:
  key=tuple(sorted(k));edge_counts[key]=edge_counts.get(key,0)+1
edge_ids=set()
for (a,b),count in edge_counts.items():
 if count==1:edge_ids.update((a,b))
if len(edge_ids)<8:raise RuntimeError("Donor boundary missing")
for o in imported:
 if o!=addon:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",export_skins=True,export_animations=True)
raw=output.read_bytes()
if raw[:4]!=b"glTF":raise RuntimeError("Invalid export")
n,k=struct.unpack_from("<II",raw,12)
doc=json.loads(raw[20:20+n])
if not doc.get("textures"):raise RuntimeError("Texture lost")
print("CAR35D_CUT_INSERT_READY","removed_faces",len(faces),"edge_vertices",len(edge_ids),"size",len(raw))
