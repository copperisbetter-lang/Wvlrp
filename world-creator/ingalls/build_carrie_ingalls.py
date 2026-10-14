"""Carrie Ingalls Season 3 prototype built on a real MakeHuman/MPFB child.
No primitive blob body, Jenny mesh reuse, or simulated photographic skin.
The fitted outfit is a custom child's calico dress inspired by the reference era.
Third-party MakeHuman clothes are staged as candidates and never silently
inserted without a child fit check.
"""
import bpy
import json
import math
import struct
from pathlib import Path
from mathutils import Vector
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import build_young_explorer_real as shared
from bl_ext.wvlrp_local.mpfb.services.humanservice import HumanService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.assetservice import AssetService
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService
from bl_ext.wvlrp_local.mpfb.entities.objectproperties import HumanObjectProperties

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "carrie-ingalls-s3.glb"
PREVIEW = ROOT / "assets" / "carrie-ingalls-s3-preview.png"

def pale_calico():
    image = bpy.data.images.new("Carrie faded small floral calico", width=256, height=256, alpha=True)
    pixels = []
    for y in range(256):
        for x in range(256):
            xx = x % 34 - 17
            yy = y % 34 - 17
            d = xx*xx + yy*yy
            # Fine cream floral, not photographically inaccurate block plaid.
            if d < 7:
                c = (.61, .33, .31, 1)
            elif d < 21:
                c = (.84, .76, .69, 1)
            else:
                c = (.52, .58, .62, 1)
            pixels.extend(c)
    image.pixels.foreach_set(pixels)
    image.file_format = "PNG"
    image.pack()
    mat = shared.material("Carrie woven faded floral calico fabric", (.57, .62, .68), .93)
    node = mat.node_tree.nodes.new("ShaderNodeTexImage")
    node.image = image
    mat.node_tree.links.new(node.outputs["Color"], mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
    mat.use_backface_culling = False
    return mat

def outfit_fit(body, rig, root):
    # Create a body-measured, weighted dress, then make it a longer pinafore.
    dress = shared.make_dress(body, rig, root)
    dress.name = "Carrie child-fitted calico pinafore (rigged)"
    cloth = pale_calico()
    dress.data.materials[0] = cloth
    vertices = [body.matrix_world @ v.co for v in body.data.vertices]
    low = min(v.z for v in vertices)
    height = max(v.z for v in vertices) - low
    center_x = (min(v.x for v in vertices) + max(v.x for v in vertices)) * .5
    for vertex in dress.data.vertices:
        zpart = (vertex.co.z - low) / height
        if zpart < .61:
            taper = max(0., min(1., (.61-zpart)/(.61-.405)))
            vertex.co.z -= .17 * height * taper
            vertex.co.x = center_x + (vertex.co.x-center_x) * (1. + .07*taper)
            vertex.co.y *= (1. + .04*taper)
    dress.data.update()
    # Each sleeve section is skinned to its *own* corresponding arm bone:
    # it does not float independently in the viewer or copy Jenny's clothes.
    cotton = shared.material("Carrie off-white long sleeve blouse", (.83, .78, .70), .96)
    for side in ("left", "right"):
        for piece in ("arm", "forearm"):
            match = next((b for b in rig.data.bones
                          if shared.normalized(b.name) == side + piece), None)
            if match is None:
                raise RuntimeError("Carrie missing sleeve bone: " + side + piece)
            start = match.head_local
            end = match.tail_local
            vec = end-start
            if vec.length < .045:
                raise RuntimeError("Carrie sleeve bone degenerate: " + match.name)
            midpoint = (start+end) * .5
            bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=.041*height,
                       radius2=.048*height, depth=vec.length*.96, location=midpoint)
            sleeve = bpy.context.object
            sleeve.name = "Carrie " + side + " " + piece + " cotton sleeve"
            sleeve.rotation_euler = vec.to_track_quat("Z","Y").to_euler()
            sleeve.data.materials.append(cotton)
            sleeve.vertex_groups.new(name=match.name).add(
                list(range(len(sleeve.data.vertices))), 1.0, "REPLACE")
            sleeve.modifiers.new("Follow Carrie armature", "ARMATURE").object = rig
            old = sleeve.matrix_world.copy()
            sleeve.parent = root
            sleeve.matrix_world = old
    # A woven apron panel, attached to the dress with the same pelvis weights.
    apron = shared.material("Carrie small cream cotton apron", (.86, .83, .75), .96)
    front = min(v.y for v in vertices if .48 < (v.z-low)/height < .63)
    ztop = low + .61*height
    zbottom = low + .27*height
    mesh = bpy.data.meshes.new("Carrie fitted apron mesh")
    verts = []
    faces = []
    for i, z in enumerate([ztop, zbottom]):
        for j in range(13):
            t = j/12
            x = center_x + (t-.5)*.29*height*(1.0 if i == 0 else 1.35)
            y = front - .034*height + .035*height*((2*t-1)**2)
            verts.append((x,y,z))
    for j in range(12):
        faces.append((j,j+1,14+j,13+j))
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(apron)
    mesh.update()
    ap = bpy.data.objects.new("Carrie child-size weighted pinafore apron",mesh)
    bpy.context.collection.objects.link(ap)
    hip = shared.get_bone(rig, "hips", "pelvis")
    if hip is None:
        raise RuntimeError("Carrie apron hip bone missing")
    ap.vertex_groups.new(name=hip).add(list(range(len(verts))), 1, "REPLACE")
    ap.modifiers.new("Follow Carrie armature", "ARMATURE").object=rig
    old=ap.matrix_world.copy()
    ap.parent=root
    ap.matrix_world=old
    return dress

