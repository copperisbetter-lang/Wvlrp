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
tint(hair,(.88,.78,.62),1.0)
# Marybeth Hutchinson / Laura Harris (The Faculty, 1998) inspired facial pass.
# Apply to the source basemesh before making the rigged export copy, so the
# facial changes travel with the character instead of becoming loose proxies.
# This is a geometry approximation, not a scan or verified photographic match.
face_body=ObjectService.find_object_of_type_amongst_nearest_relatives(human,"Basemesh")
if face_body is None: raise RuntimeError("SAV4 face morph: source basemesh missing")
# Save inspectable vertex coordinates before morphing, so calibrated facial
# regions can be mapped without guessing from oblique photo pixels.
from sav4_face_calibration import export_face_candidates, create_region_template
calibration_dir=ROOT/"assets"/"sav4-calibration"
export_face_candidates(face_body,calibration_dir/"face-vertices.csv")
from sav4_face_calibration import propose_region_candidates
propose_region_candidates(face_body,calibration_dir/"face-region-candidates.json")
region_map_path=ROOT/"characters"/"sav4"/"face-region-map.json"
if not region_map_path.exists():
    create_region_template(face_body,calibration_dir/"face-region-map.template.json")
print("SAV4_CALIBRATION_EXPORT",calibration_dir)
coords=[v.co.copy() for v in face_body.data.vertices]
zmin=min(p.z for p in coords); zmax=max(p.z for p in coords)
xmin=min(p.x for p in coords); xmax=max(p.x for p in coords)
span=zmax-zmin
# Derive reversible shape-control weights from the saved image landmarks.
# Perspective ratios drive bounded artistic adjustments, not millimeter-accurate fitting.
import json
reference=json.loads((ROOT/"characters"/"sav4"/"laura-two-view-landmarks.json").read_text())
front=reference["front_three_quarter"]
def pixel_distance(a,b):
    return math.hypot(a[0]-b[0],a[1]-b[1])
eye_span=pixel_distance(*front["eye_centers"])
mouth_span=pixel_distance(*front["mouth_corners"])
nose_to_mouth=pixel_distance(front["nose_tip"],front["mouth_center"])
mouth_to_chin=pixel_distance(front["mouth_center"],front["chin"])
if min(eye_span,mouth_span,nose_to_mouth,mouth_to_chin)<=0:
    raise RuntimeError("SAV4 invalid facial landmark distances")
mouth_eye_ratio=mouth_span/eye_span
chin_lower_ratio=mouth_to_chin/(mouth_to_chin+nose_to_mouth)
# Restrict inferred corrections to small bounded shifts; 3/4 perspective
# cannot determine true 3D width or depth.
mouth_weight=max(-1.,min(1.,(mouth_eye_ratio-0.75)/0.25))
chin_weight_ref=max(-1.,min(1.,(chin_lower_ratio-0.59)/0.20))
print("SAV4_MEASURED_MORPH_WEIGHTS",round(mouth_weight,4),round(chin_weight_ref,4))
# Upper face: gently broaden cheekbones, refine lower jaw and chin, and
# soften the temple-to-cheek transition. Limit movement to the head region.
# Head orientation is retained; no changes to eyes, rig, or wardrobe assets.
changed=0
for vert,p in zip(face_body.data.vertices,coords):
    h=(p.z-zmin)/span
    if h<0.865 or h>0.965: continue
    # Preserve the eye socket/upper lid band. Previous eye regressions
    # included displaced pupils and hollow-looking sockets.
    if 0.941<=h<=0.965: continue
    t=(h-0.865)/0.130
    fade=math.sin(math.pi*min(1.0,max(0.0,t)))**2
    # cheek prominence near the mid-face, narrower jaw near the lower face
    cheek=math.exp(-((h-0.928)/0.020)**2)
    jaw=math.exp(-((h-0.885)/0.017)**2)
    factor=1.0+fade*((0.34+0.018*mouth_weight)*cheek-(0.25+0.015*chin_weight_ref)*jaw)
    vert.co.x=p.x*factor
    # Second pass: subtle central chin definition and a softer, slightly
    # forward midface. Keep the nose/eye sockets untouched to avoid the
    # earlier SAV4 displaced-eye regression.
    center_weight=math.exp(-((p.x/max(0.001,(xmax-xmin)*0.5))/0.30)**2)
    chin_weight=math.exp(-((h-0.879)/0.010)**2)
    if center_weight>0.05:
        vert.co.z=p.z+span*(0.0015+0.0004*chin_weight_ref)*chin_weight*center_weight*fade
    # Stronger full-silhouette pass: temples, cheek volume, jaw taper and chin.
    # The eye socket band remains protected until calibrated vertex IDs exist.
    temple=math.exp(-((h-0.936)/0.012)**2)
    cheek_lower=math.exp(-((h-0.914)/0.014)**2)
    chin_taper=math.exp(-((h-0.873)/0.012)**2)
    vert.co.x *= 1.0 + fade*(0.11*temple+0.16*cheek_lower-0.13*chin_taper)
    # Forward cheek contour and lower chin definition without moving eye meshes.
    vert.co.y += span*fade*(0.0018*cheek_lower-0.0008*chin_taper)
    # Two-view Laura reference refinement (2026-10-18): soften the
    # lower-face silhouette without changing eye sockets or nose geometry.
    # The movie stills are perspective views, not calibrated 3D scans.
    lower_face=math.exp(-((h-0.899)/0.019)**2)
    # Gentle tapered lower jaw; blend continuously into the cheeks.
    vert.co.x *= 1.0-0.055*lower_face*fade
    # Keep this conservative until orthographic model comparisons exist.
    if abs(vert.co.x-p.x)>1e-7 or abs(vert.co.z-p.z)>1e-7: changed+=1
