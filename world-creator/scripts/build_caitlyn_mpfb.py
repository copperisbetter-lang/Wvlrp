"""WVLRP Caitlyn MPFB nude anatomical trial. Separate new adult game avatar.
Uses MPFB CC0 anatomy/skin, real ash-platinum wavy hair, and Mixamo skeleton.
No clothing/proxy outfit. Does not replace Riley, Chrissy, or world data. Requires visual QA.
"""
import bpy, os, sys, zipfile, json, math, traceback
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "caitlyn-mpfb-trial.glb"
PNG = ROOT / "assets" / "caitlyn-mpfb-trial-preview.png"

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
                # Many MakeHuman hair materials have an image connected to
                # Base Color, which would override the requested red swatch.
                # Keep hair-card opacity/alpha links; detach ONLY Base Color.
                for link in list(mat.node_tree.links):
                    if link.to_node==n and link.to_socket.name=="Base Color":
                        mat.node_tree.links.remove(link)
                n.inputs["Base Color"].default_value=(*color,1)
                n.inputs["Roughness"].default_value=roughness
                n.inputs["Metallic"].default_value=0

def add_soft_waves(hair):
    """Shape the lower portions of the stock long hairstyle into gentle waves.
    Leave the roots/scalp anchored and keep a continuous real 3D hair mesh.
    """
    if not hair or hair.type!="MESH": return
    vs=hair.data.vertices
    if not vs: return
    zlo=min(v.co.z for v in vs); zhi=max(v.co.z for v in vs)
    depth=max(zhi-zlo,.001)
    for v in vs:
        p=v.co
        t=(zhi-p.z)/depth
        amp=.014*max(0.0,min(1.0,(t-.28)/.28))
        # Two offset, soft wavelengths: not a uniform zigzag or new object.
        p.x+=amp*math.sin((p.z-zlo)*18.0+p.x*8.0)
        p.y+=amp*.35*math.sin((p.z-zlo)*15.0+p.x*6.0)
    hair.data.update()
    print("WVLRP_CAITLYN_HAIR_WAVES",len(vs))


def clean_skin_material(body):
    """UV-independent skin with subtle, reproducible variation in 3D vertex color.

    Amy's old export used one uniform flat skin swatch. Here mild spatial
    variation and natural blush are encoded as glTF-supported vertex colors
    without risking a mismatched/incorrectly mapped MakeHuman UV texture.
    Do not touch unrelated characters or modify their materials.
    """
    import math
    verts=body.data.vertices
    zlo=min(v.co.z for v in verts); zhi=max(v.co.z for v in verts)
    height=max(zhi-zlo,.001)
    col=body.data.color_attributes.get("CaitlynSkinColor")
    if col is None:
        col=body.data.color_attributes.new(name="CaitlynSkinColor",type="FLOAT_COLOR",domain="CORNER")
    def clamp(x): return max(0.,min(1.,x))
    def skin_for_vertex(v):
        p=v.co
        norm=(p.z-zlo)/height
        # Very low contrast variation, never a blotchy/striped skin shader.
        grain=(math.sin(p.x*57+p.y*31+p.z*83)*math.sin(p.x*41-p.y*43+p.z*67))
        tone=.012*grain
        blush=0.
        if norm>.83 and p.y<.055:
            cheekx=abs(abs(p.x)-.085)
            facey=math.exp(-((norm-.918)/.033)**2)
            blush=.035*math.exp(-(cheekx/.065)**2)*facey
        warm=math.exp(-((norm-.53)/.08)**2)*.008
        return (clamp(.82+tone+warm-blush*.6),
                clamp(.655+tone*.7+warm-blush*.95),
                clamp(.585+tone*.6+warm-blush),1.0)
    shades=[skin_for_vertex(v) for v in verts]
    for poly in body.data.polygons:
        poly.use_smooth=True
        for idx in poly.loop_indices:
            col.data[idx].color=shades[body.data.loops[idx].vertex_index]
    skin=bpy.data.materials.new("Caitlyn natural fair skin · vertex PBR")
    skin.diffuse_color=(.82,.655,.585,1)
    skin.use_nodes=True
    nodes=skin.node_tree.nodes
    p=nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(.82,.655,.585,1)
    p.inputs["Roughness"].default_value=.68
    p.inputs["Metallic"].default_value=0
    if "Subsurface Weight" in p.inputs: p.inputs["Subsurface Weight"].default_value=.085
    c=nodes.new("ShaderNodeVertexColor")
    c.layer_name="CaitlynSkinColor"
    skin.node_tree.links.new(c.outputs["Color"],p.inputs["Base Color"])
    if not body.data.materials: body.data.materials.append(skin)
    else:
        for i in range(len(body.data.materials)): body.data.materials[i]=skin
    print("WVLRP_CAITLYN_TEXTURED_SKIN",body.name,len(verts),len(body.data.polygons))

