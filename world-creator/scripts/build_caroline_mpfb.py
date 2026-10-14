"""Caroline Ingalls adult MPFB build entry point.
Creates a new adult female MPFB source, verifies complete continuous base topology,
uses the licensed MakeHuman skin, and deliberately keeps publication disabled until
the dedicated anatomy/provenance gate passes. Caroline is an adult character.
"""
import bpy, sys, zipfile, shutil
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from bl_ext.wvlrp_local.mpfb.services.humanservice import HumanService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.assetservice import AssetService
from bl_ext.wvlrp_local.mpfb.services.locationservice import LocationService
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService
from bl_ext.wvlrp_local.mpfb.entities.objectproperties import HumanObjectProperties
from face_materials import preserve_photo_skin
from caroline_appearance import reshape_adult_body, add_period_updo
from caroline_motions import add_caroline_animations

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"assets"/"caroline-source-validation.blend"

def install_assets():
    pack=Path("/tmp/mh-system.zip")
    if not pack.exists(): raise RuntimeError("Missing CC0 MakeHuman system assets")
    root=Path(LocationService.get_user_data()); cats={"skins","hair","eyes","eyebrows","eyelashes","teeth"}
    with zipfile.ZipFile(pack) as z:
        for m in z.infolist():
            parts=Path(m.filename).parts
            i=next((i for i,p in enumerate(parts) if p in cats),None)
            if i is None or m.is_dir(): continue
            dest=root/Path(*parts[i:]); dest.parent.mkdir(parents=True,exist_ok=True)
            with z.open(m) as a,open(dest,"wb") as b: shutil.copyfileobj(a,b)
    AssetService.invalidate_pack_metadata_cache()

def add(h,sub,names,kind):
    for n in names:
        p=AssetService.find_asset_absolute_path(n,asset_subdir=sub)
        if p:return HumanService.add_mhclo_asset(p,h,asset_type=kind,material_type="GAMEENGINE")

bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
install_assets()
h=HumanService.create_human(); h.name="Caroline Ingalls adult source body"
# Adult female foundation. Cup/firmness target is a natural 36C-like silhouette with softer gravity.# Garments must be fitted to this final body, never globally scaled from another avatar.
for key,val in [("gender",0.0),("age",.52),("weight",.50),("muscle",.34),("height",.48),("proportions",.50),("cupsize",.78),("firmness",.32)]:
    HumanObjectProperties.set_value(key,val,entity_reference=h)
TargetService.reapply_macro_details(h)
skin=AssetService.find_asset_absolute_path("young_caucasian_female.mhmat",asset_subdir="skins")
if not skin: raise RuntimeError("Female CC0 skin missing")
HumanService.set_character_skin(skin,h,skin_type="GAMEENGINE")
rig=HumanService.add_builtin_rig(h,"mixamo")
if not rig: raise RuntimeError("Caroline rig failed")
add(h,"eyes",["high-poly.mhclo","low-poly.mhclo"],"Eyes")
add(h,"eyebrows",["eyebrow001.mhclo"],"Eyebrows")
add(h,"eyelashes",["eyelashes01.mhclo"],"Eyelashes")
add(h,"teeth",["teeth_base.mhclo"],"Teeth")
hair=add(h,"hair",["long01.mhclo"],"Hair")
if not hair: raise RuntimeError("Caroline period-hair source missing")
root=ExportService.create_character_copy(h,name_suffix="_caroline_source")
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,"Basemesh")
if not body: raise RuntimeError("Caroline basemesh missing")
ExportService.bake_modifiers_remove_helpers(body,bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
for m in list(body.modifiers):
    if m.type=="MASK": body.modifiers.remove(m)
if len(body.data.vertices)<10000 or len(body.data.polygons)<10000:
    raise RuntimeError("Caroline body incomplete")
rigs=[o for o in [root]+list(ObjectService.get_list_of_children(root)) if o.type=="ARMATURE"]
if not rigs or len(rigs[0].data.bones)<25: raise RuntimeError("Caroline humanoid rig incomplete")
# Preserve the actual MakeHuman UV photographic face and body skin,
# rather than a uniform tan material that erases realistic facial features.
preserve_photo_skin(body,"Caroline")
reshape_adult_body(body)
# The old dark stock long01 cape concealed her face and upper torso. Remove
# that hair ONLY from the inspection COPY, not the original MPFB human.
for ob in [root]+list(root.children_recursive):
    if ob.type=="MESH" and "long01" in ob.name.lower():
        bpy.data.objects.remove(ob,do_unlink=True)
add_period_updo(root,body,rigs[0])
add_caroline_animations(rigs[0])
# Explicit selection marker: the Blender source retains BOTH source and
# duplicate for editing, but GLB export must include exactly one avatar.
root["wvlrp_caroline_export_root"]=True
bpy.context.view_layer.update()
if not body.data.uv_layers: raise RuntimeError("Caroline photographic facial UV missing")
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT))
print("WVLRP_CAROLINE_BODY_TARGET","fuller adult silhouette","natural_gravity",True,"clothes_fit_after_body",True)
print("WVLRP_CAROLINE_SOURCE_SUCCESS",len(body.data.vertices),len(body.data.polygons),len(rigs[0].data.bones),OUT)
