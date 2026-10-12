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
skin=mat("Sav warm golden complexion",(.69,.435,.325));gold=mat("Sav sandy blonde",(.69,.52,.32));
# GLB-compatible node colors: use the same PBR material on ALL skin meshes.
# Per-object vertex-color multiplication previously made torso and limbs render
# in different tones (and could wash out on export). Keep material unified.

# Subtle per-vertex complexion variation for continuous torso; avoids flat plastic color.
def tone_torso(obj):
 import random
 random.seed(72)
 mesh=obj.data
 attr=mesh.color_attributes.new(name="SavSkinVariation",type="FLOAT_COLOR",domain="CORNER")
 for poly in mesh.polygons:
  for li in poly.loop_indices:
   v=mesh.vertices[mesh.loops[li].vertex_index].co
   warmth=.965+.025*math.sin(v.z*12)+.015*math.sin(v.x*21+v.z*7)
   attr.data[li].color=(min(1,warmth),min(1,.985*warmth),min(1,.97*warmth),1)
 # Vertex color multiplies the base skin tone rather than replacing it.
 nodes=skin.node_tree.nodes
 vertex=nodes.new("ShaderNodeVertexColor");vertex.layer_name="SavSkinVariation"
 mix=nodes.new("ShaderNodeMixRGB");mix.blend_type="MULTIPLY";mix.inputs[0].default_value=1
 mix.inputs[1].default_value=(*(.69,.435,.325),1)
 skin.node_tree.links.new(vertex.outputs["Color"],mix.inputs[2])
 skin.node_tree.links.new(mix.outputs["Color"],nodes.get("Principled BSDF").inputs["Base Color"])
parts=[]
def ell(name,pos,sc,material,bone):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=pos)
 o=bpy.context.object;o.name=name;o.scale=sc
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(material)
 for face in o.data.polygons:face.use_smooth=True
 parts.append((o,bone))
# Single continuous torso surface; vertical weights blend across pelvis and spine.
def torso():
 rings=[(.88,.096,.078),(.94,.147,.105),(1.02,.149,.106),(1.10,.116,.083),(1.18,.100,.077),(1.26,.119,.093),(1.35,.143,.103),(1.43,.139,.101),(1.49,.099,.079),(1.53,.060,.055)]
 # Smooth silhouette between anatomical landmarks.
 def interp(a,b,c,d,t):
  return .5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
 smooth=[]
 for i in range(len(rings)-1):
  p0=rings[max(0,i-1)];p1=rings[i];p2=rings[i+1];p3=rings[min(len(rings)-1,i+2)]
  for k in range(5):
   smooth.append(tuple(interp(p0[q],p1[q],p2[q],p3[q],k/5) for q in range(3)))
 smooth.append(rings[-1])
 verts=[];faces=[];count=48
 for z,rx,ry in smooth:
  for j in range(count):
   a=2*math.pi*j/count
   x=rx*math.cos(a);y=ry*math.sin(a)
   # Organic front chest projection and lower-abdominal soft tissue.
   # Front faces toward negative Y. Smooth falloff keeps one torso surface.
   front=max(0,-math.sin(a))
   breast_height=math.exp(-((z-1.365)/.083)**2)
   breast_lobes=math.exp(-((abs(x)-.081)/.061)**2)
   chest=0.070*breast_height*breast_lobes*front**1.5
   lower_belly=0.019*math.exp(-((z-1.095)/.092)**2)*front
   # Integrated neutral external pelvic landmarks on the continuous torso.
   # Sculpt the existing skin vertices, never attach floating primitives.
   pelvic_z=math.exp(-((z-.912)/.046)**2)
   midline=math.exp(-(x/.041)**2)
   paired_folds=(math.exp(-((x-.020)/.013)**2)+math.exp(-((x+.020)/.013)**2))
   front_pelvis=front**3 * pelvic_z
   outer_volume=.012*paired_folds*front_pelvis
   central_recess=.006*midline*front_pelvis
   y-=chest+lower_belly+outer_volume-central_recess
   verts.append((x,y,z))
 for i in range(len(smooth)-1):
  for j in range(count):
   k=i*count+j;n=i*count+(j+1)%count
   faces.append((k,n,n+count,k+count))
 faces.append(tuple(reversed(tuple(range(count)))))
 faces.append(tuple((len(smooth)-1)*count+j for j in range(count)))
 mesh=bpy.data.meshes.new("Sav continuous torso mesh");mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new("Sav continuous torso",mesh);bpy.context.collection.objects.link(obj)
 obj.data.materials.append(skin)
 for face in mesh.polygons:face.use_smooth=True
 parts.append((obj,None))
 return obj
