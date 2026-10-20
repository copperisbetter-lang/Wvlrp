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
# Build a connected body/insert mesh, not a detached overlay.
# A failed bridge aborts the build instead of publishing broken geometry.
bpy.context.view_layer.update()
from mathutils import Vector
from collections import defaultdict

# Locate the actual donor perimeter (no convex-hull approximation).
edge_counts=defaultdict(int)
for poly in addon.data.polygons:
 for key in poly.edge_keys:edge_counts[tuple(sorted(key))]+=1
boundary_edges=[key for key,n in edge_counts.items() if n==1]
adj=defaultdict(list)
for a,b in boundary_edges:adj[a].append(b);adj[b].append(a)
if len(boundary_edges)<8 or any(len(v)!=2 for v in adj.values()):
 raise RuntimeError("Donor boundary not a single manifold loop")
seen=set();loops=[]
for seed in adj:
 if seed in seen:continue
 loop=[];cur=seed;prev=None
 while cur not in seen:
  seen.add(cur);loop.append(cur)
  nxt=next((v for v in adj[cur] if v!=prev),None)
  prev,cur=cur,nxt
  if cur is None:break
 loops.append(loop)
if len(loops)!=1:raise RuntimeError("Multiple donor boundary loops: "+str(len(loops)))

# Cut only body faces whose centers are inside the projected donor boundary.
# Keep a narrow outer rim for stitching; no large rectangular hole.
perimeter=[addon.matrix_world@addon.data.vertices[i].co for i in loops[0]]
def in_poly(x,z):
 hit=False
 for a,b in zip(perimeter,perimeter[1:]+perimeter[:1]):
  if (a.z>z)!=(b.z>z) and x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x:hit=not hit
 return hit
bm=bmesh.new();bm.from_mesh(body.data);bm.faces.ensure_lookup_table()
ys=[p.y for p in perimeter]
faces=[]
for face in bm.faces:
 p=body.matrix_world@face.calc_center_median()
 if in_poly(p.x,p.z) and min(ys)-.035<p.y<max(ys)+.035:faces.append(face)
if not 5<len(faces)<450:
 bm.free();raise RuntimeError("Unsafe donor-footprint cut: "+str(len(faces)))
bmesh.ops.delete(bm,geom=faces,context="FACES")
bm.verts.ensure_lookup_table();bm.edges.ensure_lookup_table()
# Collect the newly opened rim, restricting to the insert neighborhood.
body_rim=[e for e in bm.edges if e.is_boundary and any((body.matrix_world@v.co-Vector((sum(p.x for p in perimeter)/len(perimeter),sum(p.y for p in perimeter)/len(perimeter),sum(p.z for p in perimeter)/len(perimeter)))).length<.3 for v in e.verts)]
if len(body_rim)<8:
 bm.free();raise RuntimeError("Body cut produced no stitchable rim")

# Import the donor into the same BMesh while retaining its approved UV/material.
# Stitch only when Blender can establish a complete boundary bridge.
addon_local=body.matrix_world.inverted_safe()@addon.matrix_world
mat_offset=len(body.data.materials)
for mat in addon.data.materials:body.data.materials.append(mat)
uv_layer=bm.loops.layers.uv.verify()
source_uv=addon.data.uv_layers.active.data
newverts=[bm.verts.new(addon_local@v.co) for v in addon.data.vertices]
bm.verts.index_update()
for poly in addon.data.polygons:
 nf=bm.faces.new([newverts[i] for i in poly.vertices]);nf.material_index=mat_offset+poly.material_index
 for l,src_idx in zip(nf.loops,poly.loop_indices):l[uv_layer].uv=source_uv[src_idx].uv
bm.normal_update()
donor_rim=[e for e in bm.edges if e.is_boundary and all(v in newverts for v in e.verts)]
if len(donor_rim)!=len(boundary_edges):
 bm.free();raise RuntimeError("Donor boundary changed during merge")
# Reject mismatched boundaries instead of allowing Blender to connect arbitrary edges.
# Both rims must be single closed loops with equal vertex counts.
def ordered_loop(edges):
 adjacency={}
 for edge in edges:
  a,b=tuple(edge.verts)
  adjacency.setdefault(a,[]).append(b)
  adjacency.setdefault(b,[]).append(a)
 if not adjacency or any(len(n)!=2 for n in adjacency.values()):
  raise RuntimeError("Non-manifold seam boundary")
 seed=next(iter(adjacency))
 loop=[seed]
 previous=None
 current=seed
 while True:
  nxt=next(v for v in adjacency[current] if v is not previous)
  if nxt is seed:break
  if nxt in loop:raise RuntimeError("Multiple or self-intersecting seam loops")
  loop.append(nxt)
  previous,current=current,nxt
 if len(loop)!=len(adjacency):raise RuntimeError("Disconnected seam boundary")
 return loop
host_loop=ordered_loop(body_rim)
insert_loop=ordered_loop(donor_rim)
if len(host_loop)!=len(insert_loop):
 bm.free()
 raise RuntimeError("Unmatched seam vertex counts: host %d donor %d; refusing distorted bridge" % (len(host_loop),len(insert_loop)))
# Align loop winding and phase by minimum total spatial distance.
n=len(host_loop)
best=None
for direction in (1,-1):
 for shift in range(n):
  candidates=[insert_loop[(shift+direction*i)%n] for i in range(n)]
  distances=[(host_loop[i].co-candidates[i].co).length for i in range(n)]
  score=sum(d*d for d in distances)
  if best is None or score<best[0]:best=(score,candidates,distances)
_,aligned,distances=best
if max(distances)>0.025:
 bm.free()
 raise RuntimeError("Seam misalignment %.4fm exceeds 25mm tolerance" % max(distances))
for i in range(n):
 j=(i+1)%n
 try:
  bm.faces.new((host_loop[i],host_loop[j],aligned[j],aligned[i]))
 except ValueError as exc:
  bm.free();raise RuntimeError("Failed to stitch matched seam: "+str(exc))
bm.normal_update()
if any(e.is_boundary for e in body_rim+donor_rim):
 bm.free();raise RuntimeError("Unsealed seam")
bm.to_mesh(body.data);bm.free();body.data.update()
# Donor material now lives on the connected host mesh; remove separate overlay.
bpy.data.objects.remove(addon,do_unlink=True)
edge_ids=set(loops[0])
for o in imported:
 if o!=addon:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",export_skins=True,export_animations=True)
raw=output.read_bytes()
if raw[:4]!=b"glTF":raise RuntimeError("Invalid export")
n,k=struct.unpack_from("<II",raw,12)
doc=json.loads(raw[20:20+n])
if not doc.get("textures"):raise RuntimeError("Texture lost")
print("CAR35D_BRIDGED_READY","removed_faces",len(faces),"edge_vertices",len(edge_ids),"size",len(raw))
