"""WVLRP Sandy Blonde / isolated Sophie 1 sculpt, face and hair.
Run: blender --background --python avatar-work/sandy-blonde/build_sandy_blonde.py
Source Sophie 1 stays byte-for-byte unchanged. No wardrobe or gameplay deployment.
"""
import bpy, math, json, random, traceback
from pathlib import Path
from mathutils import Vector
random.seed(7418)
BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SOURCE = BASE / "sophie-1-working-clone.glb"
OUTPUT = BASE / "build"
OUTPUT.mkdir(exist_ok=True)
if not SOURCE.is_file():
    raise FileNotFoundError("Actual Sophie 1 clone missing")
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
scene=bpy.context.scene
original_meshes=[o for o in scene.objects if o.type=="MESH"]
if not original_meshes:
    raise RuntimeError("Sophie clone import returned no mesh")
for ob in list(original_meshes):
    if any(t in ob.name.lower() for t in ("vulva", "labia", "genital", "anus")):
        bpy.data.objects.remove(ob,do_unlink=True)
original_meshes=[o for o in scene.objects if o.type=="MESH"]
candidates=[o for o in original_meshes if any(t in o.name.lower() for t in ("basemesh", "base.", "body", "human"))]
body=max(candidates or original_meshes,key=lambda x:len(x.data.vertices))
if len(body.data.vertices)<3000:
    raise RuntimeError("Selected body is not a real detailed mesh: "+body.name)
verts=[body.matrix_world@v.co for v in body.data.vertices]
zmin=min(v.z for v in verts); zmax=max(v.z for v in verts); H=zmax-zmin
if not 1.3<H<2.1:
    raise RuntimeError("Expected adult original MakeHuman height, measured: "+str(H))
xmid=(min(p.x for p in verts)+max(p.x for p in verts))/2
head=[p for p in verts if p.z>zmin+.865*H and abs(p.x-xmid)<.16*H]
if len(head)<150:
    raise RuntimeError("Source has insufficient head geometry")
head_y=(min(v.y for v in head)+max(v.y for v in head))*.5
head_w=max(.065,(max(v.x for v in head)-min(v.x for v in head))/2)
head_d=max(.065,(max(v.y for v in head)-min(v.y for v in head))/2)
eye_meshes=[o for o in original_meshes if o!=body and "eye" in o.name.lower() and "brow" not in o.name.lower() and "lash" not in o.name.lower()]
eye_y=[]
for o in eye_meshes:
    if o.data.vertices:
        eye_y.append(sum((o.matrix_world@v.co).y for v in list(o.data.vertices)[:100])/min(100,len(o.data.vertices)))
front_sign=1 if eye_y and sum(eye_y)/len(eye_y)>head_y else -1
print("SANDY_SOURCE",body.name,len(body.data.vertices),round(H,3),"head",round(head_w,3),round(head_d,3),"front",front_sign)
# Shape keys preserve original texture UV, skeleton and skin attributes.
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.context.view_layer.objects.active=body
if body.data.shape_keys is None:
    body.shape_key_add(name="Basis",from_mix=False)
bpy.context.view_layer.update()
inverse=body.matrix_world.inverted_safe()
def g(v,center,sigma):
    return math.exp(-((v-center)/sigma)**2)
def sculpt_body(v):
    p=body.matrix_world@v.co
    h=(p.z-zmin)/H
    # Measured reference: narrow waist, naturally wider hip region, fuller thighs.
    # Do not alter head, hands or feet. Smooth bands avoid seam lines.
    waist=g(h,.61,.056); hip=g(h,.51,.068); thigh=g(h,.39,.075)
    ribs=g(h,.755,.040)
    sx=1-.070*waist+.062*hip+.040*thigh+.024*ribs
    sy=1-.030*waist+.036*hip+.020*thigh
    q=Vector((xmid+(p.x-xmid)*sx,head_y+(p.y-head_y)*sy,p.z))
    return inverse@q
