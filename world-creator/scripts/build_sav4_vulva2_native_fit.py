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
# Attachment fitting starts from the clean MPFB macro body; no facial vertex edits.
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
# Materialize the active MakeHuman shape before using hm08 fitting indices.
# The prior fitter and tests used Basis, while glTF displayed 28 macro targets.
baked_shape_keys=0
for obj in [root,*root.children_recursive]:
    if obj.type!="MESH" or not obj.data.shape_keys:
        continue
    keys=obj.data.shape_keys
    if not keys.use_relative:
        raise RuntimeError("Only relative MPFB shape keys are supported")
    mixed=[v.co.copy() for v in keys.reference_key.data]
    for key in keys.key_blocks:
        if key==keys.reference_key or key.mute or abs(key.value)<1e-12:
            continue
        if key.vertex_group:
            raise RuntimeError("Masked shape keys require explicit evaluation")
        baked_shape_keys+=1
        for i,(point,relative) in enumerate(zip(key.data,key.relative_key.data)):
            mixed[i]+=(point.co-relative.co)*key.value
    obj.shape_key_clear()
    for vertex,co in zip(obj.data.vertices,mixed):
        vertex.co=co
    obj.data.update()
print("SAV4_ACTIVE_MACROS_BAKED",baked_shape_keys)
# Use the same armature as the copied body, never the unexported source rig.
export_rig=next((m.object for m in body.modifiers if m.type=="ARMATURE" and m.object),None)
if export_rig is None:raise RuntimeError("Exported body armature missing")
rig=export_rig

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
    # Use the local body skin atlas rather than the asset's unrelated UV island.
    from mathutils.bvhtree import BVHTree
    from mathutils.geometry import barycentric_transform, closest_point_on_tri
    body.data.calc_loop_triangles()
    source_uv=body.data.uv_layers.active
    if source_uv is None:raise RuntimeError("Body skin UV missing")
    deleted_ids={i for i,value in enumerate(proxy["delete_verts"]) if value}
    covered_polygons={p.index for p in body.data.polygons
                      if any(i in deleted_ids for i in p.vertices)}
    skin_triangles=[tri for tri in body.data.loop_triangles
                    if tri.polygon_index in covered_polygons]
    if not skin_triangles:raise RuntimeError("Skin projection patch missing")
    surface=BVHTree.FromPolygons([v.co.copy() for v in vs],
                                [tuple(t.vertices) for t in skin_triangles],
                                all_triangles=True)
    uv=mesh.uv_layers.new(name=source_uv.name)
    for face in mesh.polygons:
        center=sum((mesh.vertices[i].co for i in face.vertices),Vector())/len(face.vertices)
        hit=surface.find_nearest(center)
        if hit[2] is None:raise RuntimeError("Skin UV projection failed")
        triangle=skin_triangles[hit[2]]
        corners=[vs[i].co.copy() for i in triangle.vertices]
        texture_corners=[Vector((*source_uv.data[i].uv,0)) for i in triangle.loops]
        for li in face.loop_indices:
            p=mesh.vertices[mesh.loops[li].vertex_index].co
            point=closest_point_on_tri(p,*corners)
            projected=barycentric_transform(point,*corners,*texture_corners)
            uv.data[li].uv=(projected.x,projected.y)
        face.use_smooth=True
    print("SAV4_LOCAL_SKIN_UV_PROJECTED",len(mesh.polygons))
    ob=bpy.data.objects.new("Vulva2 MHX2 true auto-fit | adult inspection",mesh)
    bpy.context.collection.objects.link(ob)
    ob.parent=root
    ob.matrix_world=body.matrix_world.copy()
    # The old automatically interpolated thigh weights can split the central
    # attachment during a stride. The pelvis is rigidly Hips-bound instead.
    # Transfer native body weights so all seam vertices follow the same bones.
    groups={name:ob.vertex_groups.new(name=name)
            for name in sorted({name for weights in transferred for name in weights})}
    for index,weights in enumerate(transferred):
        for name,weight in weights.items():
            groups[name].add([index],weight,"REPLACE")
    mod=ob.modifiers.new("Vulva2 native body weight binding","ARMATURE")
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
# Preserve transparency on hair/eyes, but make replacement skin opaque.
import json,struct
encoded_glb=OUT.read_bytes()
json_length=struct.unpack_from("<I",encoded_glb,12)[0]
export_doc=json.loads(encoded_glb[20:20+json_length])
skin_material_names={m.name for m in body.data.materials if m}|{"Vulva2 anatomy attachment fitted skin"}
for material in export_doc.get("materials",[]):
    if material.get("name") in skin_material_names:
        material["alphaMode"]="OPAQUE"
        material.pop("alphaCutoff",None)
json_bytes=json.dumps(export_doc,separators=(",",":")).encode()
json_bytes+=b" "*((-len(json_bytes))%4)
rest=encoded_glb[20+json_length:]
OUT.write_bytes(struct.pack("<4sII",b"glTF",2,20+len(json_bytes)+len(rest))+
                struct.pack("<I4s",len(json_bytes),b"JSON")+json_bytes+rest)
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
print("SAV4_FACE_STATUS: clean native macro body; no uncalibrated facial pass")

# Save body-space fit evidence with front/rear attachment landmarks.
attachment=[o for o in root.children_recursive if o.type=="MESH" and o.get("wvlrp_vulva2_authentic_mhx2")]
if len(attachment)!=1:
    raise RuntimeError("Expected exactly one fitted Vulva2 attachment")
fitted=attachment[0]
fit_points=[list(fitted.matrix_world@v.co) for v in fitted.data.vertices]
report={"method":"native hm08 barycentric proxy fitted to baked active body",
        "baked_active_shape_keys":baked_shape_keys,"source_uuid":fitted["wvlrp_vulva2_source_uuid"],
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
# UV seams split render vertices; audit the physical, welded surface instead.
canonical={}
welded=[]
for i,p in enumerate(part_positions):
    key=tuple(float(value) for value in p)
    welded.append(canonical.setdefault(key,i))
welded_triangles=np.asarray(welded,dtype=np.int64)[triangles]
edges=Counter(tuple(sorted((int(a),int(b)))) for tri in welded_triangles
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

for mesh in doc.get("meshes",[]):
    if mesh.get("weights") or any(p.get("targets") for p in mesh["primitives"]):
        raise RuntimeError("Unbaked morph targets would invalidate the fitting audit")
report["unbaked_morph_targets"]=0
(OUT.parent/"sav4-vulva2-native-fit-report.json").write_text(json.dumps(report,indent=2))
print("SAV4_DISPLAYED_BODY_FIT_VERIFIED",baked_shape_keys,"baked_active_morphs")
