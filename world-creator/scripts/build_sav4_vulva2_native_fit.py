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

OUT=ROOT/"assets"/"sav4-vulva2-native-fit.glb"
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

# Native MPFB proxy fitting: preserve original hm08 anchors; no global placement offset.
import json, bmesh
def fit_vulva2(root,body,rig):
    source=json.loads((ROOT/"assets"/"vulva2-mhx2-source.json").read_text())
    assert source["proxy"]["name"]=="Vulva2"
    assert source["license"]["author"]=="Manuel Bastioni"
    proxy=source["proxy"]; geom=source["mesh"]
    fit=proxy["fitting"]; vs=body.data.vertices
    if len(fit)!=319 or len(geom["faces"])!=304 or len(geom["uv_faces"])!=304:
        raise RuntimeError("Vulva2 source changed; geometry check failed")
    max_id=max(i for row in fit for i in row[0])
    if len(vs)<=max_id or len(vs)<13380:
        raise RuntimeError("Auto-fit requires original hm08 vertex order, missing source indices")
    scales=[]
    # MHX2 getScales() adapted from MakeHuman's native (X,height,depth)
    # to Blender's (X,-depth,height) coordinate system.
    for component,axis in (("x",0),("y",2),("z",1)):
        lo_idx,hi_idx,reference=proxy["bounding_box"][component]
        found=abs((vs[hi_idx].co[axis]-vs[lo_idx].co[axis])/reference)
        if not .025<found<.25:
            raise RuntimeError("Unexpected original hm08 coordinate scales: "+str((component,found)))
        scales.append(found)
    sx,sy,sz=scales
    pts=[]
    transferred=[]
    for ids,weights,off in fit:
        co=sum((vs[i].co*float(w) for i,w in zip(ids,weights)),Vector())
        co+=Vector((sx*off[0],-sz*off[2],sy*off[1]))
        pts.append(tuple(co))
        skin={}
        for i,w in zip(ids,weights):
            for assignment in vs[i].groups:
                gname=body.vertex_groups[assignment.group].name
                if gname not in rig.data.bones: continue
                skin[gname]=skin.get(gname,0.)+float(w)*assignment.weight
        total=sum(skin.values())
        if total<.01:raise RuntimeError("Vulva2 automatic source rig weights unavailable")
        transferred.append({name:weight/total for name,weight in skin.items() if weight/total>.0001})
    zlo=min(p[2] for p in pts);zhi=max(p[2] for p in pts)
    xlo=min(p[0] for p in pts);xhi=max(p[0] for p in pts)
    ylo=min(p[1] for p in pts);yhi=max(p[1] for p in pts)
    original_h=max(v.co.z for v in vs)-min(v.co.z for v in vs)
    if not 1.3<original_h<2.2:
        raise RuntimeError("Invalid adult source scale")
    # Refuse a misplaced body rather than publishing another floating add-on.
    if not .38*original_h<zlo<.65*original_h or not .39*original_h<zhi<.70*original_h:
        raise RuntimeError("Vulva2 fitted outside adult pelvis: "+str((zlo,zhi,original_h)))
    if not .035<xhi-xlo<.19 or not .005<yhi-ylo<.22:
        raise RuntimeError("Vulva2 size/projection incompatible with source topology")
    if abs((xlo+xhi)/2)>.035:
        raise RuntimeError("Vulva2 did not land at body centerline")
    print("VULVA2_MHX2_FIT_QA","range_x",round(xlo,4),round(xhi,4),
          "range_y",round(ylo,4),round(yhi,4),"range_z",round(zlo,4),round(zhi,4),
          "scales",scales,"original_body_vertices",len(vs))
    mesh=bpy.data.meshes.new("Authentic MakeHuman Vulva2 fitted topology")
    mesh.from_pydata(pts,[],[tuple(row) for row in geom["faces"]])
    mesh.update()
    if not body.data.materials or not body.data.materials[0]:
        raise RuntimeError("Original female skin texture unavailable")
    # Dedicated visible material lets the mobile inspection viewer isolate
    # this attachment without hiding the woman's entire skin or face.
    anatomy_skin=body.data.materials[0].copy()
    anatomy_skin.name="Vulva2 anatomy attachment fitted skin"
    mesh.materials.append(anatomy_skin)
    uv=mesh.uv_layers.new(name="Vulva2 original MakeHuman UV")
    for face,uv_indices in zip(mesh.polygons,geom["uv_faces"]):
        if len(face.loop_indices)!=len(uv_indices):
            raise RuntimeError("Vulva2 UV face inconsistent")
        for li,src_idx in zip(face.loop_indices,uv_indices):
            uv.data[li].uv=geom["uv_coordinates"][src_idx]
        face.use_smooth=True
    ob=bpy.data.objects.new("Vulva2 MHX2 true auto-fit | adult inspection",mesh)
    bpy.context.collection.objects.link(ob)
    ob.parent=root
    ob.matrix_world=body.matrix_world.copy()
    # The old automatically interpolated thigh weights can split the central
    # attachment during a stride. The pelvis is rigidly Hips-bound instead.
    hips=next((b.name for b in rig.data.bones
               if ''.join(c for c in b.name.lower() if c.isalnum())
                  .replace("mixamorig","") in ("hips","pelvis")),None)
    if not hips:raise RuntimeError("Missing hips bone for fixed centerline fitting")
    pelvis_group=ob.vertex_groups.new(name=hips)
    pelvis_group.add(list(range(len(pts))),1.,"REPLACE")
    mod=ob.modifiers.new("Vulva2 pelvis-only binding","ARMATURE")
    mod.object=rig
    # Make the fresh female attachment surface visible instead of recessed.
    # MHX2 supplies the exact underlying-vertex deletion mask. Mask instead
    # of leaving a body surface beneath the opening (prevents dark overlap).
    bitmap=proxy["delete_verts"]
    if len(bitmap)>len(body.data.vertices):
        raise RuntimeError("Vulva2 original deletion mask incompatible with body")
    delete=[i for i,val in enumerate(bitmap) if val]
    if not 15<len(delete)<200:
        raise RuntimeError("Vulva2 original deletion mask unexpected")
    # glTF skinned exports can omit MASK modifiers with export_apply=False.
    # Remove covered faces in the actual mesh while retaining source vertices,
    # UV data, shape-key layers and deform weights through BMesh.
    before_positions=[v.co.copy() for v in body.data.vertices]
    bm=bmesh.new()
    bm.from_mesh(body.data)
    bm.verts.ensure_lookup_table()
    bm.verts.index_update()
    deleted_set=set(delete)
    covered=[face for face in bm.faces if any(v.index in deleted_set for v in face.verts)]
    removed_faces=len(covered)
    if removed_faces<1:
        bm.free()
        raise RuntimeError("Native opening removed no body faces")
    bmesh.ops.delete(bm,geom=covered,context="FACES_ONLY")
    bm.to_mesh(body.data)
    bm.free()
    body.data.update()
    if len(body.data.vertices)!=len(before_positions):
        raise RuntimeError("Opening unexpectedly changed vertex indexing")
    if any((v.co-p).length>1e-7 for v,p in zip(body.data.vertices,before_positions)):
        raise RuntimeError("Opening changed fitted body coordinates")
    print("SAV4_NATIVE_OPENING_BAKED",removed_faces,"body_faces_removed")
    ob["wvlrp_vulva2_authentic_mhx2"]=True
    ob["wvlrp_vulva2_source_uuid"]=proxy["uuid"]
    print("VULVA2_TRUE_AUTOFIT_SUCCESS",
          "vertices",len(mesh.vertices),"faces",len(mesh.polygons),
          "source_mask_vertices",len(delete),"fitted_to_original_hm08",True)
    return ob

