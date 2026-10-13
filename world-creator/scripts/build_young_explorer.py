"""The Wild: age-appropriate, independently rigged seven-year-old girl.
Natural brown hair, green eyes, SINGLE olive material on ALL exposed skin,
opaque short muted-plaid sundress and sneakers. No adult character scaling.
Blender 4.2 --background --python world-creator/scripts/build_young_explorer.py
"""
import bpy, math, json, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'young-explorer-olive-plaid.glb'
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name,c,rough=.78):
 m=bpy.data.materials.new(name)
 m.use_nodes=True
 m.diffuse_color=(*c,1)
 bsdf=m.node_tree.nodes.get('Principled BSDF')
 bsdf.inputs['Base Color'].default_value=(*c,1)
 bsdf.inputs['Roughness'].default_value=rough
 bsdf.inputs['Metallic'].default_value=0
 return m

SKIN=material('Olive child skin - face neck ears arms hands legs ONE material',(.57,.425,.285),.81)
BRN=material('Chestnut brown hair',(.17,.09,.052))
LIGHTBRN=material('Warm brown hair highlights',(.29,.16,.092))
EYEWHITE=material('Eye sclera',(.90,.88,.82),.35)
GREEN=material('Natural deep moss-green iris',(.09,.32,.17),.23)
BLACK=material('Pupils',(.015,.02,.018),.21)
BROW=material('Brown eyebrows',(.16,.085,.052))
LIP=material('Small natural relaxed smile',(.46,.245,.217))
SHOE=material('Forest green closed toe sneakers',(.14,.23,.18))
CREAM=material('Cream shoe soles and dress hem thread',(.82,.79,.67))
# Baked and embedded plaid cloth texture (not a procedural Blender-only shader).
N=256
teximage=bpy.data.images.new('Brown red navy woven plaid',width=N,height=N,alpha=False)
pixels=[0.]*(N*N*4)
for y in range(N):
 for x in range(N):
  a=x*7/N%1;b=y*7/N%1
  linev=.46<a<.51;lineh=.46<b<.51
  navyv=.08<a<.31;navyh=.08<b<.31
  if linev or lineh: c=(.70,.58,.42)
  elif navyv and navyh: c=(.10,.15,.18)
  elif navyv:c=(.19,.24,.31)
  elif navyh:c=(.34,.19,.22)
  else:c=(.41,.265,.26)
  weave=.98 if (x+y)%3==0 else 1
  idx=(y*N+x)*4
  pixels[idx:idx+4]=[c[0]*weave,c[1]*weave,c[2]*weave,1]
teximage.pixels.foreach_set(pixels)
teximage.file_format='PNG'
teximage.pack()
PLAID=material('Opaque short plaid sundress',(.32,.25,.24),.93)
node=PLAID.node_tree.nodes.new('ShaderNodeTexImage');node.image=teximage
PLAID.node_tree.links.new(node.outputs['Color'],PLAID.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
PLAID.use_backface_culling=False

data=bpy.data.armatures.new('Rig - age seven, child proportions')
rig=bpy.data.objects.new('Young Explorer Armature',data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name,start,end,parent=None):
 b=data.edit_bones.new(name);b.head=start;b.tail=end
 if parent:b.parent=data.edit_bones[parent]
# About 1.24m standing, broad child's skull, narrow shoulders, undeveloped frame.
bone('Hips',(0,0,.718),(0,0,.845))
bone('Spine',(0,0,.845),(0,0,.972),'Hips')
bone('Neck',(0,0,.972),(0,0,1.034),'Spine')
bone('Head',(0,0,1.034),(0,0,1.218),'Neck')
for sign,side in ((-1,'Left'),(1,'Right')):
 bone(side+'UpperArm',(sign*.130,0,.964),(sign*.202,0,.791),'Spine')
 bone(side+'ForeArm',(sign*.202,0,.791),(sign*.217,-.014,.650),side+'UpperArm')
 bone(side+'Hand',(sign*.217,-.014,.650),(sign*.217,-.014,.574),side+'ForeArm')
 bone(side+'Thigh',(sign*.087,0,.721),(sign*.091,0,.36),'Hips')
 bone(side+'Shin',(sign*.091,0,.36),(sign*.092,0,.109),side+'Thigh')
 bone(side+'Foot',(sign*.092,0,.109),(sign*.092,-.099,.065),side+'Shin')
bpy.ops.object.mode_set(mode='OBJECT')
rig.select_set(False)

skin_objects=[]
def skinned(obj,bone_name,skin_part=False):
 obj.parent=rig
 vg=obj.vertex_groups.new(name=bone_name)
 vg.add(list(range(len(obj.data.vertices))),1,'REPLACE')
 arm=obj.modifiers.new('Actual child skeleton skin deformation','ARMATURE')
 arm.object=rig
 for p in obj.data.polygons:p.use_smooth=True
 if skin_part:
  skin_objects.append(obj)
  assert len(obj.data.materials)==1 and obj.data.materials[0]==SKIN
 return obj
def ball(name,pos,scale,mat,bone_name,seg=20,ring=14):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=ring,location=pos)
 obj=bpy.context.object;obj.name=name;obj.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 obj.data.materials.append(mat)
 return skinned(obj,bone_name,mat==SKIN)