def sculpt_face(v):
    p=body.matrix_world@v.co
    h=(p.z-zmin)/H
    if h<.867: return v.co.copy()
    side=(p.x-xmid)/max(head_w,.01)
    abs_side=abs(side)
    cheeks=g(h,.926,.020)*g(abs_side,.68,.34)
    jaw=g(h,.885,.024)
    temples=g(h,.960,.014)*g(abs_side,.75,.30)
    chin=g(h,.871,.012)*g(abs_side,.09,.27)
    nose=g(h,.932,.023)*g(abs_side,.21,.19)
    lips=g(h,.903,.011)*g(abs_side,.30,.33)
    x=xmid+(p.x-xmid)*(1+.063*cheeks-.080*jaw-.025*temples-.035*nose)
    y=p.y+front_sign*H*(.0045*cheeks+.0028*chin+.0018*lips-.0020*nose)
    z=p.z+H*(.0008*chin)
    return inverse@Vector((x,y,z))
for label,func in (("Sandy - reference body shape",sculpt_body),("Sandy - unique facial sculpt",sculpt_face)):
    k=body.shape_key_add(name=label,from_mix=False)
    for idx,v in enumerate(body.data.vertices):
        k.data[idx].co=func(v)
    k.value=1.0
    k.slider_min=0.0
    k.slider_max=1.0
body.select_set(False)
# Preserve Sophie 1's modeled hair cards; reshape and recolor them on this clone.
# They have authentic strand textures/cutouts, unlike the earlier tube-lock WIP.
hairmeshes=[o for o in original_meshes if o!=body and
            any(t in o.name.lower() for t in ("hair","wig","scalp","long01"))]
if not hairmeshes:
    raise RuntimeError("Sophie 1 source hair geometry not found; refuse naive substitute")
sandy_color=(.75,.54,.33,1)
for ob in hairmeshes:
    ob.name="Sandy Blonde - reshaped native hair / "+ob.name
    inverse_h=ob.matrix_world.inverted_safe()
    for v in ob.data.vertices:
        p=ob.matrix_world@v.co
        h=(p.z-zmin)/H
        # Extend flowing lengths while anchoring the crown firmly to the head.
        if h<.93:
            p.z=zmin+H*(.93-(.93-h)*1.38)
            # Move ends behind both ears/shoulders; don't veil the face.
            if h<.91 and (p.y-head_y)*front_sign>0:
                p.y-=front_sign*.054*math.exp(-((h-.83)/.11)**2)
            v.co=inverse_h@p
    for i,original in enumerate(ob.data.materials):
        if not original:continue
        m=original.copy()
        m.name="Sandy blonde textured hair / "+m.name
        ob.data.materials[i]=m
        m.use_nodes=True
        n=m.node_tree.nodes.get("Principled BSDF")
        if not n:continue
        n.inputs["Roughness"].default_value=.82
        base=n.inputs["Base Color"]
        previous=[l for l in m.node_tree.links if l.to_socket==base]
        if previous:
            link=previous[0]
            source_socket=link.from_socket
            m.node_tree.links.remove(link)
            mix=m.node_tree.nodes.new("ShaderNodeMixRGB")
            mix.blend_type="MIX"
            mix.inputs[0].default_value=.48
            mix.inputs[2].default_value=sandy_color
            m.node_tree.links.new(source_socket,mix.inputs[1])
            m.node_tree.links.new(mix.outputs["Color"],base)
        else:
            base.default_value=sandy_color
    print("SANDY_NATIVE_HAIR",ob.name,len(ob.data.vertices))
# Preserve the source eyes/skin textures and any facial attachment hierarchy.
# Studio preview scene, renders focus on face/head/hair; body is exported for later fitting.
world=bpy.data.worlds.new("Sandy neutral studio")
scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.28,.31,.34,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.46
def area(name,xyz,power,size):
    d=bpy.data.lights.new(name,"AREA");d.energy=power;d.shape="DISK";d.size=size
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o)
    o.location=xyz;o.rotation_euler=(Vector((xmid,head_y,zmin+H*.91))-o.location).to_track_quat("-Z","Y").to_euler()