def polish_anatomical_shape(body):
    """Subtle slim-waist/hip adjustment on the ORIGINAL continuous MPFB body mesh.
    Keep morph-based bust contour intact; no separate breast geometry, no garment.
    """
    import math
    verts=body.data.vertices
    lo=min(v.co.z for v in verts)
    hi=max(v.co.z for v in verts)
    tall=max(hi-lo,0.001)
    cx=(max(v.co.x for v in verts)+min(v.co.x for v in verts))*.5
    for v in verts:
        p=v.co
        z=(p.z-lo)/tall
        if abs(p.x-cx)>tall*.19: continue
        waist=math.exp(-((z-.625)/.078)**2)
        hips=math.exp(-((z-.52)/.080)**2)
        narrow=.058*waist+.038*hips
        p.x=cx+(p.x-cx)*(1-narrow)
        p.y*=1-.027*waist-.020*hips
    body.data.update()
    print("WVLRP_CAITLYN_CONTINUOUS_BODY_POLISHED",len(verts))


def check_and_repair_pelvic_surface(body):
    """Check original unclothed topology at the pelvis, not just polygon total.

    A closed, solid-looking body must have no stray open crotch border.
    Only fill a small, fully enclosed boundary loop in the pelvic midline.
    Never run a generic 'fill all holes' (mouth/eyelids/fingers can be open).
    Reuse existing skin/rigged rim vertices to preserve bone weights.
    """
    import bmesh
    from collections import defaultdict
    bm=bmesh.new()
    bm.from_mesh(body.data)
    bm.verts.ensure_lookup_table()
    bm.edges.ensure_lookup_table()
    coords=[v.co for v in bm.verts]
    lo=min(v.z for v in coords); hi=max(v.z for v in coords)
    tall=hi-lo
    cx=(min(v.x for v in coords)+max(v.x for v in coords))*.5
    if tall<=0: raise RuntimeError("Caitlyn body has invalid bounds")
    def in_pelvis(v):
        z=(v.co.z-lo)/tall
        return .35 <= z <= .65 and abs(v.co.x-cx) <= .19*tall
    boundaries=[e for e in bm.edges if e.is_boundary]
    candidates=[e for e in boundaries if all(in_pelvis(v) for v in e.verts)]
    print("WVLRP_CAITLYN_TOPOLOGY_BEFORE","boundary_edges",len(boundaries),
          "pelvis_boundary_edges",len(candidates))
    # Gather WHOLE boundary components so we never close a huge hole by
    # selecting only its few edges that happen to pass near the crotch.
    near=set(candidates)
    incident=defaultdict(set)
    for e in boundaries:
        for v in e.verts: incident[v].add(e)
    visited=set(); filled=0
    for start in candidates:
        if start in visited: continue
        stack=[start]; component=set()
        while stack:
            edge=stack.pop()
            if edge in component: continue
            component.add(edge)
            for v in edge.verts: stack.extend(incident[v]-component)
        visited.update(component)
        rim={v for edge in component for v in edge.verts}
        perimeter=sum(e.calc_length() for e in component)
        if not all(in_pelvis(v) for v in rim): continue
        # A small local opening (not waist, leg cuff, or a body-sized cut).
        if perimeter > .42*tall or len(component)>500: continue
        if len(component)<3: continue
        try:
            result=bmesh.ops.holes_fill(bm,edges=list(component),sides=0)
            patches=result.get("faces",[])
            for face in patches: face.smooth=True
            filled+=len(patches)
            print("WVLRP_CAITLYN_PELVIS_PATCH","rim",len(component),
                  "perimeter_m",round(perimeter,4),"faces",len(patches))
        except Exception as exc:
            bm.free()
            raise RuntimeError("Unable to close Caitlyn's small pelvic hole") from exc
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(body.data)
    bm.free()
    body.data.update()
    # Fresh mesh after repair verifies there is no unresolved pelvic edge.
    audit=bmesh.new();audit.from_mesh(body.data)
    remaining=[e for e in audit.edges if e.is_boundary and
              all(.35 <= (v.co.z-lo)/tall <= .65 and
                  abs(v.co.x-cx)<=.19*tall for v in e.verts)]
    print("WVLRP_CAITLYN_PELVIS_QA","patched_faces",filled,
          "remaining_open_edges",len(remaining))
    audit.free()
    if remaining:
        raise RuntimeError("Pelvic mesh still has %d exposed hole edges" % len(remaining))


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    load_system_pack()
    h=HumanService.create_human()
    h.name="Caitlyn - MPFB original body mesh"
    # Brand-new adult Caitlyn character; parametric modeling, no photo likeness.
    # Measurements are visual targets, not calibrated scanner measurements.
    # The original trial mistakenly chose male (1.0) at the gender macro.
    # MPFB macro cupsize 1.0 = maximum, firmness 0.0 = minimum.
    # Use its actual continuous anatomy targets, rather than rigid add-on spheres.
    for key,val in [("gender",0.0),("age",.38),("weight",.49),
                    ("muscle",.34),("height",.55),("proportions",.48),
                    ("cupsize",.50),("firmness",.37)]:
        try:
            HumanObjectProperties.set_value(key,val,entity_reference=h)
            print("WVLRP_PROP",key,val)
        except Exception as ex:
            print("WVLRP_PROP_SKIPPED",key,str(ex)[:140])
    TargetService.reapply_macro_details(h)
    for key,expected in (("gender",0.0),("cupsize",.50),("firmness",.37)):
        actual=float(HumanObjectProperties.get_value(key,entity_reference=h))
        print("WVLRP_VERIFY_MACRO",key,actual)
        if abs(actual-expected)>.01:
            raise RuntimeError("Caitlyn macro mismatch for "+key)

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
    if hair is None: raise RuntimeError('MPFB long hairstyle asset is unavailable')
    tint(hair,(.85,.78,.67),.70)
    add_soft_waves(hair)

    export_root=ExportService.create_character_copy(h,name_suffix="_wvrlp_ref")
    # The copied MakeHuman long01 mesh used its stock brown shader even after
    # tinting the original source hair. Set materials on the EXPORTED mesh.
    # Only Caitlyn's export copy is affected; Amy/Christy/Riley are untouched.
    def pbr_solid(name,rgba,roughness=.67):
        m=bpy.data.materials.new(name)
        m.diffuse_color=(*rgba,1)
        m.use_nodes=True
        bsdf=m.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value=(*rgba,1)
        bsdf.inputs["Metallic"].default_value=0.0
        bsdf.inputs["Roughness"].default_value=roughness
        if "Coat Weight" in bsdf.inputs: bsdf.inputs["Coat Weight"].default_value=.10
        return m
    all_export_objects=[export_root]+list(ObjectService.get_list_of_children(export_root))
    for obj in all_export_objects:
        if obj.type!="MESH":continue
        low=obj.name.lower()
        if "long01" in low:
            mat=pbr_solid("Caitlyn platinum ash blonde · real exported hair",
                          (.91,.86,.75),.65)
            obj.data.materials.clear();obj.data.materials.append(mat)
            print("WVLRP_CAITLYN_PLATINUM_HAIR",obj.name,mat.name)
        elif "eyebrow" in low:
            mat=pbr_solid("Caitlyn cool blonde brows",(.43,.36,.30),.87)
            obj.data.materials.clear();obj.data.materials.append(mat)
            print("WVLRP_CAITLYN_BROWS",obj.name)
        elif "eyelash" in low:
            mat=pbr_solid("Caitlyn natural brown lashes",(.21,.16,.145),.82)
            obj.data.materials.clear();obj.data.materials.append(mat)
            print("WVLRP_CAITLYN_LASHES",obj.name)
    exp=ObjectService.find_object_of_type_amongst_nearest_relatives(export_root,"Basemesh")
    if not exp: raise RuntimeError("MPFB export body copy missing")
    # An unclothed base must retain EVERY body-surface polygon.
    # MPFB clothing "delete" MASK modifiers hide skin under clothes; baking
    # those modifiers permanently cut away body faces (pelvic opening seen
    # by the user). Bake the shape/clean helpers, NOT the clothing masks.
    ExportService.bake_modifiers_remove_helpers(exp,
        bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
    # Remove residual masks (rather than applying them) so the glTF exporter
    # cannot silently evaluate and omit skin from the crotch or torso.
    mask_names=[m.name for m in exp.modifiers if m.type=="MASK"]
    for modifier in list(exp.modifiers):
        if modifier.type=="MASK": exp.modifiers.remove(modifier)
    print("WVLRP_CAITLYN_DELETE_MASKS_REMOVED_NOT_BAKED",mask_names)
    if any(m.type=="MASK" for m in exp.modifiers):
        raise RuntimeError("Residual skin masking can create a pelvic hole")
    clean_skin_material(exp)
    polish_anatomical_shape(exp)
    check_and_repair_pelvic_surface(exp)
    # Keep the complete unclothed basemesh: no garments, body masking, or
    # mesh subtraction. The whole back/torso stays present during zoom.
    assert len(exp.data.vertices)>10000, "Incomplete human body"
    print("WVLRP_CAITLYN_UNCLOTHED_BODY",len(exp.data.vertices),len(exp.data.polygons))

    # Moderate MPFB firmness gives a softly gravity-shaped natural bust without
    # excessively pulled-down lower contours; all anatomy is continuous.
    # Build actual action clips for a single Mixamo-compatible armature.
    # Unlike Caitlyn's predecessor Amy, which exported only a tiny spine idle,
    # these are actual skeletal poses. They are separate NLA tracks in the GLB.
    children=list(ObjectService.get_list_of_children(export_root))
    rigs=[o for o in [export_root]+children if o.type=="ARMATURE"]
    if not rigs: raise RuntimeError("Caitlyn export copy has no armature")
    rig=rigs[0]
    print("WVLRP_RIG",rig.name,len(rig.data.bones))

    def normbone(name):
        return ''.join(c for c in name.lower() if c.isalnum()).replace("mixamorig","")
    by_norm={normbone(b.name):b for b in rig.pose.bones}
    def named(*names):
        for n in names:
            if n in by_norm: return by_norm[n]
        return None
    bones={
        "hips":named("hips","pelvis"),
        "spine":named("spine","spine1"),
        "chest":named("spine2","chest","upperchest"),
        "neck":named("neck"),
        "head":named("head"),
        "lthigh":named("leftupleg","leftthigh","lthigh"),
        "rthigh":named("rightupleg","rightthigh","rthigh"),
        "lshin":named("leftleg","leftshin","lshin"),
        "rshin":named("rightleg","rightshin","rshin"),
        "larm":named("leftarm","leftupperarm","lupperarm"),
        "rarm":named("rightarm","rightupperarm","rupperarm"),
        "lforearm":named("leftforearm","lforearm"),
        "rforearm":named("rightforearm","rforearm"),
    }
    print("WVLRP_CAITLYN_BONE_MAP",{k:v.name if v else None for k,v in bones.items()})
    required=("hips","spine","lthigh","rthigh","lshin","rshin","larm","rarm")
    missing=[k for k in required if bones[k] is None]
    if missing: raise RuntimeError("Caitlyn cannot pose missing body bones: "+str(missing))
    if len(rig.data.bones)<25: raise RuntimeError("Insufficient joint count for Caitlyn")

    def build_pose(name,keys):
        if not rig.animation_data: rig.animation_data_create()
        action=bpy.data.actions.new(name)
        rig.animation_data.action=action
        for frame,angles,hip_drop in keys:
            for pb in rig.pose.bones:
                pb.rotation_mode="XYZ"
                pb.rotation_euler=(0,0,0)
                pb.location=(0,0,0)
            bones["hips"].location.z=hip_drop
            for kind,axis,degrees in angles:
                pb=bones.get(kind)
                if pb is not None:
                    pb.rotation_euler[axis]=math.radians(degrees)
            for pb in rig.pose.bones:
                pb.keyframe_insert(data_path="rotation_euler",frame=frame,group=pb.name)
            bones["hips"].keyframe_insert(data_path="location",frame=frame,group=bones["hips"].name)
        track=rig.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(name,int(keys[0][0]),action)
        strip.action_frame_start=keys[0][0]
        strip.action_frame_end=keys[-1][0]
        strip.repeat=1
        print("WVLRP_CAITLYN_POSE_CLIP",name,len(keys))
    rest=(1,[],0.0)
    build_pose("Caitlyn Stand",[
        rest,(15,[("spine",0,1.1),("chest",0,.8),("head",2,1.0)],0.0),
        (30,[],0.0)])
    build_pose("Caitlyn Bend",[
        rest,(32,[("hips",0,36),("spine",0,23),("chest",0,12),
                  ("neck",0,-13),("head",0,-12),
                  ("larm",0,-17),("rarm",0,-17)],-.04)])
    build_pose("Caitlyn Kneel",[
        rest,(32,[("lthigh",0,-31),("rthigh",0,-31),
                  ("lshin",0,93),("rshin",0,93),
                  ("spine",0,5),("larm",0,-8),("rarm",0,-8)],-.29)])
    build_pose("Caitlyn HandsAndKnees",[
        rest,(42,[("hips",0,70),("spine",0,15),("chest",0,6),
                  ("lthigh",0,-75),("rthigh",0,-75),
                  ("lshin",0,98),("rshin",0,98),
                  ("larm",0,-75),("rarm",0,-75),
                  ("lforearm",0,6),("rforearm",0,6),
                  ("neck",0,-12),("head",0,7)],-.34)])
    rig.animation_data.action=None
    for pb in rig.pose.bones:
        pb.rotation_mode="XYZ";pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
    # NLA is how Blender's glTF exporter discovers separate named clips.
    bpy.context.scene.frame_set(1)

    bpy.ops.object.select_all(action="DESELECT")
    chosen=[export_root]+list(ObjectService.get_list_of_children(export_root))
    for obj in set(chosen): obj.select_set(True)
    bpy.context.view_layer.objects.active=rig
    OUT.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",
       use_selection=True,export_animations=True,export_nla_strips=True,
       export_materials="EXPORT")
    if not OUT.exists() or OUT.stat().st_size<100000:
        raise RuntimeError("GLB missing or unexpectedly small")
    # Structural verification: GLB includes body mesh, hair, skin + rig.
    # Print the actual exported material list (not just the source mesh)
    # so a future brown-hair shader regression is visible in build logs.
    import struct
    bs=OUT.read_bytes()
    n,kind=struct.unpack_from("<II",bs,12)
    meta=json.loads(bs[20:20+n].decode("utf-8"))
    print("WVLRP_CAITLYN_EXPORTED_MATERIALS",[(m.get("name","")) for m in meta.get("materials",[])])
    print("WVLRP_RESULT_GLB",OUT,OUT.stat().st_size,"skins",len(meta.get("skins",[])),
        "joint_count",len(meta.get("skins",[{}])[0].get("joints",[])),
        "animations",len(meta.get("animations",[])),"meshes",len(meta.get("meshes",[])))
    assert any("platinum ash blonde" in m.get("name","") for m in meta.get("materials",[])), "Caitlyn platinum hair material missing"
    assert len(meta.get("skins",[]))>=1, "No rigged skin in output"
    assert len(meta.get("animations",[]))>=4, "Caitlyn must include stand/bend/kneel/hands-and-knees clips"
    assert len(meta["skins"][0].get("joints",[]))>=25, "Skeleton too small"
    names=[n.get("name","") for n in meta.get("nodes",[])]
    assert any("Caitlyn" in n for n in names), "Caitlyn body naming missing"
    assert not any(("tank" in n.lower() or "shorts" in n.lower() or "dress" in n.lower()) for n in names), "Clothing accidentally exported"

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
        light((2,-3,4),610,4);light((-2,1,3),390,3)
        camdata=bpy.data.cameras.new("Preview ortho");cam=bpy.data.objects.new("Preview camera",camdata)
        bpy.context.collection.objects.link(cam)
        cam.location=(0,-4,1.35);cam.rotation_euler=(Vector((0,0,.85))-cam.location).to_track_quat("-Z","Y").to_euler()
        camdata.type="ORTHO";camdata.ortho_scale=2.35;bpy.context.scene.camera=cam
        world=bpy.data.worlds.new("Preview lighting");bpy.context.scene.world=world
        world.use_nodes=True;world.node_tree.nodes["Background"].inputs["Color"].default_value=(.7,.73,.75,1)
        world.node_tree.nodes["Background"].inputs["Strength"].default_value=.52
        scene=bpy.context.scene
        scene.render.engine="CYCLES";scene.cycles.samples=48
        scene.render.resolution_x=700;scene.render.resolution_y=950;scene.render.resolution_percentage=100
        scene.view_settings.view_transform="AgX"
        scene.view_settings.look="Medium High Contrast"
        scene.view_settings.exposure=-.18
        scene.render.image_settings.file_format="PNG";scene.render.filepath=str(PNG)
        bpy.ops.render.render(write_still=True)
        print("WVLRP_PREVIEW_SAVED",PNG,PNG.stat().st_size)
    except Exception:
        print("WVLRP_RENDER_WARNING",traceback.format_exc())
    print("WVLRP_CAITLYN_MPFB_SUCCESS")

if __name__=="__main__":main()
