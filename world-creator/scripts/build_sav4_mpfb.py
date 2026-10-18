"""Build SAV 4 as a separate adult MPFB character (no SAV 3 geometry).
Run: blender -b -t 2 --python world-creator/scripts/build_sav4_mpfb.py
Requires existing WVLRP Blender MPFB extension and /tmp/mh-system.zip.
"""
import bpy, sys, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from build_amy_mpfb import load_system_pack,add_asset,tint
from bl_ext.wvlrp_local.mpfb.services.humanservice import HumanService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.assetservice import AssetService
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService
from bl_ext.wvlrp_local.mpfb.entities.objectproperties import HumanObjectProperties

OUT=ROOT/"assets"/"sav4-realistic.glb"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
load_system_pack()
human=HumanService.create_human()
human.name="SAV 4 adult petite character"
# Fresh female base, slender and almost straight waist-to-hip proportions.
for key,val in [("gender",0.0),("age",.28),("weight",.34),("muscle",.25),
                ("height",.49),("proportions",.46),("cupsize",.18),("firmness",.57)]:
    HumanObjectProperties.set_value(key,val,entity_reference=human)
TargetService.reapply_macro_details(human)
skin=AssetService.find_asset_absolute_path("young_caucasian_female.mhmat",asset_subdir="skins")
if not skin:raise RuntimeError("SAV4 skin missing")
HumanService.set_character_skin(skin,human,skin_type="GAMEENGINE")
rig=HumanService.add_builtin_rig(human,"mixamo")
if rig is None:raise RuntimeError("SAV4 rig missing")
for sub,names,kind in [
 ("eyes",["high-poly.mhclo"],"Eyes"),
 ("eyebrows",["eyebrow001.mhclo"],"Eyebrows"),
 ("eyelashes",["eyelashes01.mhclo"],"Eyelashes"),
 # Omit teeth proxy until its alignment with the head is validated.
 # Misaligned teeth and oral helpers caused visible facial artifacts.
]:
 add_asset(human,sub,names,kind)
hair=add_asset(human,"hair",["long01.mhclo"],"Hair")
if hair is None:raise RuntimeError("SAV4 shoulder hair asset missing")
tint(hair,(.76,.68,.52),.96)
root=ExportService.create_character_copy(human,name_suffix="_sav4")
# Remove facial helper/proxy meshes that are misplaced in the exported head.
for obj in list(root.children_recursive):
 if obj.type=="MESH" and any(term in obj.name.lower() for term in ("teeth", "tongue", "mouth", "oral")):
  bpy.data.objects.remove(obj,do_unlink=True)
# Force a warm dusty blonde tint on copied hair materials (not just the source).
for obj in root.children_recursive:
 if obj.type=="MESH" and "hair" in obj.name.lower():
  for mat in obj.data.materials:
   if mat:
    mat=mat.copy();mat.diffuse_color=(.76,.68,.52,1)
    if mat.use_nodes:
     for node in mat.node_tree.nodes:
      if node.type=="BSDF_PRINCIPLED":node.inputs["Base Color"].default_value=(.76,.68,.52,1)
    obj.data.materials[0]=mat
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,"Basemesh")
if body is None:raise RuntimeError("SAV4 continuous body missing")
ExportService.bake_modifiers_remove_helpers(body,bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
for m in list(body.modifiers):
 if m.type=="MASK":body.modifiers.remove(m)
# Preserve MPFB topology; no anatomical add-ons or disconnected geometry.
# Scale the character to the approved 5 ft 6 in (1.6764 m).
bpy.context.view_layer.update()
verts=[body.matrix_world@v.co for v in body.data.vertices]
height=max(p.z for p in verts)-min(p.z for p in verts)
if height<=0:raise RuntimeError("SAV4 invalid height")
root.scale*=1.6764/height
bpy.ops.object.select_all(action="DESELECT")
root.select_set(True)
for obj in root.children_recursive:obj.select_set(True)
bpy.context.view_layer.objects.active=root
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",use_selection=True,export_apply=False)
if OUT.stat().st_size<100000:raise RuntimeError("SAV4 GLB unexpectedly small")
print("SAV4_BUILD_SUCCESS",OUT,OUT.stat().st_size)