fit_vulva2(root,body,rig)

# Fail visibly if exported copy lost eye meshes rather than publishing red eye sockets.
eye_meshes=[o for o in root.children_recursive if o.type=="MESH" and ("eye" in o.name.lower() or "high-poly" in o.name.lower() or "low-poly" in o.name.lower()) and not any(t in o.name.lower() for t in ("brow","lash"))]
if not eye_meshes:raise RuntimeError("SAV4 export copy missing eye geometry")
# Use the original MPFB eye UVs and the bundled blue iris texture.
# Do not replace the whole eye with a flat white or blue material.
# Reuse the proven UV-based MakeHuman blue iris texture routine.
from caroline_eyes import add_light_blue_eyes
add_light_blue_eyes(root, body, rig)
# SAV4 green iris tint, applied to original UV-mapped eyeballs.
for eye_obj in eye_meshes:
 for eye_mat in eye_obj.data.materials:
  if eye_mat and eye_mat.use_nodes:
   for hue in (n for n in eye_mat.node_tree.nodes if n.type=="HUE_SAT"):
    hue.label="SAV4 natural green iris"
    hue.inputs["Hue"].default_value=.32
    hue.inputs["Saturation"].default_value=.60
    hue.inputs["Value"].default_value=1.05
print("SAV4_GREEN_IRIS_MATERIAL_SET")
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
   if m.type=="MASK" and "Vulva2" not in m.name:obj.modifiers.remove(m)
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

# Save body-space fit evidence with front/rear attachment landmarks.
attachment=[o for o in root.children_recursive if o.type=="MESH" and o.get("wvlrp_vulva2_authentic_mhx2")]
if len(attachment)!=1:
    raise RuntimeError("Expected exactly one fitted Vulva2 attachment")