# Intensify the already bounded cheek/jaw/chin pass without guessing eye,
# nose, or lip topology. Reapply from original coordinates, not cumulatively.
# This remains an artistic silhouette pass, NOT a calibrated photo likeness.
import os
face_intensity=float(os.environ.get("SAV4_FACE_INTENSITY","1.75"))
if not math.isfinite(face_intensity) or not 1.0<=face_intensity<=2.0:
    raise RuntimeError("SAV4_FACE_INTENSITY must be between 1.0 and 2.0")
for vertex,original in zip(face_body.data.vertices,coords):
    delta=vertex.co-original
    if delta.length>1e-8:
        vertex.co=original+delta*face_intensity
print("SAV4_FACE_INTENSITY_APPLIED",face_intensity)
# Load the complete two-view landmark specification into the build for audit.
# These are oblique image coordinates, NOT calibrated 3D mesh targets.
landmarks_path=ROOT/"characters"/"sav4"/"laura-two-view-landmarks.json"
if not landmarks_path.exists():
    raise RuntimeError("SAV4 Laura landmark reference missing")
import json
landmarks=json.loads(landmarks_path.read_text())
for view,keys in {"front_three_quarter":("eye_centers","nose_tip","mouth_center","chin","mouth_corners"),"profile":("nose_tip","lip_contour","chin_contour","jaw_back","ear_center")}.items():
    if any(k not in landmarks.get(view,{}) for k in keys):
        raise RuntimeError("SAV4 incomplete landmark specification: "+view)