def pipe(name,a,b,r0,r1,mat,bone_name,segments=16):
 a=Vector(a);b=Vector(b);axis=(b-a).normalized()
 across=axis.cross(Vector((0,1,0)))
 if across.length<.05:across=axis.cross(Vector((1,0,0)))
 across.normalize();other=axis.cross(across).normalized()
 verts=[]
 for pos,r in [(a,r0),(b,r1)]:
  for k in range(segments):
   t=2*math.pi*k/segments
   verts.append(tuple(pos+r*(across*math.cos(t)+other*math.sin(t))))
 polys=[(k,(k+1)%segments,segments+(k+1)%segments,segments+k) for k in range(segments)]
 polys.extend([tuple(range(segments-1,-1,-1)),tuple(range(segments,2*segments))])
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],polys);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 obj.data.materials.append(mat)
 return skinned(obj,bone_name,mat==SKIN)
def tubecloth(name,rings,mat,bone_name,segments=40,with_uv=False):
 verts=[];faces=[]
 for z,rx,ry,cy in rings:
  for i in range(segments):
   t=2*math.pi*i/segments
   verts.append((rx*math.cos(t),cy+ry*math.sin(t),z))
 for j in range(len(rings)-1):
  for i in range(segments):
   faces.append((j*segments+i,j*segments+(i+1)%segments,
                 (j+1)*segments+(i+1)%segments,(j+1)*segments+i))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 if with_uv:
  lay=mesh.uv_layers.new(name='Plaid weaving')
  for poly in mesh.polygons:
   i=(poly.index%segments);j=(poly.index//segments)
   for k,loop in enumerate(poly.loop_indices):
    lay.data[loop].uv=([(i/segments,j/(len(rings)-1)),((i+1)/segments,j/(len(rings)-1)),
                        ((i+1)/segments,(j+1)/(len(rings)-1)),(i/segments,(j+1)/(len(rings)-1))][k][0]*3,
                        [(i/segments,j/(len(rings)-1)),((i+1)/segments,j/(len(rings)-1)),
                        ((i+1)/segments,(j+1)/(len(rings)-1)),(i/segments,(j+1)/(len(rings)-1))][k][1]*2)
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 mesh.materials.append(mat)
 return skinned(obj,bone_name)

# All areas of exposed skin use the exact SAME material instance.
ball('Rounded child head and cheeks',(0,-.001,1.112),(.133,.110,.141),SKIN,'Head',36,26)
ball('Lower rounded jaw',(0,-.018,1.032),(.092,.085,.054),SKIN,'Head')
pipe('Continuous matching olive neck',(0,0,.946),(0,0,1.04),.049,.048,SKIN,'Neck')
ball('Subtle little nose',(0,-.110,1.104),(.014,.013,.023),SKIN,'Head')
for s,side in ((-1,'Left'),(1,'Right')):
 ball(side+' matching olive ear',(s*.135,0,1.111),(.023,.025,.035),SKIN,'Head')
 x=s*.053
 ball(side+' eye white',(x,-.103,1.148),(.030,.013,.021),EYEWHITE,'Head',22,14)
 ball(side+' green iris',(x,-.1155,1.147),(.016,.006,.016),GREEN,'Head')
 ball(side+' pupil',(x,-.1218,1.147),(.007,.003,.008),BLACK,'Head')
 ball(side+' brow',(x,-.105,1.195),(.034,.006,.006),BROW,'Head')
 pipe(side+' upper arm',(s*.139,0,.944),(s*.203,0,.790),.042,.033,SKIN,side+'UpperArm')
 ball(side+' olive elbow',(s*.203,0,.790),(.034,.032,.034),SKIN,side+'ForeArm')
 pipe(side+' forearm',(s*.203,0,.788),(s*.217,-.013,.645),.034,.025,SKIN,side+'ForeArm')
 ball(side+' little hand',(s*.217,-.014,.609),(.032,.023,.046),SKIN,side+'Hand')
 for k in range(4):
  x=s*(.196+.014*k)
  pipe(side+' finger '+str(k),(x,-.017,.579),(x,-.019,.547+.003*k),
       .007,.005,SKIN,side+'Hand',10)
 pipe(side+' thigh',(s*.085,0,.708),(s*.091,0,.355),.062,.048,SKIN,side+'Thigh')
 ball(side+' matching olive knee',(s*.091,0,.355),(.049,.049,.050),SKIN,side+'Shin')
 pipe(side+' shin',(s*.091,0,.351),(s*.092,0,.102),.047,.031,SKIN,side+'Shin')
 ball(side+' plain cream sock',(s*.092,0,.099),(.034,.035,.062),CREAM,side+'Foot')
 ball(side+' green sneaker',(s*.092,-.053,.071),(.066,.121,.054),SHOE,side+'Foot')
 ball(side+' rubber sole',(s*.092,-.055,.027),(.072,.125,.022),CREAM,side+'Foot')
 for k in range(3):
  ball(side+' shoelace '+str(k),(s*.092,-.155,.068+k*.011),
       (.037,.0045,.004),CREAM,side+'Foot',12,10)

# Small relaxed natural mouth, non-exaggerated expression.
for i in range(11):
 x=(i-5)*.0054
 ball('Smile curve '+str(i),(x,-.109,1.067+.0045*(x/.027)**2),
      (.0045,.003,.0027),LIP,'Head',12,8)

# Medium-length brown hair with an unobstructed face and layered locks.
tubecloth('Dark chestnut parted hairline',[(1.249,.055,.06,.015),
 (1.24,.110,.095,.018),(1.206,.136,.115,.024),(1.180,.138,.116,.030)],BRN,'Head',48)
ball('Soft chestnut back hair',(0,.056,1.072),(.131,.076,.167),BRN,'Head',28,20)
for s,side in ((-1,'Left'),(1,'Right')):
 for n in range(3):
  pipe(side+' hair layer '+str(n),
   (s*(.110+.011*n),.025,1.201-.010*n),
   (s*(.128+.012*n),.036,.956+.012*n),.025,.015,
   BRN if n!=1 else LIGHTBRN,'Head')
 ball(side+' side-part fringe',(s*.063,-.076,1.233),
      (.068,.036,.027),BRN if s<0 else LIGHTBRN,'Head')

# All surfaces of the short A-line sundress are opaque; hem stays above knee.
tubecloth('Fully opaque high-neck plaid sundress bodice',[
 (.846,.122,.091,.009),(.907,.131,.094,.009),
 (.959,.132,.093,.008),(.989,.117,.084,.009),
 (1.005,.096,.076,.008)],PLAID,'Spine',with_uv=True)
tubecloth('Fully opaque above-knee plaid skirt',[
 (.85,.124,.092,.009),(.804,.143,.113,.009),(.752,.161,.130,.009),
 (.697,.187,.146,.009),(.644,.211,.164,.009),
 (.595,.225,.178,.009)],PLAID,'Hips',with_uv=True)
tubecloth('Neat opaque dress hem',[(.596,.226,.179,.009),(.586,.228,.180,.009)],CREAM,'Hips')
for s,side in ((-1,'Left'),(1,'Right')):
 pipe(side+' front dress shoulder strap',(s*.098,-.057,1.001),
   (s*.129,0,.960),.018,.021,PLAID,'Spine')
 pipe(side+' back dress shoulder strap',(s*.098,.055,1.001),
   (s*.129,.003,.960),.018,.021,PLAID,'Spine')

assert len(skin_objects)>25
assert all(o.data.materials[0] is SKIN for o in skin_objects), 'Mismatched face/body skin'
print('WVLRP_CHILD_UNIFIED_OLIVE_SKIN',len(skin_objects),SKIN.name)

# Three actual reusable rig clips: neutral idle, cheerful wave, in-place walk.
bpy.context.view_layer.objects.active=rig
for action_name,poses in (
 ('Young Explorer Idle',[(1,{}),(18,{'Head':(.028,0,0),'Spine':(.012,0,0)}),(35,{})]),
 ('Young Explorer Wave',[(1,{}),(11,{'RightUpperArm':(0,-1.45,0),'RightForeArm':(.25,0,0)}),
                        (19,{'RightUpperArm':(0,-1.45,0),'RightForeArm':(-.30,0,.35)}),
                        (26,{'RightUpperArm':(0,-1.45,0),'RightForeArm':(.25,0,-.30)}),(38,{})]),
 ('Young Explorer Walk',[(1,{}),(11,{'LeftThigh':(.36,0,0),'RightThigh':(-.36,0,0),
                                     'LeftUpperArm':(-.16,0,0),'RightUpperArm':(.16,0,0)}),
                          (21,{'LeftThigh':(-.36,0,0),'RightThigh':(.36,0,0),
                                     'LeftUpperArm':(.16,0,0),'RightUpperArm':(-.16,0,0)}),
                          (32,{})]),
):
 action=bpy.data.actions.new(action_name)
 if not rig.animation_data:rig.animation_data_create()
 rig.animation_data.action=action
 for frame,changes in poses:
  for pb in rig.pose.bones:
   pb.rotation_mode='XYZ'
   pb.rotation_euler=changes.get(pb.name,(0,0,0))
   pb.keyframe_insert(data_path='rotation_euler',frame=frame,group=pb.name)
 rig.animation_data.action=None
 track=rig.animation_data.nla_tracks.new();track.name=action_name
 strip=track.strips.new(action_name,1,action)
 strip.action_frame_start=poses[0][0];strip.action_frame_end=poses[-1][0]
 print('WVLRP_CHILD_ANIMATION',action_name,poses[-1][0])
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0)
rig.hide_render=False
bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
for o in bpy.data.objects:
 if o.type=='MESH':o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,
 export_animations=True,export_nla_strips=True,export_skins=True,
 export_materials='EXPORT',export_yup=True)
assert OUT.exists() and OUT.stat().st_size>30000
data=OUT.read_bytes()
assert data[:4]==b'glTF' and struct.unpack_from('<I',data,8)[0]==len(data)
ln,kind=struct.unpack_from('<II',data,12)
doc=json.loads(data[20:20+ln])
assert doc.get('skins') and len(doc['skins'][0]['joints'])>=15,'rig not exported'
assert len(doc.get('animations',[]))>=3,'animation clips not exported'
assert any('plaid' in m['name'].lower() for m in doc.get('materials',[]))
assert len([m for m in doc.get('materials',[]) if m['name'].startswith('Olive child skin')])==1
assert doc.get('textures') and doc.get('images'),'plaid weave texture not embedded'
print('WVLRP_YOUNG_EXPLORER_SUCCESS',OUT.stat().st_size,'bytes',len(doc['skins'][0]['joints']),'bones',
      [a.get('name') for a in doc['animations']])
