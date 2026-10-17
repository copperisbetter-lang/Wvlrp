"""Independent adult (18 years) MakeHuman Vulva2 auto-fitted inspection build.

Uses Manuel Bastioni's authentic MHX2 Vulva2 fitting/UV/delete-mask data.
No home-made oval sculpt, scaling, manual repositioning, or changes to Carol.
Vulva2 source is AGPL-3: see the source JSON's license field.
"""
import bpy, json, sys, zipfile, shutil, math, struct
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from bl_ext.wvlrp_local.mpfb.services.humanservice import HumanService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.assetservice import AssetService
from bl_ext.wvlrp_local.mpfb.services.locationservice import LocationService
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService
from bl_ext.wvlrp_local.mpfb.entities.objectproperties import HumanObjectProperties
from face_materials import preserve_photo_skin, verify_photo_skin_glb
from vulva2_clean_hair import add_clean_long_blonde_hair
from vulva2_preview_animations import add_vulva2_preview_animations

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"assets"/"vulva2-mhx2-source.json"
OUT=ROOT/"assets"/"vulva2-female18-inspection.glb"

def install_assets():
    pack=Path("/tmp/mh-system.zip")
    if not pack.is_file(): raise RuntimeError("MPFB MakeHuman system assets missing")
    root=Path(LocationService.get_user_data())
    cats={"skins","hair","eyes","eyebrows","eyelashes","teeth"}
    with zipfile.ZipFile(pack) as z:
        for item in z.infolist():
            parts=Path(item.filename).parts
            ix=next((i for i,part in enumerate(parts) if part in cats),None)
            if ix is None or item.is_dir(): continue
            dst=root/Path(*parts[ix:])
            dst.parent.mkdir(parents=True,exist_ok=True)
            with z.open(item) as a, open(dst,"wb") as b: shutil.copyfileobj(a,b)
    AssetService.invalidate_pack_metadata_cache()

def add_asset(h,subdir,names,kind):
    for n in names:
        found=AssetService.find_asset_absolute_path(n,asset_subdir=subdir)
        if found:
            return HumanService.add_mhclo_asset(found,h,asset_type=kind,material_type="GAMEENGINE")
    raise RuntimeError("Missing MakeHuman "+kind+" asset: "+str(names))

def fit_vulva2(root,body,rig):
    source=json.loads(DATA.read_text())
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
    # MHX2 supplies the exact underlying-vertex deletion mask. Mask instead
    # of leaving a body surface beneath the opening (prevents dark overlap).
    bitmap=proxy["delete_verts"]
    if len(bitmap)>len(body.data.vertices):
        raise RuntimeError("Vulva2 original deletion mask incompatible with body")
    delete=[i for i,val in enumerate(bitmap) if val]
    if not 15<len(delete)<200:
        raise RuntimeError("Vulva2 original deletion mask unexpected")
    maskgroup=body.vertex_groups.new(name="Vulva2 delete original covered faces")
    maskgroup.add(delete,1.,"REPLACE")
    mask=body.modifiers.new("Vulva2 original MHX2 skin opening","MASK")
    mask.vertex_group=maskgroup.name
    mask.invert_vertex_group=True
    ob["wvlrp_vulva2_authentic_mhx2"]=True
    ob["wvlrp_vulva2_source_uuid"]=proxy["uuid"]
    print("VULVA2_TRUE_AUTOFIT_SUCCESS",
          "vertices",len(mesh.vertices),"faces",len(mesh.polygons),
          "source_mask_vertices",len(delete),"fitted_to_original_hm08",True)
    return ob

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
install_assets()
h=HumanService.create_human()
h.name="Vulva2 Test Adult Female 18"
# MakeHuman slider 0.5=25 years; 18 = (18-1)/48 = 0.35417.
for key,value in (
    ("gender",0.0),("age",17./48.),("weight",.37),
    ("muscle",.27),("height",.49),("proportions",.52),
    ("cupsize",.72),("firmness",.33)
):
    HumanObjectProperties.set_value(key,value,entity_reference=h)