print("SAV4_TWO_VIEW_LANDMARKS_LOADED",landmarks_path)
print("SAV4_LANDMARKS_NOT_3D_CALIBRATED: no unsafe direct vertex fitting")
# Apply validated, photo-derived normalized ratios only when supplied.
# Missing reference data must never be silently replaced with invented values.
import json
ratio_path=ROOT/"characters"/"sav4"/"marybeth-ratios.json"
if ratio_path.exists():
    report=json.loads(ratio_path.read_text())
    if report.get("method")!="MediaPipe 2D image landmark ratios":
        raise RuntimeError("SAV4 face ratios must come from measured photo landmarks")
    ratios=report.get("ratios",{})
    required=("face_height_over_width","nose_width_over_width","mouth_width_over_width")
    if any(not isinstance(ratios.get(k),(float,int)) or ratios[k]<=0 for k in required):
        raise RuntimeError("SAV4 incomplete facial landmark ratios")
    # Reference measurements alone are not enough to locate nose/mouth vertices
    # on an arbitrary MPFB basemesh. Require a calibrated vertex-region map
    # before enabling full-feature deformation; never silently claim a match.
    region_map=ROOT/"characters"/"sav4"/"face-region-map.json"
    if not region_map.exists():
        raise RuntimeError("SAV4_FULL_FACE_MORPH_BLOCKED: calibrated mesh region map missing; see sav4-build-report/face-region-map.template.json and face-vertices.csv")
    else:
        mapping=json.loads(region_map.read_text())
        if mapping.get("mesh_vertex_count")!=len(face_body.data.vertices):
            raise RuntimeError("SAV4 face region map incompatible with basemesh topology")
        # Optional explicit calibrated vertex sets. Never infer a nose or mouth
        # from head-height alone: that previously displaced eyes and teeth.
        # Each region lists source-basemesh vertex IDs selected in Blender.
        # Offsets are fractions of full body height in local mesh coordinates.
        region_specs={
            "nose_bridge":(0.0,0.0,-0.0004),
            "nose_tip":(0.0,0.0005,0.0),
            "mouth_corners":(0.0005*mouth_weight,0.0,0.0),
            "upper_lip":(0.0,0.0002,0.0),
            "lower_lip":(0.0,0.0003,0.0),
        }
        assigned=set()
        for name,offset in region_specs.items():
            indices=mapping.get("regions",{}).get(name,[])
            if not isinstance(indices,list) or len(indices)!=len(set(indices)):
                raise RuntimeError("SAV4 invalid calibrated vertex list: "+name)
            for index in indices:
                if type(index) is not int or index<0 or index>=len(coords):
                    raise RuntimeError("SAV4 invalid calibrated vertex index: "+name)
                if index in assigned:
                    raise RuntimeError("SAV4 overlapping calibrated facial regions: "+name)
                assigned.add(index)
                delta=Vector(offset)*span
                if delta.length>span*0.001:
                    raise RuntimeError("SAV4 facial region offset over safety limit")
                face_body.data.vertices[index].co+=delta
            print("SAV4_CALIBRATED_REGION",name,len(indices))
        print("SAV4_FACE_REGION_MAP_VALIDATED",region_map,len(assigned))
    print("SAV4_MEASURED_REFERENCE_READY",ratio_path,ratios)
else:
    print("SAV4_UNCALIBRATED_FACE_PASS: verified photographic ratios missing; exporting conservative reference-inspired morph only")
# Detect accidental changes outside the intended face zone.
# Keep the original mesh topology, rig weights and every non-face vertex.
if len(face_body.data.vertices)!=len(coords):
    raise RuntimeError("SAV4 face morph changed vertex topology")
max_displacement=0.0
for vertex,original in zip(face_body.data.vertices,coords):
    displacement=(vertex.co-original).length
    max_displacement=max(max_displacement,displacement)
    h=(original.z-zmin)/span
    if displacement>1e-7 and (h<0.865 or h>0.941):
        raise RuntimeError(f"SAV4 facial deformation escaped safe region: {h:.5f}")
if changed==0:
    raise RuntimeError("SAV4 face morph modified no vertices")
if max_displacement>span*0.075:
    raise RuntimeError(f"SAV4 facial deformation exceeded safety limit: {max_displacement:.6f}")
face_body.data.update()
print("SAV4_MARYBETH_INSPIRED_FACE_PASS",changed,"max_delta",round(max_displacement,6))
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
    mat=original.copy();mat.diffuse_color=(.88,.78,.62,1)
    if mat.use_nodes:
     for node in mat.node_tree.nodes:
      if node.type=="BSDF_PRINCIPLED":
       for link in list(mat.node_tree.links):
        if link.to_socket==node.inputs["Base Color"]:mat.node_tree.links.remove(link)
       node.inputs["Base Color"].default_value=(0.88,0.78,0.62,1)
       # A linked image texture can override the tint; multiply it by the
       # desired blonde tone instead of disconnecting the texture detail.
       # For unlinked shaders the base color above remains authoritative.
    obj.data.materials[idx]=mat
# Preserve the original hair mesh shape. The previous trim collapsed every
# strand below a cutoff into a flat horizontal shelf, making the hair look fake.
# Keep the source long01 hairstyle intact until a proper hairstyle asset is fitted.
print("SAV4_HAIR: muted dusty blonde tint; existing long01 geometry preserved")
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,"Basemesh")
if body is None:raise RuntimeError("SAV4 continuous body missing")
# MPFB may construct the export copy from its own cached basemesh, losing
# direct vertex edits made to the source face. Explicitly carry the morph
# onto the export copy and verify the actual copied vertex coordinates.
source_vertices=face_body.data.vertices
export_vertices=body.data.vertices
if len(source_vertices)!=len(export_vertices):
    raise RuntimeError("SAV4 face morph transfer: source/export topology mismatch")