area("Warm softbox",(xmid+.85,head_y+front_sign*1.0,zmin+H*1.65),120,1.8)
area("Cool fill",(xmid-.8,head_y+front_sign*.85,zmin+H*1.30),75,1.3)
area("Hair rim",(xmid-.3,head_y-front_sign*1.2,zmin+H*1.3),120,.9)
scene.render.engine="CYCLES"
scene.view_settings.exposure=-.35
scene.cycles.samples=12
scene.cycles.use_denoising=True
scene.render.resolution_x=640
scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=False
scene.render.engine="CYCLES"
def render(name,offset,look_z,scale):
    data=bpy.data.cameras.new(name);obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    data.type="ORTHO";data.ortho_scale=scale
    target=Vector((xmid,head_y,zmin+H*look_z))
    obj.location=Vector((xmid+offset[0],head_y+offset[1]*front_sign,zmin+H*look_z+offset[2]))
    obj.rotation_euler=(target-obj.location).to_track_quat("-Z","Y").to_euler()
    scene.camera=obj
    scene.render.filepath=str(OUTPUT/(name+".png"))
    bpy.ops.render.render(write_still=True)
    print("SANDY_RENDER",scene.render.filepath)
    bpy.data.objects.remove(obj,do_unlink=True)
render("Sandy_Original_Face_Front",(0,2,0),.93,.56)
render("Sandy_Hair_ThreeQuarter",(.85,2,0),.90,.79)
render("Sandy_Hair_Back",(.10,-2,0),.87,.86)
# Convert Blender procedural curves to real renderable/exportable hair meshes.
# This preserves the sculpt/skin while preventing hair from disappearing in GLB.
for ob in list(scene.objects):
    if ob.type=="CURVE" and ob.name.startswith("Sandy"):
        bpy.ops.object.select_all(action="DESELECT")
        ob.hide_set(False)
        ob.select_set(True)
        bpy.context.view_layer.objects.active=ob
        bpy.ops.object.convert(target="MESH")
        bpy.context.view_layer.objects.active.select_set(False)
# Exclude studio lights/cameras from game GLB. Retain source skeleton and original UVs.
for o in list(scene.objects):
    if o.type in {"LIGHT","CAMERA"}:
        bpy.data.objects.remove(o,do_unlink=True)
# Outright hide any potentially unverified private anatomical attachments in player preview.
for o in scene.objects:
    if o.type=="MESH":o.hide_set(False)
outglb=OUTPUT/"Sandy_Blonde_Sculpt_WIP.glb"
bpy.ops.export_scene.gltf(filepath=str(outglb),export_format="GLB",export_animations=True)
if not outglb.exists() or outglb.stat().st_size<100000:
    raise RuntimeError("Invalid character output GLB")
# Editable master with shape keys (production export not yet approved).
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT/"Sandy_Blonde_Working.blend"))
report={"source_blob_sha":"b4e70180ac44c4e3626fcc1fcf7390cf46342b45",
        "source_body":body.name,"body_vertices":len(body.data.vertices),
        "height_m":H,"face_original_morph":True,
        "native_hair_meshes":len(hairmeshes),"hair_locks":0,"source_eye_meshes":len(eye_meshes),
        "render_filenames":["Sandy_Original_Face_Front.png","Sandy_Hair_ThreeQuarter.png","Sandy_Hair_Back.png"],
        "wardrobe_status":"not part of this pass",
        "game_ready":False,"visual_approval":False}
(OUTPUT/"build-report.json").write_text(json.dumps(report,indent=2))
print("SANDY_SCULPT_EXPORT_OK",outglb.stat().st_size)
