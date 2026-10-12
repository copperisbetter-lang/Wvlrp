"""Sav: first independent 56-bone rigged Blender prototype. Not final sculpt."""
import bpy, math
from pathlib import Path
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
out=Path("world-creator/assets/sav-prototype.glb")
out.parent.mkdir(parents=True,exist_ok=True)
def mat(name,rgb):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=(*rgb,1)
 p.inputs["Metallic"].default_value=0;p.inputs["Roughness"].default_value=.83
 return m
skin=mat("warm skin",(.57,.35,.25));gold=mat("gold blonde",(.68,.48,.24));
parts=[]
def ell(name,pos,sc,material,bone):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=pos)
 o=bpy.context.object;o.name=name;o.scale=sc
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(material)
 for face in o.data.polygons:face.use_smooth=True
 parts.append((o,bone))
ell("pelvis",(0,0,1.01),(.19,.13,.16),skin,"Pelvis")
ell("lower abdomen",(0,0,1.17),(.17,.12,.19),skin,"Spine1")
ell("rib cage",(0,0,1.37),(.20,.13,.19),skin,"Spine3")
ell("neck",(0,0,1.55),(.063,.06,.09),skin,"Neck")
ell("head",(0,-.018,1.69),(.106,.089,.138),skin,"Head")
ell("blonde swept up hair",(0,.018,1.785),(.111,.09,.067),gold,"Head")
ell("blonde bun",(0,.072,1.824),(.084,.078,.066),gold,"Head")
ell("navel",(0,-.12,1.15),(.013,.005,.017),mat("navel shade",(.36,.21,.17)),"Spine1")
for side,label in ((1,"L"),(-1,"R")):
 ell(label+" upper arm",(.245*side,0,1.30),(.075,.075,.17),skin,label+"UpperArm")
 ell(label+" forearm",(.29*side,0,1.065),(.055,.052,.14),skin,label+"Forearm")
 ell(label+" hand",(.30*side,0,.90),(.055,.027,.07),skin,label+"Palm")
 ell(label+" thigh",(.105*side,0,.80),(.10,.11,.24),skin,label+"Thigh")
 ell(label+" shin",(.11*side,0,.37),(.069,.07,.21),skin,label+"Shin")
 ell(label+" foot",(.11*side,-.075,.10),(.079,.14,.054),skin,label+"Foot")
 for f in range(5):
  x=(.255+.021*f)*side
  ell(label+" finger "+str(f),(x,-.014,.825),(.01,.012,.056),skin,label+"Finger"+str(f)+"_0")
bpy.ops.object.armature_add()
rig=bpy.context.object;rig.name="Sav56"
bpy.ops.object.mode_set(mode="EDIT")
rig.data.edit_bones.remove(rig.data.edit_bones[0])
def bone(name,a,b,parent=None):
 e=rig.data.edit_bones.new(name);e.head=a;e.tail=b
 if parent:e.parent=rig.data.edit_bones[parent]
bone("Pelvis",(0,0,.95),(0,0,1.04))
parent="Pelvis"
for i,(a,b) in enumerate(((1.04,1.15),(1.15,1.27),(1.27,1.39),(1.39,1.49)),1):
 n="Spine"+str(i);bone(n,(0,0,a),(0,0,b),parent);parent=n
bone("Neck",(0,0,1.49),(0,0,1.59),parent)
bone("Head",(0,0,1.59),(0,0,1.78),"Neck")
bone("Jaw",(0,-.035,1.66),(0,-.09,1.64),"Head")
for side,label in ((1,"L"),(-1,"R")):
 bone(label+"Clavicle",(0,0,1.44),(.22*side,0,1.44),"Spine4")
 bone(label+"UpperArm",(.22*side,0,1.44),(.28*side,0,1.18),label+"Clavicle")
 bone(label+"Forearm",(.28*side,0,1.18),(.30*side,0,.97),label+"UpperArm")
 bone(label+"Wrist",(.30*side,0,.97),(.30*side,0,.90),label+"Forearm")
 bone(label+"Palm",(.30*side,0,.90),(.30*side,0,.85),label+"Wrist")
 for f in range(5):
  x=(.255+.021*f)*side;parent=label+"Palm"
  for j in range(3):
   n=label+"Finger"+str(f)+"_"+str(j)
   bone(n,(x,0,.85-j*.022),(x,0,.828-j*.022),parent);parent=n
 bone(label+"Thigh",(.105*side,0,.98),(.11*side,0,.55),"Pelvis")
 bone(label+"Shin",(.11*side,0,.55),(.11*side,0,.14),label+"Thigh")
 bone(label+"Ankle",(.11*side,0,.14),(.11*side,-.03,.09),label+"Shin")
 bone(label+"Foot",(.11*side,-.03,.09),(.11*side,-.17,.08),label+"Ankle")
bpy.ops.object.mode_set(mode="OBJECT")
assert len(rig.data.bones)==56,len(rig.data.bones)
for o,b in parts:
 vg=o.vertex_groups.new(name=b);vg.add(list(range(len(o.data.vertices))),1,"REPLACE")
 mod=o.modifiers.new("Armature","ARMATURE");mod.object=rig
 o.parent=rig
# Pose keyframes on armature; skeletal prototype, not final physically correct floor poses.
def action(name,frames,pose):
 for pb in rig.pose.bones:pb.rotation_mode="XYZ"
 for frame in frames:
  for pb in rig.pose.bones:
   pb.rotation_euler=(0,0,0)
   if pb.name in pose:pb.rotation_euler=pose[pb.name](frame)
   pb.keyframe_insert(data_path="rotation_euler",frame=frame)
 if rig.animation_data and rig.animation_data.action:
  a=rig.animation_data.action
  a.name=name
  track=rig.animation_data.nla_tracks.new();track.name=name
  track.strips.new(name,1,a)
  rig.animation_data.action=None
 else:raise RuntimeError("No action")
action("Sav_idle",[1,24,48],{"Spine2":lambda f:(.018*math.sin(f*math.pi/24),0,0)})
action("Sav_walk",[1,7,13,19,25],{
 "LThigh":lambda f:(.35*math.sin((f-1)*math.pi/12),0,0),
 "RThigh":lambda f:(-.35*math.sin((f-1)*math.pi/12),0,0),
 "LShin":lambda f:(max(0,.45*math.sin((f-1)*math.pi/12)),0,0),
 "RShin":lambda f:(max(0,-.45*math.sin((f-1)*math.pi/12)),0,0),
 "Pelvis":lambda f:(0,.05*math.sin((f-1)*math.pi/12),0)})
action("Sav_elbows_knees_pose_preview",[1,24],{
 "Spine1":lambda f:(.55*f/24,0,0),
 "LThigh":lambda f:(-1.2*f/24,0,0),
 "RThigh":lambda f:(-1.2*f/24,0,0),
 "LShin":lambda f:(1.65*f/24,0,0),
 "RShin":lambda f:(1.65*f/24,0,0),
 "LUpperArm":lambda f:(.95*f/24,0,0),
 "RUpperArm":lambda f:(.95*f/24,0,0),
 "LForearm":lambda f:(-1.2*f/24,0,0),
 "RForearm":lambda f:(-1.2*f/24,0,0)})
# Actions are preserved in NLA tracks as each animation is created.\nbpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for o,b in parts:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(out.resolve()),export_format="GLB",export_animations=True,export_skins=True,export_nla_strips=True,use_selection=True)
print("SAV_PROTOTYPE_SUCCESS",len(rig.data.bones),out.stat().st_size)