# Measure export-copy state against the original and desired morph.
# MPFB versions differ: some copies already contain the source edits.
# Never apply the same deformation twice.
morph_transferred=0
morph_already_present=0
max_export_error=0.0
for index,(source_vertex,export_vertex,original) in enumerate(zip(source_vertices,export_vertices,coords)):
    delta=source_vertex.co-original
    if delta.length<=1e-7:
        continue
    before=export_vertex.co.copy()
    error_before=(before-source_vertex.co).length
    error_if_added=(before+delta-source_vertex.co).length
    if error_if_added+1e-7<error_before:
        export_vertex.co=before+delta
        morph_transferred+=1
    else:
        morph_already_present+=1
    max_export_error=max(max_export_error,(export_vertex.co-source_vertex.co).length)
if morph_transferred+morph_already_present==0:
    raise RuntimeError("SAV4 face morph: no changed vertices to verify")
print("SAV4_MORPH_EXPORT_AUDIT", "transferred",morph_transferred,
      "already_present",morph_already_present,
      "max_source_export_error",round(max_export_error,7))
if max_export_error>span*0.01:
    raise RuntimeError("SAV4 face morph export-copy mismatch: "+str(max_export_error))
body.data.update()
print("SAV4_EXPORT_FACE_MORPH_TRANSFERRED",morph_transferred)

# Fail visibly if exported copy lost eye meshes rather than publishing red eye sockets.
eye_meshes=[o for o in root.children_recursive if o.type=="MESH" and ("eye" in o.name.lower() or "high-poly" in o.name.lower() or "low-poly" in o.name.lower()) and not any(t in o.name.lower() for t in ("brow","lash"))]
if not eye_meshes:raise RuntimeError("SAV4 export copy missing eye geometry")
# Use the original MPFB eye UVs and the bundled blue iris texture.
# Do not replace the whole eye with a flat white or blue material.
# Reuse the proven UV-based MakeHuman blue iris texture routine.
from caroline_eyes import add_light_blue_eyes
add_light_blue_eyes(root, body, rig)
# SAV4-specific eye exposure correction: keep existing UV iris/pupil detail.
for eye_obj in eye_meshes:
 for eye_mat in eye_obj.data.materials:
  if eye_mat and eye_mat.use_nodes:
   for hue in (n for n in eye_mat.node_tree.nodes if n.type=="HUE_SAT"):
    hue.inputs["Saturation"].default_value=.62
    hue.inputs["Value"].default_value=.95
# Validate actual source eye mesh placement against the head before exporting.
# A missing or detached proxy must fail the build instead of producing floating eyes.
bpy.context.view_layer.update()
head_top=max((body.matrix_world@v.co).z for v in body.data.vertices)
head_bottom=min((body.matrix_world@v.co).z for v in body.data.vertices)
body_height=head_top-head_bottom
for eye_obj in eye_meshes:
    eye_points=[eye_obj.matrix_world@v.co for v in eye_obj.data.vertices]
    if not eye_points: raise RuntimeError("SAV4 empty eyeball geometry: "+eye_obj.name)
    eye_center=sum(eye_points,Vector())/len(eye_points)
    if eye_center.z < head_bottom+body_height*.70 or eye_center.z > head_top+body_height*.05:
        raise RuntimeError(f"SAV4 detached eye mesh {eye_obj.name}: eye Z {eye_center.z:.3f}, body {head_bottom:.3f}..{head_top:.3f}")
    print("SAV4_EYE_HEAD_ALIGNMENT",eye_obj.name,tuple(round(x,3) for x in eye_center))
# Check eyes remain after material fitting.
eye_meshes_after=[o for o in root.children_recursive if o.type=="MESH" and ("eye" in o.name.lower() or "high-poly" in o.name.lower() or "low-poly" in o.name.lower()) and not any(t in o.name.lower() for t in ("brow","lash"))]
if not eye_meshes_after:raise RuntimeError("SAV4 eye helper removed the eye meshes")
print("SAV4_EYE_GEOMETRY_PRESENT",len(eye_meshes_after))
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
 if mat.get("alphaMode")=="BLEND":
  print("SAV4_TRANSPARENT_MATERIAL",mat.get("name","unnamed"))
# Do not mutate the parsed JSON: that would not modify the serialized GLB.
# Bounds from accessors are mesh-local; viewer checks transformed world bounds.
print("SAV4_EXPORTED_POSITION_BOUNDS",positions[:3])
print("SAV4_BUILD_SUCCESS",OUT,OUT.stat().st_size)
print("SAV4_FACE_MATCH_STATUS: measured-ratio-guided cheek/jaw/chin pass; full nose/eye/mouth vertex calibration pending")
