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
# Preserve approved donor texture, but eliminate the unsafe polygon-hole cut.
# The original CAR3 body is retained here until a topology-compatible bridge
# can be generated; this revision must fail closed rather than publish holes.
# Calculate boundary loops from actual mesh topology (not convex projection).
bpy.context.view_layer.update()
edge_counts={}
for poly in addon.data.polygons:
 for k in poly.edge_keys:
  key=tuple(sorted(k));edge_counts[key]=edge_counts.get(key,0)+1
boundary_edges=[e for e,n in edge_counts.items() if n==1]
edge_ids={v for edge in boundary_edges for v in edge}
if len(boundary_edges)<8:raise RuntimeError("Donor boundary missing")
# Validate donor boundary: only manifold closed loops can be stitched safely.
adjacency={}
for u,v in boundary_edges:
 adjacency.setdefault(u,[]).append(v)
 adjacency.setdefault(v,[]).append(u)
if any(len(neighbors)!=2 for neighbors in adjacency.values()):
 raise RuntimeError("Donor perimeter is not manifold; refusing destructive body cut")
# A real bridge requires matched host cut-loop vertices. Refuse to export a
# disconnected cut-and-insert as a successful finished model.
raise RuntimeError("CAR35D BRIDGE REQUIRED: host and donor boundaries not yet matched; preserving originals")
for o in imported:
 if o!=addon:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",export_skins=True,export_animations=True)
raw=output.read_bytes()
if raw[:4]!=b"glTF":raise RuntimeError("Invalid export")
n,k=struct.unpack_from("<II",raw,12)
doc=json.loads(raw[20:20+n])
if not doc.get("textures"):raise RuntimeError("Texture lost")
print("CAR35D_CUT_INSERT_READY","removed_faces",len(faces),"edge_vertices",len(edge_ids),"size",len(raw))