def save_preview(body):
    pts = [body.matrix_world @ v.co for v in body.data.vertices]
    lo=min(p.z for p in pts)
    h=max(p.z for p in pts)-lo
    cx=(min(p.x for p in pts)+max(p.x for p in pts))*.5
    cy=(min(p.y for p in pts)+max(p.y for p in pts))*.5
    point=Vector((cx,cy,lo+h*.52))
    bpy.ops.object.camera_add(location=(cx,cy-2.8*h,lo+.58*h))
    camera=bpy.context.object
    camera.rotation_euler=(point-camera.location).to_track_quat("-Z","Y").to_euler()
    camera.data.type="ORTHO"
    camera.data.ortho_scale=h*1.5
    bpy.context.scene.camera=camera
    bpy.ops.object.light_add(type="AREA", location=(cx-h,cy-h,lo+2*h))
    bpy.context.object.data.energy=850
    bpy.context.object.data.shape="DISK"
    bpy.context.object.data.size=3
    scene=bpy.context.scene
    scene.render.engine="CYCLES"
    scene.cycles.samples=12
    scene.render.resolution_x=600
    scene.render.resolution_y=900
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.filepath=str(PREVIEW)
    bpy.ops.render.render(write_still=True)
    print("WVLRP_CARRIE_PREVIEW",str(PREVIEW),PREVIEW.stat().st_size,flush=True)

