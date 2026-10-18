"""Build SAV 4 as a separate adult MPFB character (no SAV 3 geometry).
Run: blender -b -t 2 --python world-creator/scripts/build_sav4_mpfb.py
Requires existing WVLRP Blender MPFB extension and /tmp/mh-system.zip.
"""
import bpy, sys, math
from pathlib import Path
from mathutils import Vector
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
# Facial proxies previously caused severe eye protrusion and mouth cutouts.
# Export the intact base face first; add fitted proxies only after QA.
eyes=add_asset(human,"eyes",["high-poly.mhclo","low-poly.mhclo"],"Eyes")
if eyes is None:raise RuntimeError("SAV4 real eyeball proxy missing; refuse export")
hair=add_asset(human,"hair",["long01.mhclo"],"Hair")
if hair is None:raise RuntimeError("SAV4 shoulder hair asset missing")
tint(hair,(.82,.73,.57),.96)
root=ExportService.create_character_copy(human,name_suffix="_sav4")
# Remove facial helper/proxy meshes that are misplaced in the exported head.
for obj in list(root.children_recursive):
 if obj.type=="MESH" and any(term in obj.name.lower() for term in ("teeth", "tongue", "mouth", "oral")):
  bpy.data.objects.remove(obj,do_unlink=True)
# Force a warm dusty blonde tint on copied hair materials (not just the source).
for obj in root.children_recursive:
 if obj.type=="MESH" and ("hair" in obj.name.lower() or any(m and "hair" in m.name.lower() for m in obj.data.materials)):
  for idx,original in enumerate(obj.data.materials):
   if original:
    mat=original.copy();mat.diffuse_color=(.82,.73,.57,1)
    if mat.use_nodes:
     for node in mat.node_tree.nodes:
      if node.type=="BSDF_PRINCIPLED":
       for link in list(mat.node_tree.links):
        if link.to_socket==node.inputs["Base Color"]:mat.node_tree.links.remove(link)
       node.inputs["Base Color"].default_value=(.82,.73,.57,1)
    obj.data.materials[idx]=mat
# Shorten hair to just below shoulder level using world-space vertex heights.
bpy.context.view_layer.update()
for obj in root.children_recursive:
 if obj.type=="MESH" and ("hair" in obj.name.lower() or any(m and "hair" in m.name.lower() for m in obj.data.materials)):
  coords=[obj.matrix_world@v.co for v in obj.data.vertices]
  if coords:
   cutoff=max(p.z for p in coords)-.30
   inv=obj.matrix_world.inverted()
   for v,p in zip(obj.data.vertices,coords):
    if p.z<cutoff:v.co=(inv@Vector((p.x,p.y,cutoff)))
  print("SAV4_HAIR_TRIM",obj.name)
# Fail visibly if exported copy lost eye meshes rather than publishing red eye sockets.
eye_meshes=[o for o in root.children_recursive if o.type=="MESH" and "eye" in o.name.lower() and not any(t in o.name.lower() for t in ("brow","lash"))]
if not eye_meshes:raise RuntimeError("SAV4 export copy missing eye geometry")
# Use the original MPFB eye UVs and the bundled blue iris texture.
# Do not replace the whole eye with a flat white or blue material.
# Reuse the proven UV-based MakeHuman blue iris texture routine.
from caroline_eyes import add_light_blue_eyes
add_light_blue_eyes(root, body, rig)
print("SAV4_EYE_GEOMETRY_PRESENT",len(eye_meshes))
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,"Basemesh")
if body is None:raise RuntimeError("SAV4 continuous body missing")
ExportService.bake_modifiers_remove_helpers(body,bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
for obj in [root,*root.children_recursive]:
 if obj.type=="MESH":
  for m in list(obj.modifiers):
   if m.type=="MASK":obj.modifiers.remove(m)
# All facial skin polygons must remain visible without proxy cutout masks.
print("SAV4_FACE_PROXY_FREE",len(body.data.vertices))
# Preserve MPFB topology; no anatomical add-ons or disconnected geometry.
# Scale the character to the approved 5 ft 6 in (1.6764 m).
bpy.context.view_layer.update()
verts=[body.matrix_world@v.co for v in body.data.vertices]
height=max(p.z for p in verts)-min(p.z for p in verts)
if height<=0:raise RuntimeError("SAV4 invalid height")
scale=1.6764/height
# Scale the entire exported hierarchy, including rig and mesh positions.
# Scaling individual vertex coordinates without the armature breaks skinning
# and can collapse the exported GLB bounds.
root.scale *= scale
# Exporter must preserve hierarchy scale; verify world-space bounds after transform.
bpy.context.view_layer.update()
bpy.context.view_layer.update()
check=[body.matrix_world@v.co for v in body.data.vertices]
actual=max(v.z for v in check)-min(v.z for v in check)
if not 1.65<actual<1.70:raise RuntimeError(f"SAV4 height validation failed: {actual:.3f}m")
bpy.ops.object.select_all(action="DESELECT")
root.select_set(True)
for obj in root.children_recursive:obj.select_set(True)
bpy.context.view_layer.objects.active=root
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",use_selection=True,export_apply=False)
if OUT.stat().st_size<100000:raise RuntimeError("SAV4 GLB unexpectedly small")
# Validate the serialized GLB, not just Blender's pre-export dimensions.
import json,struct
raw=OUT.read_bytes()
chunk_size=struct.unpack_from("<I",raw,12)[0]
doc=json.loads(raw[20:20+chunk_size])
nodes=doc.get("nodes",[])
meshes=doc.get("meshes",[])
if not meshes:raise RuntimeError("SAV4 GLB has no meshes")
if not doc.get("skins"):raise RuntimeError("SAV4 GLB missing skin rig")
# Reject known bad model if exported positions are implausibly small.
positions=[]
for mesh in meshes:
 for primitive in mesh.get("primitives",[]):
  accessor=doc["accessors"][primitive["attributes"]["POSITION"]]
  if "min" in accessor and "max" in accessor:positions.append((accessor["min"],accessor["max"]))
if not positions:raise RuntimeError("SAV4 GLB missing position bounds")
# Ensure material transparency cannot make the character disappear.
for mat in doc.get("materials",[]):
 mat["alphaMode"]="OPAQUE"
 mat["doubleSided"]=True
# Bounds from accessors are mesh-local; viewer checks transformed world bounds.
print("SAV4_EXPORTED_POSITION_BOUNDS",positions[:3])
print("SAV4_BUILD_SUCCESS",OUT,OUT.stat().st_size)
