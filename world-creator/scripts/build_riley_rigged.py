"""WVLRP Riley v1: replacement mesh + true skeleton + basic pose animations.
Reference intent: approved front/left-profile/back turnarounds, neutral base outfit.
Images guide proportions, not automatic 3D reconstruction. Do NOT reuse the
previous recoloured casual-suit shell or destructive vertex pose warping.
Target: Blender 3.x/4.x; exports rigged GLB for Babylon.js.
"""
import bpy, bmesh, math, random, json
from mathutils import Vector, Matrix
from math import sin, cos, pi
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"assets"/"riley-real.glb"
OUT=ROOT/"assets"/"riley-rigged-v1.glb"
M=json.loads((ROOT/"riley-measurements.json").read_text())
H=M["height_cm"]/100.0
assert H==1.70, "Update rig joint positions when changing character height"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
source_meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
assert source_meshes, "Need original licensed CC0 head to preserve Riley's face"
source_bounds=[o.matrix_world @ Vector(c) for o in source_meshes for c in o.bound_box]
mins=[min(v[i] for v in source_bounds) for i in range(3)]
maxs=[max(v[i] for v in source_bounds) for i in range(3)]
height=maxs[2]-mins[2]
assert .9<height<20, "Original source bounds invalid"
scale=H/height
cx=(mins[0]+maxs[0])/2
cy=(mins[1]+maxs[1])/2
eye_pts=[o.matrix_world @ v.co for o in source_meshes
         if o.name.lower().startswith(("eyebrow","eyelashes"))
         for v in o.data.vertices]
eye_source=sum(p.z for p in eye_pts)/len(eye_pts) if eye_pts else mins[2]+height*.88
eye_z=(eye_source-mins[2])*scale
head_cut=eye_z-.13*H
original_head=[]
for obj in list(source_meshes):
    name=obj.name.lower()
    # Preserve facial mesh and real eyes/brows/lashes; replace every old body
    # and clothing polygon below the neck, including the bad crotch/seat seams.
    keep=(name in ("low-poly",) or "anatomical body" in name or
          name.startswith(("eyebrow","eyelashes","teeth")))
    if not keep:
        bpy.data.objects.remove(obj,do_unlink=True)
        continue
    evaluated=obj.matrix_world.copy()
    obj.parent=None
    obj.matrix_world=Matrix.Identity(4)
    for v in obj.data.vertices:
        p=evaluated @ v.co
        v.co=((p.x-cx)*scale,(p.y-cy)*scale,(p.z-mins[2])*scale)
    if name in ("low-poly",) or "anatomical body" in name:
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z<head_cut],context="VERTS")
        bm.to_mesh(obj.data);bm.free()
    if len(obj.data.vertices)<3:
        bpy.data.objects.remove(obj,do_unlink=True)
    else:
        original_head.append(obj)
assert original_head, "Original face could not be retained"

def skinmat(name, rgba, rough=.71, metallic=0):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    bs=mat.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(*rgba,1)
    bs.inputs["Roughness"].default_value=rough
    bs.inputs["Metallic"].default_value=metallic
    mat.diffuse_color=(*rgba,1)
    return mat
skin=skinmat("Riley natural warm skin tone",(.79,.58,.48),.79)
base=skinmat("Riley seamless opaque taupe base layer",(.56,.49,.46),.89)
hair_colors=[
 skinmat("Riley sandy blonde roots",(.46,.32,.19),.87),
 skinmat("Riley honey-blonde",(.75,.57,.35),.73),
 skinmat("Riley champagne strands",(.88,.73,.52),.65),
 skinmat("Riley ash-gold shadows",(.61,.47,.30),.79)
]

parts=[]
def sphere(name,xyz,radii,mat,segments=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=16,location=xyz)
    o=bpy.context.object;o.name=name
    o.scale=radii
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    for f in o.data.polygons:f.use_smooth=True
    parts.append(o)
    return o