def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    shared.load_assets()
    human=HumanService.create_human()
    human.name="Carrie Ingalls age-five unique photographic human"
    # Season 3: small child. Adult MakeHuman avatars are NOT resized into her.
    for key,value in (("gender",0.),("age",.0833333333),("weight",.45),
                      ("muscle",.35),("height",.47),("proportions",.47),
                      ("cupsize",0.),("firmness",.5)):
        HumanObjectProperties.set_value(key,value,entity_reference=human)
    TargetService.reapply_macro_details(human)
    skin=AssetService.find_asset_absolute_path(
        "young_caucasian_female.mhmat",asset_subdir="skins")
    if not skin:
        raise RuntimeError("Missing real MakeHuman CC0 photographic skin")
    HumanService.set_character_skin(skin,human,skin_type="GAMEENGINE")
    if HumanService.add_builtin_rig(human,"mixamo") is None:
        raise RuntimeError("Carrie skeleton was not built")
    for category,choices,kind in (
        ("eyes",["high-poly.mhclo","low-poly.mhclo"],"Eyes"),
        ("eyebrows",["eyebrow001.mhclo"],"Eyebrows"),
        ("eyelashes",["eyelashes01.mhclo"],"Eyelashes")):
        shared.add_asset(human,category,choices,kind)
    hair=shared.add_asset(human,"hair",["bob01.mhclo","bob02.mhclo"],"Hair")
    if not hair:
        raise RuntimeError("No genuine hair mesh for Carrie")
    shared.tint_hair(hair)
    for ma in hair.data.materials:
        if not ma or not ma.use_nodes:continue
        for n in ma.node_tree.nodes:
            if n.type=="BSDF_PRINCIPLED":
                n.inputs["Base Color"].default_value=(.45,.30,.17,1)
    root=ExportService.create_character_copy(human,name_suffix="_carrie_only")
    relatives=[root]+list(ObjectService.get_list_of_children(root))
    body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,"Basemesh")
    if body is None:raise RuntimeError("Carrie real continuous body missing")
    ExportService.bake_modifiers_remove_helpers(body,bake_masks=False,
            bake_subdiv=False,remove_helpers=True,also_proxy=True)
    for m in list(body.modifiers):
        if m.type=="MASK":body.modifiers.remove(m)
    if len(body.data.vertices)<10000 or not body.data.uv_layers:
        raise RuntimeError("Carrie missing high resolution textured human basemesh")
    shared.preserve_photo_skin(body,"Carrie Ingalls")
    rig=next((o for o in relatives if o.type=="ARMATURE"),None)
    if not rig:raise RuntimeError("Carrie unique humanoid rig missing")
    outfit_fit(body,rig,root)
    shared.make_clips(rig)
    bpy.context.view_layer.update()
    points=[body.matrix_world @ v.co for v in body.data.vertices]
    original=max(p.z for p in points)-min(p.z for p in points)
    root.scale=tuple(v*1.08/original for v in root.scale)
    bpy.context.view_layer.update()
    points=[body.matrix_world @ v.co for v in body.data.vertices]
    measured=max(p.z for p in points)-min(p.z for p in points)
    if not 1.05 < measured < 1.11:raise RuntimeError("Carrie child height wrong")
    selected=[root]+list(root.children_recursive)
    bpy.ops.object.select_all(action="DESELECT")
    for o in set(selected):o.select_set(True)
    bpy.context.view_layer.objects.active=rig
    OUT.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",
           use_selection=True,export_animations=True,export_nla_strips=True,
           export_materials="EXPORT",export_yup=True)
    raw=OUT.read_bytes()
    assert raw[:4]==b"glTF" and struct.unpack_from("<I",raw,8)[0]==len(raw)
    length,kind=struct.unpack_from("<II",raw,12)
    meta=json.loads(raw[20:20+length])
    shared.verify_photo_skin_glb(meta,"Carrie Ingalls")
    if len(meta.get("skins",[]))!=1:
        raise RuntimeError("Carrie must use her own rigged body")
    joint_count=len(meta["skins"][0]["joints"])
    if joint_count<50:
        raise RuntimeError("Incomplete humanoid rig: " + str(joint_count))
    if len(meta.get("animations",[]))<5:
        raise RuntimeError("Carrie motion clips missing")
    if not any("Carrie woven faded floral" in m.get("name","")
               for m in meta.get("materials",[])):
        raise RuntimeError("Carrie calico cloth missing from export")
    print("WVLRP_CARRIE_GLB_BUILT",
          "bytes",len(raw),"real_body_vertices",len(body.data.vertices),
          "height",round(measured,3),"joints",joint_count,
          "clips",[a["name"] for a in meta["animations"]],flush=True)
    # A photographed-looking skin is NOT an actor-accurate facial likeness.
    # Visual approval, and full 56-functional-joint compliance, remain gates.
    try:
        save_preview(body)
    except Exception as error:
        print("WVLRP_CARRIE_PREVIEW_BLOCKER",repr(error),flush=True)

if __name__=="__main__":
    main()
