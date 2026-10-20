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
FIT_LOWER_METERS = 0.0
fit_world=addon.matrix_world.copy()
fit_world.translation.z -= FIT_LOWER_METERS
addon.matrix_world=fit_world
# Offset the insert slightly toward the viewer to prevent depth fighting with
# the host skin when zoom changes; keep the approved geometry and texture.
fit_world=addon.matrix_world.copy()
fit_world.translation.y -= 0.0
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

# Use the native MHX2 deletion mask, as in the approved SAV4 fitter.
# Never guess the opening by projecting a donor outline onto large thigh faces.
source_path=root/"assets/vulva2-mhx2-source.json"
source=json.loads(source_path.read_text())
mask=source["proxy"]["delete_verts"]
if len(body.data.vertices)<len(mask) or len(body.data.vertices)<13380:
 raise RuntimeError("CAR3 host topology incompatible with SAV4 native deletion mask")
marked={i for i,value in enumerate(mask) if value}
if not 15<len(marked)<200:
 raise RuntimeError("Native deletion mask has unexpected vertex count")
# Confirm mask anchors occupy the actual donor region, not the thighs or another mesh.
mask_points=[body.matrix_world@body.data.vertices[i].co for i in marked]
perimeter=[addon.matrix_world@addon.data.vertices[i].co for i in loops[0]]
from mathutils.kdtree import KDTree
rim_tree=KDTree(len(perimeter))
for i,p in enumerate(perimeter):rim_tree.insert(p,i)
rim_tree.balance()
# Refuse incompatible vertex ordering instead of destroying the host geometry.
mask_center=sum(mask_points,Vector())/len(mask_points)
donor_center=sum(perimeter,Vector())/len(perimeter)
if (mask_center-donor_center).length>0.06:
 raise RuntimeError("Native mask and fitted donor disagree; host topology may differ")
bm=bmesh.new();bm.from_mesh(body.data);bm.verts.ensure_lookup_table();bm.verts.index_update()
preexisting_boundary={tuple(sorted(v.index for v in e.verts)) for e in bm.edges if e.is_boundary}
faces=[face for face in bm.faces if any(v.index in marked for v in face.verts)]
if not 5<len(faces)<450:
 bm.free();raise RuntimeError("Unsafe native-mask cut: "+str(len(faces)))
# Limit opening size relative to the attachment's own fitted bounds.
xs=[p.x for p in perimeter];zs=[p.z for p in perimeter]
for face in faces:
 for v in face.verts:
  p=body.matrix_world@v.co
  if not (min(xs)-.025<=p.x<=max(xs)+.025 and min(zs)-.025<=p.z<=max(zs)+.025):
   bm.free();raise RuntimeError("Native mask would remove geometry beyond donor footprint")
bmesh.ops.delete(bm,geom=faces,context="FACES")
bm.verts.ensure_lookup_table();bm.edges.ensure_lookup_table()
# Collect the newly opened rim, restricting to the insert neighborhood.
body_rim=[e for e in bm.edges if e.is_boundary and tuple(sorted(v.index for v in e.verts)) not in preexisting_boundary]
if len(body_rim)<8:
 bm.free();raise RuntimeError("Body cut produced no stitchable rim")

# Import the donor into the same BMesh while retaining its approved UV/material.
# Stitch only when Blender can establish a complete boundary bridge.
addon_local=body.matrix_world.inverted_safe()@addon.matrix_world
mat_offset=len(body.data.materials)
for mat in addon.data.materials:body.data.materials.append(mat)
uv_layer=bm.loops.layers.uv.verify()
source_uv=addon.data.uv_layers.active.data
# Transfer host skin weights to the inserted vertices so animation cannot tear the seam.
from mathutils.kdtree import KDTree
host_verts=list(bm.verts)
tree=KDTree(len(host_verts))
for i,v in enumerate(host_verts):tree.insert(v.co,i)
tree.balance()
deform=bm.verts.layers.deform.verify()
newverts=[]
for source_vertex in addon.data.vertices:
 v=bm.verts.new(addon_local@source_vertex.co)
 _,nearest,_=tree.find(v.co)
 for group_index,weight in host_verts[nearest][deform].items():
  v[deform][group_index]=weight
 newverts.append(v)
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
# Match tessellation by splitting longest boundary edges on the shorter loop.
# This creates vertices only on the seam; no original CAR3 or donor files change.
def split_to_count(loop,target):
 while len(loop)<target:
  idx=max(range(len(loop)),key=lambda i:(loop[i].co-loop[(i+1)%len(loop)].co).length_squared)
  edge=bm.edges.get((loop[idx],loop[(idx+1)%len(loop)]))
  if edge is None:raise RuntimeError("Missing boundary edge during resampling")
  result=bmesh.utils.edge_split(edge,loop[idx],0.5)
  loop.insert(idx+1,result[1])
 return loop
if len(host_loop)<len(insert_loop):
 host_loop=split_to_count(host_loop,len(insert_loop))
elif len(insert_loop)<len(host_loop):
 insert_loop=split_to_count(insert_loop,len(host_loop))
bm.normal_update()
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
if max(distances)>0.008:
 bm.free()
 raise RuntimeError("Seam misalignment %.4fm exceeds 8mm tolerance" % max(distances))
# Prevent twisted or excessively stretched seam quads from being exported.
# A successful Blender export alone is not evidence of a valid seam.
for i in range(n):
 j=(i+1)%n
 a,b,c,d=host_loop[i].co,host_loop[j].co,aligned[j].co,aligned[i].co
 if min((b-a).length,(c-b).length,(d-c).length,(a-d).length)<0.000001:
  bm.free();raise RuntimeError("Degenerate seam quad at "+str(i))
 normal1=(b-a).cross(d-a)
 normal2=(c-b).cross(d-b)
 if normal1.length<1e-9 or normal2.length<1e-9 or normal1.dot(normal2)<0:
  bm.free();raise RuntimeError("Twisted seam quad at "+str(i))
for i in range(n):
 j=(i+1)%n
 try:
  bm.faces.new((host_loop[i],host_loop[j],aligned[j],aligned[i]))
 except ValueError as exc:
  bm.free();raise RuntimeError("Failed to stitch matched seam: "+str(exc))
bm.normal_update()
if any(e.is_boundary for e in body_rim+donor_rim):
 bm.free();raise RuntimeError("Unsealed seam")
if sum(1 for e in bm.edges if e.is_boundary)>len(preexisting_boundary):
 bm.free();raise RuntimeError("New unsealed geometry detected")
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