TargetService.reapply_macro_details(h)
skin=AssetService.find_asset_absolute_path("young_caucasian_female.mhmat",asset_subdir="skins")
if not skin: raise RuntimeError("Original UV female skin missing")
HumanService.set_character_skin(skin,h,skin_type="GAMEENGINE")
rig=HumanService.add_builtin_rig(h,"mixamo")
if not rig:raise RuntimeError("Mixamo rig failed")
add_asset(h,"eyes",["high-poly.mhclo","low-poly.mhclo"],"Eyes")
add_asset(h,"eyebrows",["eyebrow001.mhclo"],"Eyebrows")
add_asset(h,"eyelashes",["eyelashes01.mhclo"],"Eyelashes")
add_asset(h,"teeth",["teeth_base.mhclo"],"Teeth")
# The stock long01 hair uses a fitted cape and caused warped face/chest
# curtain polygons. Use a new, skull-anchored blonde hairstyle after copying.
root=ExportService.create_character_copy(h,name_suffix="_vulva2_adult18")
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,"Basemesh")
if not body: raise RuntimeError("MPFB adult basemesh absent")
rigs=[ob for ob in [root]+list(root.children_recursive) if ob.type=="ARMATURE"]
if len(rigs)!=1:raise RuntimeError("Rig export copy missing")
# Do NOT bake away or reindex hm08 vertices before fitting; MHX2 indices refer
# to the *original* MakeHuman mesh. Strip masks/helpers only AFTER fitting.
preserve_photo_skin(body,"Vulva2Test")
addon=fit_vulva2(root,body,rigs[0])
hair=add_clean_long_blonde_hair(root,body,rigs[0])
# Stop the build if an accidentally exported body-sized shell or
# misplaced facial asset would recreate the broken Sav3 silhouette.
def validate_visible_meshes():
    base_points=[body.matrix_world @ v.co for v in body.data.vertices]
    low=min(v.z for v in base_points); high=max(v.z for v in base_points)
    height=high-low
    for ob in [root]+list(root.children_recursive):
        if ob.type!="MESH" or ob==body or ob==addon or ob==hair:
            continue
        if not ob.data.vertices:
            continue
        name=ob.name.lower()
        points=[ob.matrix_world @ v.co for v in ob.data.vertices]
        zmin=min(v.z for v in points);zmax=max(v.z for v in points)
        extent=zmax-zmin
        if extent>height*.52:
            raise RuntimeError("Unexpected oversized accessory/body shell: "+ob.name)
        if any(k in name for k in ("eye","teeth","brow","lash")) and zmin<low+height*.70:
            raise RuntimeError("Facial asset displaced below head: "+ob.name)
    print("SAV3_VISIBLE_MESH_SANITY_PASS")
validate_visible_meshes()

add_vulva2_preview_animations(rigs[0])
# Never export old fitted hair pieces or extra copy bodies.
source_members=[root]+list(root.children_recursive)
# Only the body, anatomical fitting, generated hair and explicit facial
# assets belong in this unclothed inspection model. Unexpected garment
# meshes must never silently become a shin-length shell in the GLB.
allowed_face_terms=("eye","brow","lash","teeth","tooth","tongue","high-poly","low-poly")
unexpected=[o.name for o in source_members if o.type=="MESH"
            and o not in (body,addon,hair)
            and not any(term in o.name.lower() for term in allowed_face_terms)]
if unexpected:
    raise RuntimeError("Unrecognized accessory/garment meshes in adult export: "
                       +repr(unexpected))
print("SAV3_NO_GARMENT_SHELL_VERIFIED")
if any(o.type=="MESH" and "long01" in o.name.lower() for o in source_members):
    raise RuntimeError("Old face-shredding stock hair still in export")
if len([o for o in source_members if o.type=="MESH" and
        len(o.data.vertices)>10000])!=1:
    raise RuntimeError("Missing or duplicated full adult body geometry")
if len([o for o in source_members if o.get("wvlrp_vulva2_authentic_mhx2")])!=1:
    raise RuntimeError("Inspection export requires exactly one authentic Vulva2 attachment")
root["wvlrp_vulva2_18_comparison_root"]=True
bpy.context.view_layer.update()
bpy.ops.object.select_all(action="DESELECT")
members=[root]+list(root.children_recursive)
for ob in members:
    if ob.type in {"MESH","ARMATURE"} and not ob.hide_render:
        ob.select_set(True)
bpy.context.view_layer.objects.active=rigs[0]
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",
    use_selection=True,export_apply=False,export_materials="EXPORT",
    export_animations=True,export_nla_strips=True)
if not OUT.is_file() or OUT.stat().st_size<500000:
    raise RuntimeError("Vulva2 inspection GLB missing/too small")
raw=OUT.read_bytes()
if raw[:4]!=b"glTF":raise RuntimeError("Invalid GLB header")
n,t=struct.unpack_from("<II",raw,12)
glb=json.loads(raw[20:20+n])
verify_photo_skin_glb(glb,"Vulva2Test")
if not any("Vulva2 MHX2 true auto-fit" in node.get("name","") for node in glb.get("nodes",[])):
    raise RuntimeError("Actual Vulva2 anatomy absent from exported binary")
if not glb.get("skins"):raise RuntimeError("Model lost rig skinning")
clips={a.get("name","") for a in glb.get("animations",[])}
expected={"Vulva2 "+name for name in ("Stand","Walk","Run","Bend",
    "TouchToes","Sit","PickUp","HandsAndKnees","ElbowsAndKnees",
    "Crawl","LieDown","Wave")}
missing=expected-clips
if missing:raise RuntimeError("Inspection GLB missing real pose clips: "+str(sorted(missing)))
if not any("Vulva2 clean long blonde hair" in n.get("name","")
           for n in glb.get("nodes",[])):
    raise RuntimeError("Clean, rigged blonde hair missing from exported avatar")
if not any(m.get("name","").startswith("Vulva2 anatomy attachment")
           for m in glb.get("materials",[])):
    raise RuntimeError("Vulva2 anatomy isolation material missing from GLB")
print("VULVA2_FEMALE18_BUILD_SUCCESS",OUT,OUT.stat().st_size,
      "glb_meshes",len(glb.get("meshes",[])),"rig_skins",len(glb["skins"]),
      "body_and_long_hair",True,"real_motion_clips",len(clips))