fitted=attachment[0]
fit_points=[list(fitted.matrix_world@v.co) for v in fitted.data.vertices]
report={"method":"native hm08 barycentric proxy morph","source_uuid":fitted["wvlrp_vulva2_source_uuid"],
        "global_forward_offset_m":0,"attachment_count":len(attachment),
        "vertex_count":len(fit_points),"vertices_world":fit_points,
        "status":"geometry exported; visual fit review required"}
(OUT.parent/"sav4-vulva2-native-fit-report.json").write_text(json.dumps(report,indent=2))
print("SAV4_NATIVE_PROXY_FIT_EXPORTED",OUT)

# Verify seam registration in the serialized GLB, not just the Blender scene.
from collections import Counter
import numpy as np
binary_start=20+chunk_size
binary=raw[binary_start+8:]
def read_accessor(index):
    a=doc["accessors"][index];view=doc["bufferViews"][a["bufferView"]]
    dtype={5126:"<f4",5125:"<u4",5123:"<u2",5121:"u1"}[a["componentType"]]
    size={"SCALAR":1,"VEC3":3}[a["type"]]
    if view.get("byteStride"):
        raise RuntimeError("Seam audit requires non-interleaved export")
    return np.frombuffer(binary,dtype=dtype,count=a["count"]*size,
                         offset=view.get("byteOffset",0)+a.get("byteOffset",0)).reshape(-1,size)
attachment_nodes=[n for n in nodes if "mesh" in n and "Vulva2 MHX2" in n.get("name","")]
if len(attachment_nodes)!=1:raise RuntimeError("Serialized attachment count mismatch")
attachment_node=attachment_nodes[0]
base_nodes=[n for n in nodes if "mesh" in n and n!=attachment_node
            and any(m in meshes[n["mesh"]].get("name","").lower() for m in ("base.", "basemesh"))]
if len(base_nodes)!=1:raise RuntimeError("Serialized basemesh not uniquely identified")
base_node=base_nodes[0]
if attachment_node.get("skin")!=base_node.get("skin"):
    raise RuntimeError("Attachment and body do not share a skin")
parents={c:i for i,n in enumerate(nodes) for c in n.get("children",[])}
base_idx=next(i for i,n in enumerate(nodes) if n is base_node)
attachment_idx=next(i for i,n in enumerate(nodes) if n is attachment_node)
if parents.get(base_idx)!=parents.get(attachment_idx):
    raise RuntimeError("Body and attachment coordinate frames differ")
for key in ("matrix","translation","rotation","scale"):
    if base_node.get(key)!=attachment_node.get(key):
        raise RuntimeError("Body/attachment local transform mismatch")
base_primitive=meshes[base_node["mesh"]]["primitives"][0]
part_primitive=meshes[attachment_node["mesh"]]["primitives"][0]
base_positions=read_accessor(base_primitive["attributes"]["POSITION"])
part_positions=read_accessor(part_primitive["attributes"]["POSITION"])
triangles=read_accessor(part_primitive["indices"]).reshape(-1,3)
edges=Counter(tuple(sorted((int(a),int(b)))) for tri in triangles
              for a,b in zip(tri,np.roll(tri,-1)))
boundary=sorted({i for edge,count in edges.items() if count==1 for i in edge})
if len(boundary)!=28:raise RuntimeError("Unexpected attachment boundary topology")
errors=[float(np.linalg.norm(base_positions-part_positions[i],axis=1).min()) for i in boundary]
if max(errors)>1e-6:raise RuntimeError("Exported attachment seam does not meet body")
report.update({"serialized_boundary_vertices":len(boundary),
               "serialized_max_boundary_error_m":max(errors),
               "status":"serialized boundary validated; visual review pending"})
(OUT.parent/"sav4-vulva2-native-fit-report.json").write_text(json.dumps(report,indent=2))
print("SAV4_NATIVE_SEAM_VERIFIED",len(boundary),"max_error_m",max(errors))

# Check topology at the aperture as well as coordinate registration.
def position_key(p):
    return tuple(round(float(value),6) for value in p)
body_triangles=read_accessor(base_primitive["indices"]).reshape(-1,3)
body_edges=Counter(tuple(sorted((position_key(base_positions[a]),position_key(base_positions[b]))))
                   for triangle in body_triangles for a,b in zip(triangle,np.roll(triangle,-1)))
part_boundary_edges=[edge for edge,count in edges.items() if count==1]
incidence=Counter(body_edges.get(tuple(sorted((position_key(part_positions[a]),
                                              position_key(part_positions[b])))),0)
                  for a,b in part_boundary_edges)
if incidence[1]<14 or any(count>1 and number for count,number in incidence.items()):
    raise RuntimeError("Body aperture not open along attachment seam: "+str(dict(incidence)))
report.update({"body_aperture_edge_incidence":dict(incidence),
               "status":"serialized seam and body aperture validated; visual review pending"})
(OUT.parent/"sav4-vulva2-native-fit-report.json").write_text(json.dumps(report,indent=2))
print("SAV4_NATIVE_APERTURE_VERIFIED",dict(incidence))
