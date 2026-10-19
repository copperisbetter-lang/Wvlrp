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
# CAR2's method removes the covered pelvic faces, not the entire body.
# Derive a conservative opening from the actual attachment's XY/Z extent,
# and limit the cut to front-facing body faces close to the donor surface.
bpy.context.view_layer.update()
pts=[addon.matrix_world@v.co for v in addon.data.vertices]
xs=[p.x for p in pts];ys=[p.y for p in pts];zs=[p.z for p in pts]
xmin,xmax=min(xs),max(xs);zmin,zmax=min(zs),max(zs)
if not .025<xmax-xmin<.4 or not .02<zmax-zmin<.5:raise RuntimeError("Donor size outside safe fit bounds")
center_x=(xmin+xmax)/2;center_z=(zmin+zmax)/2
# CAR3 faces front toward negative Y; cut only in the attachment's inner footprint.
half_x=(xmax-xmin)*.37;half_z=(zmax-zmin)*.37
bm=bmesh.new();bm.from_mesh(body.data)
body_world=body.matrix_world
faces=[]
for face in bm.faces:
 c=body_world@face.calc_center_median()
 if abs(c.x-center_x)<half_x and abs(c.z-center_z)<half_z:
  if abs(c.y-sum(ys)/len(ys))<.13:
   faces.append(face)
if not 5<len(faces)<450:
 bm.free();raise RuntimeError("Unsafe cut region; refusing export: "+str(len(faces)))
bmesh.ops.delete(bm,geom=faces,context="FACES_ONLY")
bm.to_mesh(body.data);bm.free();body.data.update()
# Recess the donor perimeter slightly into the existing skin to hide the seam.
# Only boundary vertices move; visible central anatomy is preserved.
edge_ids=set()
for e in addon.data.edges:
 if e.is_loose:continue
edge_counts={}
for poly in addon.data.polygons:
 for k in poly.edge_keys:
  key=tuple(sorted(k));edge_counts[key]=edge_counts.get(key,0)+1
for (a,b),count in edge_counts.items():
 if count==1:edge_ids.update((a,b))
if len(edge_ids)>8:
 inv=addon.matrix_world.inverted_safe()
 for i in edge_ids:
  v=addon.data.vertices[i]
  worldp=addon.matrix_world@v.co
  worldp.y+=.0035
  v.co=inv@worldp
 addon.data.update()
for o in imported:
 if o!=addon:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",export_skins=True,export_animations=True)
raw=output.read_bytes()
if raw[:4]!=b"glTF":raise RuntimeError("Invalid export")
n,k=struct.unpack_from("<II",raw,12)
doc=json.loads(raw[20:20+n])
if not doc.get("textures"):raise RuntimeError("Texture lost")
print("CAR35D_CUT_INSERT_READY","removed_faces",len(faces),"edge_vertices",len(edge_ids),"size",len(raw))
