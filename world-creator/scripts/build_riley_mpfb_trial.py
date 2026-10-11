"""WVLRP Chrissy MPFB trial (reference-guided, NOT automatic photo reconstruction).
Uses free MPFB body morph system, CC0 stock skin + hair, Mixamo compatible rig.
Does not replace the existing Riley character or world data. Generated result requires human QA.
"""
import bpy, os, sys, zipfile, json, math, traceback
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "chrissy-mpfb-trial.glb"
PNG = ROOT / "assets" / "chrissy-mpfb-trial-preview.png"

# MPFB is installed as a Blender extension into the workflow's local repository.
from bl_ext.wvlrp_local.mpfb.services.humanservice import HumanService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.assetservice import AssetService
from bl_ext.wvlrp_local.mpfb.services.locationservice import LocationService
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService
from bl_ext.wvlrp_local.mpfb.entities.objectproperties import HumanObjectProperties

def load_system_pack():
    pack = Path("/tmp/mh-system.zip")
    if not pack.exists():
        raise RuntimeError("Missing MakeHuman system CC0 asset pack")
    root=Path(LocationService.get_user_data())
    categories={"skins","hair","clothes","eyes","eyebrows","eyelashes","tongue","teeth","packs","proxymeshes","poses"}
    count=0
    with zipfile.ZipFile(pack) as z:
        for member in z.infolist():
            parts=Path(member.filename).parts
            idx=next((i for i,p in enumerate(parts) if p in categories),None)
            if idx is None or member.is_dir(): continue
            rel=Path(*parts[idx:])
            if ".." in rel.parts: continue
            dest=root/rel
            dest.parent.mkdir(parents=True,exist_ok=True)
            with z.open(member) as src, open(dest,"wb") as dst:
                import shutil
                shutil.copyfileobj(src,dst)
            count+=1
    print("WVLRP_ASSETS_INSTALLED",count,root)
    if count < 20:
        raise RuntimeError("Asset pack contained fewer than 20 usable files")
    AssetService.invalidate_pack_metadata_cache()

def add_asset(basemesh, subdir, names, asset_type):
    for name in names:
        f=AssetService.find_asset_absolute_path(name,asset_subdir=subdir)
        if f:
            print("WVLRP_ASSET",asset_type,name)
            return HumanService.add_mhclo_asset(f,basemesh,asset_type=asset_type,material_type="GAMEENGINE")
    print("WVLRP_ASSET_MISSING",asset_type,names)
    return None

def tint(mesh, color, roughness=.78):
    if not mesh: return
    for i, mat in enumerate(mesh.data.materials):
        if not mat: continue
        mat=mat.copy()
        mesh.data.materials[i]=mat
        mat.use_nodes=True
        for n in mat.node_tree.nodes:
            if n.type=="BSDF_PRINCIPLED":
                n.inputs["Base Color"].default_value=(*color,1)
                n.inputs["Roughness"].default_value=roughness
                n.inputs["Metallic"].default_value=0

def clean_skin_material(body):
    """UV-independent, uniformly shaded skin test until original textures are repaired.
    Mesh and sculpt detail are kept; this fixes the large patchy/discolored UV areas.
    """
    skin=bpy.data.materials.new("Chrissy warm skin - clean opaque PBR")
    skin.diffuse_color=(.72,.51,.43,1)
    skin.use_nodes=True
    p=skin.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(.72,.51,.43,1)
    p.inputs["Roughness"].default_value=.79
    p.inputs["Metallic"].default_value=0
    if "Subsurface Weight" in p.inputs: p.inputs["Subsurface Weight"].default_value=.06
    if not body.data.materials: body.data.materials.append(skin)
    else:
        for i in range(len(body.data.materials)): body.data.materials[i]=skin
    for face in body.data.polygons: face.use_smooth=True
    print("WVLRP_CLEAN_SKIN",body.name,len(body.data.polygons))