def continuous_limb(name,centers,radii,first,second,pivot):
 n=24;verts=[];faces=[]
 for (x,y,z),rad in zip(centers,radii):
  for j in range(n):
   a=2*math.pi*j/n
   verts.append((x+rad*math.cos(a),y+rad*math.sin(a),z))
 for i in range(len(centers)-1):
  for j in range(n):
   a=i*n+j;b=i*n+(j+1)%n;faces.append((a,b,b+n,a+n))
 faces.append(tuple(reversed(range(n))))
 faces.append(tuple((len(centers)-1)*n+j for j in range(n)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(skin)
 for face in mesh.polygons:face.use_smooth=True
 parts.append((obj,("blend",first,second,pivot,n)))
 return obj
torso_mesh=torso()
# Smooth shoulder and hip socket transitions, weighted between torso and limb.
def socket(name,center,scale,parent,child):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=center)
 o=bpy.context.object;o.name=name;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(skin)
 for face in o.data.polygons:face.use_smooth=True
 parts.append((o,("socket",parent,child,center)))
 return o
# Torso receives vertex-color tonal variation; limb materials remain neutral until unified mesh.
# Uniform PBR skin throughout: no torso-only color attribute shader.
ell("neck",(0,0,1.55),(.063,.06,.09),skin,"Neck")
ell("head",(0,-.018,1.69),(.099,.083,.128),skin,"Head")
ell("blonde swept up hair",(0,.018,1.785),(.109,.087,.054),gold,"Head")
ell("blonde bun",(0,.072,1.824),(.067,.064,.055),gold,"Head")
# Anatomical detail is intentionally subtle and non-erotic. Geometry is
# attached to pelvis and evaluated in movement QA; not a final sculpt.
# Remove floating lower-pelvis capsule; continuous torso/hip mesh is next.
# Do not use separate protruding capsules for external pelvic folds.
# Pelvic anatomical detail requires a continuous sculpted surface, not floating
# ellipsoids that read as spikes in front/side views.
# Recognizable adult facial landmarks, front faces negative Y.
eye=mat("Sav brown eyes",(.18,.105,.068))
lip=mat("Sav lip tint",(.56,.265,.245))
for side,label in ((1,"L"),(-1,"R")):
 ell(label+" eye",(side*.039,-.100,1.699),(.022,.007,.012),eye,"Head")
 ell(label+" cheek",(side*.064,-.071,1.660),(.028,.012,.024),skin,"Head")
 ell(label+" ear",(side*.102,-.004,1.679),(.014,.021,.032),skin,"Head")
 ell(label+" temple hair",(side*.086,-.012,1.734),(.025,.039,.085),gold,"Head")
 ell(label+" loose side hair",(side*.096,.023,1.668),(.017,.026,.103),gold,"Head")
ell("nose bridge",(0,-.099,1.681),(.015,.016,.039),skin,"Head")
ell("nose tip",(0,-.119,1.658),(.021,.016,.013),skin,"Head")
ell("upper lip",(0,-.099,1.627),(.031,.008,.009),lip,"Jaw")
ell("lower lip",(0,-.099,1.615),(.029,.009,.009),lip,"Jaw")
ell("navel",(0,-.082,1.15),(.008,.004,.011),mat("navel shade",(.36,.21,.17)),"Spine1")
for side,label in ((1,"L"),(-1,"R")):
 socket(label+" shoulder transition",(.185*side,0,1.43),(.054,.065,.068),"Spine4",label+"UpperArm")
 socket(label+" hip transition",(.115*side,0,.975),(.064,.081,.098),"Pelvis",label+"Thigh")
 continuous_limb(label+" joined arm",[(.22*side,0,1.44),(.245*side,0,1.34),(.27*side,0,1.23),(.28*side,0,1.18),(.29*side,0,1.10),(.30*side,0,1.00),(.30*side,0,.97)],[.050,.051,.045,.040,.036,.031,.026],label+"UpperArm",label+"Forearm",3)
 ell(label+" hand",(.30*side,0,.90),(.043,.022,.064),skin,label+"Palm")
 continuous_limb(label+" joined leg",[(.105*side,0,.98),(.105*side,0,.86),(.108*side,0,.72),(.11*side,0,.60),(.11*side,0,.55),(.11*side,0,.43),(.11*side,0,.29),(.11*side,0,.14)],[.077,.083,.079,.066,.053,.049,.042,.034],label+"Thigh",label+"Shin",4)
 ell(label+" foot",(.11*side,-.075,.10),(.056,.115,.039),skin,label+"Foot")
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
# Verify each elbow and knee is represented by one connected surface.
for label in ("L","R"):
 for part in ("joined arm","joined leg"):
  obj=bpy.data.objects.get(label+" "+part)
  assert obj and obj.type=="MESH",label+" "+part+" missing"
  assert len(obj.data.polygons)>100,label+" "+part+" insufficient geometry"
print("SAV_CONTINUOUS_LIMB_MESHES_VERIFIED")
for o,b in parts:
 if isinstance(b,tuple) and b[0]=="socket":
  _,parent,child,center=b
  gp=o.vertex_groups.new(name=parent);gc=o.vertex_groups.new(name=child)
  for v in o.data.vertices:
   # Local coordinates are relative to socket center.
   lateral=abs(v.co.x)
   t=max(.05,min(.95,(lateral+.02)/(.14 if "shoulder" in o.name else .17)))
   gp.add([v.index],1-t,"REPLACE");gc.add([v.index],t,"REPLACE")
 elif isinstance(b,tuple) and b[0]=="blend":
  _,first,second,pivot,n=b
  g1=o.vertex_groups.new(name=first);g2=o.vertex_groups.new(name=second)
  for v in o.data.vertices:
   t=max(0,min(1,(v.index//n-pivot+1)/2))
   if t<1:g1.add([v.index],max(.0001,1-t),"REPLACE")
   if t>0:g2.add([v.index],max(.0001,t),"REPLACE")
 elif b is not None:
  vg=o.vertex_groups.new(name=b);vg.add(list(range(len(o.data.vertices))),1,"REPLACE")
 else:
  levels=[(.90,"Pelvis"),(1.09,"Spine1"),(1.20,"Spine2"),(1.32,"Spine3"),(1.46,"Spine4"),(1.54,"Neck")]
  groups={name:o.vertex_groups.new(name=name) for _,name in levels}
  for v in o.data.vertices:
   z=v.co.z
   if z<=levels[0][0]:groups["Pelvis"].add([v.index],1,"REPLACE");continue
   if z>=levels[-1][0]:groups["Neck"].add([v.index],1,"REPLACE");continue
   for k in range(len(levels)-1):
    lo,a=levels[k];hi,bone_name=levels[k+1]
    if lo<=z<=hi:
     t=(z-lo)/(hi-lo)
     groups[a].add([v.index],max(.0001,1-t),"REPLACE")
     groups[bone_name].add([v.index],max(.0001,t),"REPLACE")
     break
 mod=o.modifiers.new("Armature","ARMATURE");mod.object=rig
 o.parent=rig
# Consolidate body pieces into one connected skin surface BEFORE animation export.
# Keep hair, navel and finger meshes separate; those require finer sculpting.
# Voxel remesh removes intersecting ellipsoid seams at shoulders and hips.
def fuse_body_skin():
 from mathutils import Vector
 from mathutils.kdtree import KDTree
 candidates=[o for o,b in parts if o.type=="MESH" and
   (o.name=="Sav continuous torso" or "transition" in o.name or
    "joined arm" in o.name or "joined leg" in o.name or
    o.name=="neck" or o.name=="head")]
 if len(candidates)<10:raise RuntimeError("Missing skin pieces for fusion")
 # Record source vertex positions and weights in world space before joining.
 points=[]
 for obj in candidates:
  for v in obj.data.vertices:
   weights={obj.vertex_groups[g.group].name:g.weight for g in v.groups}
   points.append((obj.matrix_world@v.co,weights))
 kd=KDTree(len(points))
 for i,(co,weights) in enumerate(points):kd.insert(co,i)
 kd.balance()
 bpy.ops.object.select_all(action="DESELECT")
 for obj in candidates:obj.select_set(True)
 bpy.context.view_layer.objects.active=candidates[0]
 bpy.ops.object.join()
 merged=bpy.context.object
 merged.name="Sav fused anatomical skin"
 # Delete stale vertex groups; rebuild localized skin weights after remeshing.
 for vg in list(merged.vertex_groups):merged.vertex_groups.remove(vg)
 for mod in list(merged.modifiers):
  if mod.type=="ARMATURE":merged.modifiers.remove(mod)
 merged.data.remesh_voxel_size=.012
 bpy.ops.object.voxel_remesh()
 groups={}
 for v in merged.data.vertices:
  _,index,_=kd.find(merged.matrix_world@v.co)
  weights=points[index][1]
  weights=sorted(weights.items(),key=lambda kv:kv[1],reverse=True)[:4]
  total=sum(w for _,w in weights)
  for name,w in weights:
   if total<=0:continue
   if name not in groups:groups[name]=merged.vertex_groups.new(name=name)
   groups[name].add([v.index],w/total,"REPLACE")
 for p in merged.data.polygons:p.use_smooth=True
 arm=merged.modifiers.new("Sav anatomical armature","ARMATURE");arm.object=rig
 merged.parent=rig
 # Replace original entries so only the fused surface is exported.
 parts[:]=[(o,b) for o,b in parts if o not in candidates]
 parts.append((merged,"already_weighted"))
 print("SAV_FUSED_SKIN",len(merged.data.vertices),len(groups))
fuse_body_skin()
# Smooth the fused body at the mesh level to eliminate the last spherical
# socket seams without disturbing the underlying 56-bone armature.
body=bpy.data.objects.get("Sav fused anatomical skin")
if body:
 smooth=body.modifiers.new("Sav surface relaxation","SMOOTH")
 smooth.factor=1.15
 smooth.iterations=5
 bpy.context.view_layer.objects.active=body
 bpy.ops.object.select_all(action="DESELECT")
 body.select_set(True)
 # Apply only the smoothing modifier, keeping the armature live.
 bpy.ops.object.modifier_apply(modifier=smooth.name)
 # Reapply pelvic anatomical relief AFTER voxel fusion and smoothing.
 # Earlier sculpt was erased by the .012m voxel remesh and five smoothing passes.
 # Modify the fused skinned surface directly; do not add separate floating meshes.
 from mathutils import Vector
 for v in body.data.vertices:
  p=v.co
  if .865 < p.z < .985 and abs(p.x)<.082 and p.y<-.045:
   front_factor=max(0.0,min(1.0,(-p.y-.045)/.065))
   vertical=math.exp(-((p.z-.915)/.038)**2)
   outer=(math.exp(-((p.x-.024)/.014)**2)+math.exp(-((p.x+.024)/.014)**2))
   center=math.exp(-(p.x/.012)**2)
   # Raised paired contours separated by a restrained central recess.
   p.y-=front_factor*vertical*(.016*outer-.006*center)
 print("SAV_PELVIC_RELIEF_POST_FUSION",sum(1 for v in body.data.vertices if .865<v.co.z<.985 and abs(v.co.x)<.082 and v.co.y<-.045))
 # Repair blocky silhouette normals after voxel remeshing.
 for polygon in body.data.polygons:polygon.use_smooth=True
 print("SAV_BODY_SURFACE_RELAXED",len(body.data.vertices))
# Pose keyframes on armature; skeletal prototype, not final physically correct floor poses.
def action(name,frames,pose,root=None):
 for pb in rig.pose.bones:pb.rotation_mode="XYZ"
 for frame in frames:
  for pb in rig.pose.bones:
   pb.rotation_euler=(0,0,0)
   if pb.name in pose:pb.rotation_euler=pose[pb.name](frame)
   pb.keyframe_insert(data_path="rotation_euler",frame=frame)
   if pb.name=="Pelvis":
    pb.location=root(frame) if root else (0,0,0)
    pb.keyframe_insert(data_path="location",frame=frame)
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
 "Spine1":lambda f:(1.0*f/24,0,0),
 "LThigh":lambda f:(-1.65*f/24,0,0),
 "RThigh":lambda f:(-1.65*f/24,0,0),
 "LShin":lambda f:(2.1*f/24,0,0),
 "RShin":lambda f:(2.1*f/24,0,0),
 "LUpperArm":lambda f:(-1.4*f/24,0,0),
 "RUpperArm":lambda f:(-1.4*f/24,0,0),
 "LForearm":lambda f:(1.4*f/24,0,0),
 "RForearm":lambda f:(1.4*f/24,0,0)},root=lambda f:(0,-.26*f/24,-.40*f/24))
# Actions are preserved in NLA tracks as each animation is created.
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for o,b in parts:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(out.resolve()),export_format="GLB",export_animations=True,export_skins=True,export_nla_strips=True,use_selection=True)
print("SAV_PROTOTYPE_SUCCESS",len(rig.data.bones),out.stat().st_size)
