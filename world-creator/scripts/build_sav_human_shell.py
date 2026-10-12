"""Sav shell replacement: MPFB continuous human topology + original 56-joint rig."""
import bpy, math
from pathlib import Path
from mathutils import Vector
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_amy_mpfb import load_system_pack, add_asset
from bl_ext.wvlrp_local.mpfb.services.humanservice import HumanService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.assetservice import AssetService
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService
from bl_ext.wvlrp_local.mpfb.entities.objectproperties import HumanObjectProperties

OUT=Path("world-creator/assets/sav-prototype.glb")
# Import the previously published Sav rig/animations as the source of truth.
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT.resolve()))
rig=next((o for o in bpy.data.objects if o.type=="ARMATURE" and len(o.data.bones)==56),None)
if not rig: raise RuntimeError("Existing Sav 56-joint skeleton missing")
for o in list(bpy.data.objects):
 if o.type=="MESH": bpy.data.objects.remove(o,do_unlink=True)
print("SAV_RIG_PRESERVED",len(rig.data.bones))
load_system_pack()
h=HumanService.create_human();h.name="Sav MPFB continuous human shell"
for key,val in [("gender",0.0),("age",.40),("weight",.52),("muscle",.32),
                ("height",.53),("proportions",.49),("cupsize",.75),("firmness",.36)]:
 HumanObjectProperties.set_value(key,val,entity_reference=h)
TargetService.reapply_macro_details(h)
skin=AssetService.find_asset_absolute_path("young_caucasian_female.mhmat",asset_subdir="skins")
if not skin: raise RuntimeError("MPFB skin texture missing")
HumanService.set_character_skin(skin,h,skin_type="GAMEENGINE")
for sub,names,kind in [("eyes",["high-poly.mhclo"],"Eyes"),
 ("eyebrows",["eyebrow001.mhclo"],"Eyebrows"),
 ("eyelashes",["eyelashes01.mhclo"],"Eyelashes"),
 ("teeth",["teeth_base.mhclo"],"Teeth"),
 ("hair",["long01.mhclo"],"Hair")]:
 add_asset(h,sub,names,kind)
root=ExportService.create_character_copy(h,name_suffix="_sav_shell")
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,"Basemesh")
if not body:raise RuntimeError("MPFB shell missing")
ExportService.bake_modifiers_remove_helpers(body,bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
for m in list(body.modifiers):
 if m.type=="MASK":body.modifiers.remove(m)
# Remove MPFB construction original; keep only exported copies.
family=[root]+list(ObjectService.get_list_of_children(root))
meshes=[o for o in family if o.type=="MESH"]
if body not in meshes:meshes.append(body)
for o in list(bpy.data.objects):
 if o.type=="MESH" and o not in meshes:bpy.data.objects.remove(o,do_unlink=True)
# Transform MPFB character to match the Sav 1.8m skeleton.
points=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
lo=min(p.z for p in points);hi=max(p.z for p in points)
cx=(min(p.x for p in points)+max(p.x for p in points))*.5
cy=(min(p.y for p in points)+max(p.y for p in points))*.5
scale=1.79/(hi-lo)
for o in meshes:
 world=o.matrix_world.copy()
 for v in o.data.vertices:
  p=world@v.co
  p=Vector(((p.x-cx)*scale,(p.y-cy)*scale,(p.z-lo)*scale+.055))
  v.co=o.matrix_world.inverted_safe()@p
 o.data.update()
 # Keep object world transforms stable when reparenting to the Sav armature.
 # Otherwise accessories can jump away from the face after export.
 world_before_parent=o.matrix_world.copy()
 # Existing MPFB weights refer to a different skeleton. Clear them.
 for vg in list(o.vertex_groups):o.vertex_groups.remove(vg)
 for m in list(o.modifiers):
  if m.type=="ARMATURE":o.modifiers.remove(m)
 # Weight by distance to Sav bone segments in rest space; retain 56 bones.
 groups={b.name:o.vertex_groups.new(name=b.name) for b in rig.data.bones}
 head_only=any(w in o.name.lower() for w in ("hair","eye","lash","brow","teeth","tongue"))
 for v in o.data.vertices:
  p=o.matrix_world@v.co
  if head_only:
   groups["Head"].add([v.index],1,"REPLACE")
   continue
  nearest=[]
  for b in rig.data.bones:
   a=rig.matrix_world@b.head_local;c=rig.matrix_world@b.tail_local
   d=c-a
   t=max(0,min(1,(p-a).dot(d)/max(d.length_squared,1e-9)))
   dist=(p-(a+d*t)).length
   nearest.append((dist,b.name))
  nearest.sort()
  picks=nearest[:4]
  weights=[1/max(d,.022)**5 for d,_ in picks]
  total=sum(weights)
  for (_,name),w in zip(picks,weights):
   groups[name].add([v.index],w/total,"REPLACE")
 arm=o.modifiers.new("Sav56 deform","ARMATURE");arm.object=rig
 o.parent=rig
 o.matrix_world=world_before_parent
 for f in o.data.polygons:f.use_smooth=True
assert len(body.data.vertices)>10000,"Human shell unexpectedly low detail"
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT.resolve()),export_format="GLB",
 export_animations=True,export_skins=True,export_nla_strips=True,use_selection=True)
print("SAV_PROTOTYPE_SUCCESS",len(rig.data.bones),OUT.stat().st_size)
print("SAV_REAL_HUMAN_SHELL",len(body.data.vertices),len(meshes))