def tube(name, rings, material, steps=36):
    # Ordered ascending height; ellipse cross sections in XY.
    verts=[];faces=[]
    for z,rx,ry,yshift in rings:
        for j in range(steps):
            t=2*pi*j/steps
            verts.append((rx*cos(t), yshift+ry*sin(t),z))
    for r in range(len(rings)-1):
        for j in range(steps):
            a=r*steps+j;b=r*steps+(j+1)%steps
            c=(r+1)*steps+(j+1)%steps;d=(r+1)*steps+j
            faces.append((a,b,c,d))
    faces.extend([tuple(reversed(tuple(range(steps)))),
                  tuple((len(rings)-1)*steps+j for j in range(steps))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
    mesh.materials.append(material)
    for f in mesh.polygons:f.use_smooth=True
    parts.append(ob)
    return ob
def link_ellipsoid(name, a, b, radius_xy, mat):
    mid=(Vector(a)+Vector(b))/2
    vec=Vector(b)-Vector(a)
    length=vec.length
    ob=sphere(name,mid,(radius_xy[0],radius_xy[1],length*.68),mat)
    # align elongated local Z to a->b
    ob.rotation_mode="QUATERNION"
    ob.rotation_quaternion=Vector((0,0,1)).rotation_difference(vec.normalized())
    return ob

# Shape is a fresh continuous anatomical surface, not skinned trousers.
tube("Riley fitted body silhouette",[
 (.83,.106,.090,.000),(.89,.165,.112,.006),(.97,.187,.128,.005),
 (1.045,.157,.111,.008),(1.11,.139,.088,.011),
 (1.18,.160,.110,.013),(1.28,.183,.119,.014),
 (1.35,.192,.120,.009),(1.405,.175,.098,.005),
 (1.47,.065,.059,.001),(1.525,.058,.055,.000)
],skin)
for side in (-1,1):
    sphere("Riley natural chest contour",(.094*side,-.095,1.308),(.112,.098,.116),skin)
    sphere("Riley rounded hip",(.116*side,.016,.938),(.103,.126,.140),skin)
    # Anatomically continuous knees/thighs/calf surface after union-remesh.
    link_ellipsoid("Riley upper leg",(.114*side,.010,.870),(.120*side,.002,.505),(.102,.108),skin)
    sphere("Riley knee",(.122*side,-.018,.515),(.071,.070,.075),skin)
    link_ellipsoid("Riley calf",(.123*side,.029,.476),(.119*side,.018,.155),(.073,.082),skin)
    sphere("Riley ankle",(.119*side,.014,.137),(.046,.047,.080),skin)
    sphere("Riley natural foot",(.118*side,-.074,.064),(.066,.144,.047),skin)
    for f in range(5):
        sphere("Riley toes",(.118*side+side*(f-2)*.019,-.184+.009*abs(f-1),.035),
               (.012,.037-.003*abs(f-1),.017),skin,16)
    link_ellipsoid("Riley upper arm",(.225*side,-.001,1.401),(.264*side,-.012,1.139),(.068,.069),skin)
    sphere("Riley elbow",(.267*side,-.018,1.132),(.050,.051,.054),skin)
    link_ellipsoid("Riley forearm",(.266*side,-.021,1.114),(.285*side,-.058,.904),(.051,.051),skin)
    sphere("Riley palm",(.284*side,-.063,.861),(.052,.026,.086),skin,20)
    for f in range(4):
        sphere("Riley fingers",((.258+.017*f)*side,-.071,.771+.007*abs(f-1)),
               (.010,.012,.064-.007*abs(f-1)),skin,16)
    sphere("Riley thumb",(.238*side,-.088,.833),(.021,.024,.052),skin,16)
sphere("Riley neck", (0,0,1.493),(.062,.060,.099),skin)

# Fuse overlapping geometry into one smooth skin mesh. No separately recolored
# trouser crotch, rear pocket, jacket hem, or leggings seams can remain.
bpy.ops.object.select_all(action="DESELECT")
for obj in parts:obj.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.join()
body=bpy.context.object;body.name="Riley continuous body | rigged"
body.data.remesh_voxel_size=.012
bpy.ops.object.voxel_remesh()
# Subtle smoothing, avoid damaging stable silhouette at hips and joints.
mod=body.modifiers.new("Smooth joined body surface","SMOOTH");mod.factor=1.18;mod.iterations=6
bpy.context.view_layer.objects.active=body
bpy.ops.object.modifier_apply(modifier=mod.name)
for f in body.data.polygons:f.use_smooth=True

# Keep base garment a flat, opaque MATERIAL, NOT a separate protruding mesh.
# The underlying skin surface remains usable for jeans/dresses and outfit swaps.
# Zone by heights: tank, high-waisted seamless boyshorts.
body.data.materials.clear()
body.data.materials.append(skin);body.data.materials.append(base)
for poly in body.data.polygons:
    p=poly.center
    tank=1.14<=p.z<=1.422 and abs(p.x)<(.178 if p.z<1.37 else .15)
    shorts=(.855<=p.z<=1.006 and abs(p.x)<.23)
    poly.material_index=1 if (tank or shorts) else 0

# Real wavy layered blonde scalp + transparent-free curved lock strips.
# Hair is scalp-rooted (not floating bun or static pasted photograph).
random.seed(4141)
hair_meshes=[]
def hmesh(name,verts,faces,mat):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
    me.materials.append(mat)
    for f in me.polygons:f.use_smooth=True
    hair_meshes.append(ob)
    return ob
head_top=max((v.co.z for o in original_head for v in o.data.vertices
              if (o.name.lower()=="low-poly" or "anatomical body" in o.name.lower())),default=1.70)
cap_z=min(H*.985,head_top-.047)
sphere_cap=sphere("Riley blonde scalp cap",(0,.012,cap_z),(.099,.093,.081),hair_colors[0],32)
hair_meshes.append(sphere_cap)
for layer in range(4):
    for i in range(26):
        angle=2*pi*(i+.3*layer)/26
        # Root is along outer scalp circumference with realistic radial spread.
        x=.080*cos(angle);y=.013+.067*sin(angle)
        is_front=y<-.027
        if is_front and abs(x)<.043:continue
        root=Vector((x,y,cap_z+.018))
        length=random.uniform(.25,.39) if not is_front else random.uniform(.20,.33)
        verts=[];faces=[];sides=5;n=20
        for j in range(n):
            t=j/(n-1)
            center=root+Vector((.016*math.cos(angle)*t+.011*sin(t*pi*2+angle)*t,
                                .033*math.sin(angle)*t+.009*cos(t*pi*3+angle)*t,
                                -length*t))
            radius=(.0055+layer*.0008)*max(.08,(1-t)**.8)
            for k in range(sides):
                v=2*pi*k/sides
                verts.append(tuple(center+Vector((radius*cos(v),radius*.44*sin(v),0))))
            if j:
                a=(j-1)*sides;b=j*sides
                for k in range(sides):
                    kn=(k+1)%sides
                    faces.append((a+k,a+kn,b+kn,b+k))
        hmesh("Riley rooted soft blonde hair",verts,faces,hair_colors[(i+layer)%4])

# Join hair into single mesh; it is parented to head bone, not torso or rig root.
bpy.ops.object.select_all(action="DESELECT")
for o in hair_meshes:o.select_set(True)
bpy.context.view_layer.objects.active=hair_meshes[0]
bpy.ops.object.join()
hair=bpy.context.object;hair.name="Riley scalp-attached blonde hair"
head_pieces=[o for o in original_head if o.type=="MESH"]

# Real armature, not parent-only rotation.
arm_data=bpy.data.armatures.new("Riley human skeleton")
arm=bpy.data.objects.new("Riley | Rigged Armature",arm_data)
bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm;arm.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
def bone(name,head,tail,parent=None,connect=False):
    b=arm_data.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:
        b.parent=arm_data.edit_bones[parent];b.use_connect=connect
    return b
bone("Hips",(0,0,.93),(0,0,1.035))
bone("Spine",(0,0,1.035),(0,0,1.19),"Hips")
bone("Chest",(0,0,1.19),(0,0,1.40),"Spine")
bone("Neck",(0,0,1.40),(0,0,1.51),"Chest")
bone("Head",(0,0,1.51),(0,0,1.68),"Neck")
for name,side in (("L",1),("R",-1)):
    bone(name+"Shoulder",(0,0,1.391),(.207*side,0,1.398),"Chest")
    bone(name+"UpperArm",(.207*side,0,1.398),(.265*side,-.01,1.135),name+"Shoulder")
    bone(name+"Forearm",(.265*side,-.01,1.135),(.285*side,-.050,.898),name+"UpperArm")
    bone(name+"Hand",(.285*side,-.050,.898),(.286*side,-.069,.795),name+"Forearm")
    for i in range(4):
        bone(name+"Finger"+str(i),((.258+.017*i)*side,-.065,.797),
             ((.258+.017*i)*side,-.067,.733),name+"Hand")
    bone(name+"Thigh",(.11*side,0,.94),(.12*side,-.012,.506),"Hips")
    bone(name+"Shin",(.12*side,-.012,.506),(.12*side,0,.132),name+"Thigh")
    bone(name+"Foot",(.12*side,0,.132),(.12*side,-.121,.070),name+"Shin")
    bone(name+"Toe",(.12*side,-.121,.070),(.12*side,-.203,.045),name+"Foot")
bpy.ops.object.mode_set(mode="OBJECT")
bones={b.name:(b.head_local.copy(),b.tail_local.copy()) for b in arm.data.bones}
def clamp(t):return max(0.0,min(1.0,t))
def smooth(t):
    t=clamp(t);return t*t*(3-2*t)
def segment_weight(p,nam):
    a,b=bones[nam];vec=b-a
    t=clamp((p-a).dot(vec)/max(vec.length_squared,1e-8))
    nearest=a+t*vec
    d=(p-nearest).length
    return 1/(.025+d*d)
def bind(ob,kind):
    if not len(ob.data.vertices):return
    groups={k:ob.vertex_groups.new(name=k) for k in bones}
    for v in ob.data.vertices:
        p=v.co
        if kind in ("head","hair"):
            # Hair/face follows the head bone, so it can't detach during poses.
            weights={"Head":1.0}
        else:
            z=p.z;x=p.x;side="L" if x>=0 else "R"
            ax=abs(x)
            wleg=1-smooth((z-.84)/.19)
            warm=smooth((ax-.177)/.104)*smooth((z-1.02)/.12)
            warm*=1-smooth((z-1.43)/.06)
            wcore=max(0,1-max(wleg,warm))
            weights={}
            if wleg>.001:
                leg=[side+"Thigh",side+"Shin",side+"Foot",side+"Toe"]
                vals=[segment_weight(p,n) for n in leg]
                s=sum(vals)
                for n,vv in zip(leg,vals):weights[n]=vv*wleg/s
            if warm>.001:
                upper=[side+"Shoulder",side+"UpperArm",side+"Forearm",side+"Hand"]
                vals=[segment_weight(p,n) for n in upper]
                s=sum(vals)
                for n,vv in zip(upper,vals):weights[n]=weights.get(n,0)+vv*warm/s
            if wcore>.001:
                spine=["Hips","Spine","Chest","Neck"]
                vals=[segment_weight(p,n) for n in spine]
                s=sum(vals)
                for n,vv in zip(spine,vals):weights[n]=weights.get(n,0)+vv*wcore/s
        total=sum(weights.values())
        if total<=0:weights={"Hips":1};total=1
        best=sorted(weights.items(),key=lambda kv:kv[1],reverse=True)[:4]
        norm=sum(vv for _,vv in best)
        for n,vv in best:
            if vv>0:groups[n].add([v.index],vv/norm,"REPLACE")
    mod=ob.modifiers.new("Riley skeletal skinning","ARMATURE")
    mod.object=arm;ob.parent=arm
bind(body,"body")
bind(hair,"hair")
for obj in head_pieces:bind(obj,"head")

# Put animations on the one rig. Each pose is an action/NLA strip, so the game
# can play armature bones instead of loading a separate mutilated body mesh.
arm.animation_data_create()
def action(name,keys):
    ac=bpy.data.actions.new(name)
    arm.animation_data.action=ac
    for frame,angles in keys:
        for p in arm.pose.bones:
            p.rotation_mode="XYZ";p.rotation_euler=(0,0,0)
        for name,axis,val in angles:
            if name in arm.pose.bones:arm.pose.bones[name].rotation_euler[axis]=math.radians(val)
        for p in arm.pose.bones:p.keyframe_insert(data_path="rotation_euler",frame=frame,group=p.name)
    tr=arm.animation_data.nla_tracks.new();tr.name=name
    st=tr.strips.new(name,int(keys[0][0]),ac)
    st.action_frame_start=keys[0][0];st.action_frame_end=keys[-1][0]
    st.repeat=1
    return ac
action("Riley Idle",[(1,[]),(15,[("Chest",0,1.0),("Head",2,1.0)]),(30,[])])
action("Riley Walk",[(1,[("LThigh",0,20),("RThigh",0,-20),("LUpperArm",0,-10),("RUpperArm",0,10)]),
                     (13,[("LThigh",0,-20),("RThigh",0,20),("LUpperArm",0,10),("RUpperArm",0,-10)]),
                     (25,[("LThigh",0,20),("RThigh",0,-20),("LUpperArm",0,-10),("RUpperArm",0,10)])])
action("Riley Kneel",[(1,[]),(24,[("LThigh",0,-46),("RThigh",0,-46),
                               ("LShin",0,93),("RShin",0,93),
                               ("Chest",0,8),("LUpperArm",0,-9),("RUpperArm",0,-9)])])
action("Riley HandsAndKnees",[(1,[]),(32,[("Hips",0,58),("Spine",0,27),
                               ("LThigh",0,-91),("RThigh",0,-91),
                               ("LShin",0,92),("RShin",0,92),
                               ("LUpperArm",0,79),("RUpperArm",0,79),
                               ("LForearm",0,-23),("RForearm",0,-23),
                               ("Neck",0,-25)])])
arm.animation_data.action=None
for pb in arm.pose.bones:
    pb.rotation_mode="XYZ";pb.rotation_euler=(0,0,0)
# Mute NLA for rest-pose export; glTF still includes named animation strips.
for track in arm.animation_data.nla_tracks:track.mute=False
bpy.context.scene.frame_set(1)

OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",
    export_apply=False,export_materials="EXPORT",
    export_animations=True,export_nla_strips=True,
    export_image_format="AUTO",use_selection=False)
assert OUT.is_file() and OUT.stat().st_size>80000
print("RILEY_RIG_SUCCESS",OUT,OUT.stat().st_size,
      "bones",len(arm.data.bones),
      "body_vertices",len(body.data.vertices),"facial_parts",len(head_pieces),
      "height_cm",M["height_cm"],"bust_cm",M["bust_circumference_cm"],
      "waist_cm",M["waist_circumference_cm"],"hip_cm",M["full_hip_circumference_cm"])