def garment(base, name, zlo, zhi, max_x_fraction, color, thickness=0.006):
    # Extract a real anatomical BODY SURFACE patch rather than making a balloon shell.
    # It shares the body's rig vertex groups and stays skinned to the same armature.
    import bmesh
    obj=base.copy()
    obj.data=base.data.copy()
    bpy.context.collection.objects.link(obj)
    obj.name=name
    coords=[base.matrix_world @ Vector(v) for v in base.bound_box]
    bottom=min(p.z for p in coords)
    tall=max(p.z for p in coords)-bottom
    bx=(max(p.x for p in coords)+min(p.x for p in coords))/2
    bm=bmesh.new();bm.from_mesh(obj.data);bm.verts.ensure_lookup_table()
    drop=[]
    for face in bm.faces:
        c=face.calc_center_median()
        relative=(c.z-bottom)/tall
        keep=(zlo<=relative<=zhi and abs(c.x-bx)<=max_x_fraction*tall)
        if not keep: drop.append(face)
    bmesh.ops.delete(bm,geom=drop,context="FACES")
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal*thickness
    bm.to_mesh(obj.data);bm.free()
    if not len(obj.data.polygons):
        bpy.data.objects.remove(obj,do_unlink=True)
        raise RuntimeError("No body faces for "+name)
    mat=bpy.data.materials.new(name+" taupe knit")
    mat.diffuse_color=(*color,1)
    mat.use_nodes=True
    p=mat.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(*color,1)
    p.inputs["Roughness"].default_value=.88
    p.inputs["Metallic"].default_value=0
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj

def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    load_system_pack()
    h=HumanService.create_human()
    h.name="Chrissy - MPFB original body mesh"
    # The render sheet is the target (front/profile/rear). This is an approximate
    # parametric first pass, NOT a reconstruction of facial pixels or calibrated bust.
    # The original trial mistakenly chose male (1.0) at the gender macro.
    # MPFB macro cupsize 1.0 = maximum, firmness 0.0 = minimum.
    # Use its actual continuous anatomy targets, rather than rigid add-on spheres.
    for key,val in [("gender",0.0),("age",.40),("weight",.49),
                    ("muscle",.34),("height",.55),("proportions",.48),
                    ("cupsize",.98),("firmness",.12)]:
        try:
            HumanObjectProperties.set_value(key,val,entity_reference=h)
            print("WVLRP_PROP",key,val)
        except Exception as ex:
            print("WVLRP_PROP_SKIPPED",key,str(ex)[:140])
    TargetService.reapply_macro_details(h)
    for key,expected in (("gender",0.0),("cupsize",.98),("firmness",.12)):
        actual=float(HumanObjectProperties.get_value(key,entity_reference=h))
        print("WVLRP_VERIFY_MACRO",key,actual)
        if abs(actual-expected)>.01:
            raise RuntimeError("Chrissy macro mismatch for "+key)

    skin=AssetService.find_asset_absolute_path("young_caucasian_female.mhmat",asset_subdir="skins")
    if not skin: raise RuntimeError("MakeHuman CC0 skin missing")
    HumanService.set_character_skin(skin,h,skin_type="GAMEENGINE")
    arm=HumanService.add_builtin_rig(h,"mixamo")
    if arm is None: raise RuntimeError("MPFB Mixamo skeleton creation failed")
    for sub,names,kind in [
        ("eyes",["high-poly.mhclo","low-poly.mhclo"],"Eyes"),
        ("eyebrows",["eyebrow001.mhclo"],"Eyebrows"),
        ("eyelashes",["eyelashes01.mhclo"],"Eyelashes"),
        ("teeth",["teeth_base.mhclo"],"Teeth")]:
        add_asset(h,sub,names,kind)
    hair=add_asset(h,"hair",["long01.mhclo"],"Hair")
    tint(hair,(.78,.61,.37),.83)

    export_root=ExportService.create_character_copy(h,name_suffix="_wvrlp_ref")
    exp=ObjectService.find_object_of_type_amongst_nearest_relatives(export_root,"Basemesh")
    if not exp: raise RuntimeError("MPFB export body copy missing")
    ExportService.bake_modifiers_remove_helpers(exp,
        bake_masks=True,bake_subdiv=False,remove_helpers=True,also_proxy=True)
    clean_skin_material(exp)
    top=garment(exp,"Chrissy taupe fitted tank - reference trial",.575,.835,.129,(.55,.51,.47))
    shorts=garment(exp,"Chrissy taupe short drawstring shorts - reference trial",.435,.575,.163,(.51,.47,.43),.011)
    top.parent=export_root
    shorts.parent=export_root

    # The tank and shorts follow the built-in breast/hip morphology. Gravity-soft
    # lower breast contour comes from the MPFB firmness target, not animations.
    # Lightweight idle animation sample so exported GLB includes usable skeletal data.
    children=list(ObjectService.get_list_of_children(export_root))
    rigs=[o for o in [export_root]+children if o.type=="ARMATURE"]
    if not rigs: raise RuntimeError("Export copy is missing armature")
    rig=rigs[0]
    print("WVLRP_RIG",rig.name,len(rig.data.bones))
    actionbone=next((b for b in rig.pose.bones if "Spine" in b.name or "spine" in b.name),None)
    if actionbone is None: actionbone=next(iter(rig.pose.bones))
    actionbone.rotation_mode="XYZ"
    for frame,angle in [(1,0),(13,.015),(25,0),(37,-.015),(49,0)]:
        actionbone.rotation_euler.x=angle
        actionbone.keyframe_insert(data_path="rotation_euler",frame=frame,group="Idle")
    if rig.animation_data and rig.animation_data.action:
        rig.animation_data.action.name="Chrissy Idle - MPFB test"
    bpy.context.scene.frame_set(1)

    bpy.ops.object.select_all(action="DESELECT")
    chosen=[export_root]+list(ObjectService.get_list_of_children(export_root))
    chosen+=[top,shorts]
    for obj in set(chosen): obj.select_set(True)
    bpy.context.view_layer.objects.active=rig
    OUT.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",
       use_selection=True,export_animations=True,export_nla_strips=False,
       export_materials="EXPORT")
    if not OUT.exists() or OUT.stat().st_size<100000:
        raise RuntimeError("GLB missing or unexpectedly small")
    # Structural verification: GLB JSON includes skin + model + idle anim.
    import struct
    bs=OUT.read_bytes()
    n,kind=struct.unpack_from("<II",bs,12)
    meta=json.loads(bs[20:20+n].decode("utf-8"))
    print("WVLRP_RESULT_GLB",OUT,OUT.stat().st_size,"skins",len(meta.get("skins",[])),
        "joint_count",len(meta.get("skins",[{}])[0].get("joints",[])),
        "animations",len(meta.get("animations",[])),"meshes",len(meta.get("meshes",[])))
    assert len(meta.get("skins",[]))>=1, "No rigged skin in output"
    assert len(meta["skins"][0].get("joints",[]))>=25, "Skeleton too small"

    # Best-effort reference preview; do not fail successfully exported GLB if display render fails.
    try:
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
        bpy.ops.import_scene.gltf(filepath=str(OUT))
        for o in bpy.context.scene.objects:
            if o.type=="ARMATURE": o.rotation_euler=(0,0,0)
        def light(pos,energy,size):
            d=bpy.data.lights.new("Studio",type="AREA");d.energy=energy;d.shape="DISK";d.size=size
            o=bpy.data.objects.new("Studio light",d);bpy.context.collection.objects.link(o);o.location=pos
            o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat("-Z","Y").to_euler()
        light((2,-3,4),850,4);light((-2,1,3),650,3)
        camdata=bpy.data.cameras.new("Preview ortho");cam=bpy.data.objects.new("Preview camera",camdata)
        bpy.context.collection.objects.link(cam)
        cam.location=(0,-4,1.35);cam.rotation_euler=(Vector((0,0,.85))-cam.location).to_track_quat("-Z","Y").to_euler()
        camdata.type="ORTHO";camdata.ortho_scale=2.35;bpy.context.scene.camera=cam
        world=bpy.data.worlds.new("Preview lighting");bpy.context.scene.world=world
        world.use_nodes=True;world.node_tree.nodes["Background"].inputs["Color"].default_value=(.7,.73,.75,1)
        world.node_tree.nodes["Background"].inputs["Strength"].default_value=.8
        scene=bpy.context.scene
        scene.render.engine="CYCLES";scene.cycles.samples=16
        scene.render.resolution_x=700;scene.render.resolution_y=950;scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG";scene.render.filepath=str(PNG)
        bpy.ops.render.render(write_still=True)
        print("WVLRP_PREVIEW_SAVED",PNG,PNG.stat().st_size)
    except Exception:
        print("WVLRP_RENDER_WARNING",traceback.format_exc())
    print("WVLRP_M P F B _ S U C C E S S".replace(" ",""))

if __name__=="__main__":main()
