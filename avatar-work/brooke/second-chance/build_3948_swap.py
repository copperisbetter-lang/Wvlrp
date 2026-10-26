"""Isolated experimental Brooke 3.1 head swap + deformable facial controls.
Source 3948, Brooke 1, Sophie 1 and Mona are never saved or modified.
Run: blender -b --python-exit-code 1 --python build_3948_swap.py
Not a photoreal or mouth-cavity acceptance test.
"""
import bpy, bmesh, math, json, os, hashlib
from mathutils import Matrix,Vector
from mathutils.kdtree import KDTree

BASE='avatar-work/brooke/second-chance/'
BODY=BASE+'brooke-3-1-body-candidate.glb'
HEAD='3948-3d.glb'
OUT=BASE+'brooke-3-1-3948-rig-experimental.glb'
REPORT=BASE+'brooke-3-1-experimental-check.json'
expected={'head':'8613ecb4e490edd9e4c70b6a70e28bacd7fe45572f14b267b8a2b3bddba93ce2',
          'body':'621c27b7e63ef7799a3be44c31a076f21ce3b22634d3bded41159bb1a2584026'}
def hashfile(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()
assert hashfile(HEAD)==expected['head'] and hashfile(BODY)==expected['body'],'Source changed: audit again'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=BODY)
bodymeshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
bodyrigs=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']
print('BODY_IMPORT_OBJECTS',json.dumps({'mesh_objects':[(o.name,o.data.name,len(o.data.vertices)) for o in bodymeshes],'armatures':[o.name for o in bodyrigs]}))
assert len(bodyrigs)>=1 and len(bodymeshes)>=3, 'Unexpected clone structure; refuse surgery'
base=next(o for o in bodymeshes if o.data.name.startswith('base'))
eye=next(o for o in bodymeshes if 'high-poly' in o.data.name)
hair=next(o for o in bodymeshes if 'long01' in o.data.name)
assert len(base.data.vertices)>14000
bodybefore=len(base.data.vertices)
vcoords=[v.co for v in base.data.vertices]
bounds=[(min(p[i] for p in vcoords),max(p[i] for p in vcoords)) for i in range(3)]
if bounds[1][1]>1.3 and bounds[1][0]<.02:
    up=1;Tb=Matrix.Identity(4)
elif bounds[2][1]>1.3 and bounds[2][0]<.02:
    up=2;Tb=Matrix.Rotation(math.pi/2,4,'X')
else:
    raise RuntimeError('Body axis not determined: '+str(bounds))
world_verts=[base.matrix_world@p for p in vcoords]
world_bounds=[(min(p[i] for p in world_verts),max(p[i] for p in world_verts)) for i in range(3)]
bones=bodyrigs[0].data.bones
print('BODY_COORDS',json.dumps({'local':bounds,'world':world_bounds,'base_matrix':[[float(c) for c in row] for row in base.matrix_world],
  'head_joint': list(bones['mixamorig:Head'].head_local) if 'mixamorig:Head' in bones else None,
  'neck_joint': list(bones['mixamorig:Neck'].head_local) if 'mixamorig:Neck' in bones else None}))
assert 'mixamorig:Head' in bones and 'mixamorig:Neck' in bones, 'Need actual head/neck bone locations'
head_world=bodyrigs[0].matrix_world@bones['mixamorig:Head'].head_local
head_in_mesh=base.matrix_world.inverted()@head_world
cut=head_world[up]/(base.matrix_world.to_scale()[up]*bodyrigs[0].matrix_world.to_scale()[up])-.025
print('NECK_CUT_REVISED',json.dumps({'head_joint_world':head_world[up], 'body_parent_scale':base.matrix_world.to_scale()[up],'armature_parent_scale':bodyrigs[0].matrix_world.to_scale()[up], 'mesh_local_cut':cut}))
assert bounds[up][0]+.6<cut<bounds[up][1]-.04, 'Cut outside upper body: '+str(cut)
# Surgical selection: old head SKIN vertices, not a horizontal slice through
# the entire character. A full-plane bisect destroyed both shoulders, upper
# torso and arm attachment in the rejected v1 screenshot. Keep EVERY shoulder,
# arm, leg, torso and hand vertex, including those higher than the neck cut.
head_group=base.vertex_groups.get('mixamorig:Head')
assert head_group is not None, 'No skinning group for original head'
preserve_names=['mixamorig:LeftShoulder','mixamorig:RightShoulder',
 'mixamorig:LeftArm','mixamorig:RightArm','mixamorig:Spine2',
 'mixamorig:LeftForeArm','mixamorig:RightForeArm']
preserve_groups={g.index for n in preserve_names for g in [base.vertex_groups.get(n)] if g}
assert len(preserve_groups)==len(preserve_names),'Missing shoulder/arm control weights'
def vertex_weight(v,group):
    return next((e.weight for e in v.groups if e.group==group.index),0.0)
head_remove_indices=[]
preserve_high_indices=[]
for v in base.data.vertices:
    attached_to_shoulder=any(vertex_weight(v,base.vertex_groups[n])>.10 for n in preserve_names)
    if attached_to_shoulder:
        preserve_high_indices.append(v.index)
    if (v.co[up]>cut and vertex_weight(v,head_group)>.12 and not attached_to_shoulder):
        head_remove_indices.append(v.index)
assert len(head_remove_indices)>3000 and len(head_remove_indices)<4800, (
    'Unsafe head region count: '+str(len(head_remove_indices)))
assert not set(head_remove_indices).intersection(preserve_high_indices), 'Attempted shoulder deletion'
old_height=max(v.co[up] for v in base.data.vertices)
old_width=max(v.co[0] for v in base.data.vertices)-min(v.co[0] for v in base.data.vertices)
bm=bmesh.new();bm.from_mesh(base.data);bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm,geom=[bm.verts[i] for i in head_remove_indices],context='VERTS')
bm.to_mesh(base.data);bm.free();base.data.update()
afterbounds=max(v.co[up] for v in base.data.vertices)
new_width=max(v.co[0] for v in base.data.vertices)-min(v.co[0] for v in base.data.vertices)
assert len(base.data.vertices)==bodybefore-len(head_remove_indices)
assert abs(new_width-old_width)<0.001, 'Hand/arm outer extent lost during cut'
assert afterbounds<old_height-.03, 'Significant portion of original head still exists'
print('BODY_HEAD_ONLY_REMOVAL',json.dumps({'original_vertices':bodybefore,
 'head_vertices_removed':len(head_remove_indices),
 'preserved_shoulder_arm_spine_vertices':len(preserve_high_indices),
 'remaining_body_vertices':len(base.data.vertices),
 'old_width':old_width,'new_width':new_width,
 'old_height':old_height,'remaining_height':afterbounds}))
# Those meshes are the OLD eyes and long hair; retain body, accessories and existing 52-bone rig.
bpy.data.objects.remove(eye,do_unlink=True)
bpy.data.objects.remove(hair,do_unlink=True)

pre=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=HEAD)
newobjs=set(bpy.context.scene.objects)-pre
heads=[o for o in newobjs if o.type=='MESH']
assert len(heads)==1,'3948 has unexpectedly more than one head skin mesh'
h=heads[0];h.name='Brooke_3948_ApprovedFace_CrownV3_WorkingCopy'
verts=h.data.vertices
coords=[v.co.copy() for v in verts];tree=KDTree(len(coords))
for i,v in enumerate(coords):tree.insert(v,i)
tree.balance()
landmarks=[
(0.00537,-0.03906,0.26775),(0.00119,-0.07099,0.24967),
(-0.07590,-0.03924,0.21135),(0.07284,-0.03673,0.21560),
(0.09758,0.17919,0.28559),(-0.09560,0.17681,0.28913)]
transforms=[
    ('identity',Matrix.Identity(4)),
    ('to_z',Matrix.Rotation(math.pi/2,4,'X')),
    ('to_minus_z',Matrix.Rotation(-math.pi/2,4,'X'))]
def score(matrix):
    return sum(tree.find(matrix@Vector(q))[2] for q in landmarks)/len(landmarks)
name,Th=min(transforms,key=lambda z:score(z[1]))
residual=score(Th)
assert residual<.035,'Cannot register approved 3948 facial coordinates: '+str(residual)
to_canonical=Th.inverted()
# Preserve source image texture and UV; build raised crown directly into working mesh.
def smooth(t):
    t=max(0.,min(1.,t));return t*t*(3-2*t)
for v in verts:
    p=to_canonical@v.co
    x,y,z=p
    crown=.155*smooth((y-.29)/.14)*max(0,1-(x/.52)**2)**.85 * max(0,1-((z+.01)/.52)**2)**.45
    v.co=Th@Vector((x,y+crown,z))
h.data.update()

# Localized non-destructive shape keys: one source scan, neutral 0, independent controls.
h.shape_key_add(name='Basis')
shapes={name:h.shape_key_add(name=name) for name in
    ('Smile','Smile_Left','Smile_Right','Jaw_Open','Lips_Round_O','Lips_Part',
     'Brows_Up_Left','Brows_Up_Right','Blink_Left','Blink_Right')}
L={'upper':(.00537,-.03906,.26775),'lower':(.00119,-.07099,.24967),
   'chin':(.00723,-.13830,.21019),'left':(-.07590,-.03924,.21135),
   'right':(.07284,-.03673,.21560),
   'browL':(.09758,.17919,.28559),'browR':(-.09560,.17681,.28913)}
def G(v,c,w):return math.exp(-((v-c)/w)**2)
def spot(p,c,wx,wy,wz):
    return G(p.x,c[0],wx)*G(p.y,c[1],wy)*G(p.z,c[2],wz)
for i,v in enumerate(h.data.vertices):
    p=to_canonical@v.co;x,y,z=p
    upM=spot(p,L['upper'],.09,.024,.12)
    lo=spot(p,L['lower'],.09,.028,.12)
    cl=spot(p,L['left'],.043,.05,.11)
    cr=spot(p,L['right'],.043,.05,.11)
    mouth=max(upM,lo,cl,cr)
    jaw=spot(p,L['lower'],.13,.075,.13)
    chin=spot(p,L['chin'],.13,.055,.12)
    brows=[spot(p,L['browL'],.07,.035,.08),spot(p,L['browR'],.07,.035,.08)]
    eyes=[G(x,.097,.055)*G(z,.282,.09),G(x,-.097,.055)*G(z,.282,.09)]
    lids=G(z,.292,.028)
    moves={
      'Smile':(.016*math.copysign(1,x)*(cl+cr),.017*(cl+cr),0),
      'Smile_Left':(-.016*cl,.017*cl,0),
      'Smile_Right':(.016*cr,.017*cr,0),
      'Jaw_Open':(0,.004*G(y,-.039,.012)*G(z,.26,.09)-.050*G(y,-.071,.018)*G(z,.26,.09)-.018*jaw-.006*chin,-.003*jaw),
      'Lips_Round_O':(-math.copysign(1,x)*.020*mouth,(.013*upM-.022*lo),.017*mouth),
      'Lips_Part':(0,.006*upM-.012*lo,0),
      'Brows_Up_Left':(0,.018*brows[0],0),
      'Brows_Up_Right':(0,.018*brows[1],0),
      'Blink_Left':(0,eyes[0]*lids*(-.027*G(y,.133,.025)+.008*G(y,.100,.018)),0),
      'Blink_Right':(0,eyes[1]*lids*(-.027*G(y,.133,.025)+.008*G(y,.100,.018)),0)}
    for k,delta in moves.items():
        shapes[k].data[i].co=Th@(p+Vector(delta))
for s in shapes.values():s.value=0

# A separate ACTUAL skinned facial skeleton; Mona's 505-joint weights do not fit 3948.
arm=bpy.data.armatures.new('Brooke_3948_FacialArmature');rig=bpy.data.objects.new('Brooke_3948_FacialRig',arm)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig
rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
spec=[
 ('BrookeHead',(0,-.28,-.08),(0,.33,-.08),None),
 ('Jaw',(0,-.16,.18),(0,-.065,.22),'BrookeHead'),
 ('UpperLip',(0,-.045,.20),(0,-.025,.24),'BrookeHead'),
 ('LowerLip',(0,-.087,.19),(0,-.065,.23),'Jaw'),
 ('MouthCorner.L',(-.076,-.050,.19),(-.076,-.020,.22),'BrookeHead'),
 ('MouthCorner.R',(.073,-.050,.19),(.073,-.020,.22),'BrookeHead'),
 ('Brow.L',(.098,.165,.25),(.098,.200,.25),'BrookeHead'),
 ('Brow.R',(-.096,.165,.25),(-.096,.200,.25),'BrookeHead'),
 ('UpperEyelid.L',(.097,.145,.26),(.097,.165,.26),'BrookeHead'),
 ('UpperEyelid.R',(-.097,.145,.26),(-.097,.165,.26),'BrookeHead'),
 ('Cheek.L',(-.15,-.015,.20),(-.13,.040,.23),'BrookeHead'),
 ('Cheek.R',(.15,-.015,.20),(.13,.040,.23),'BrookeHead')]
for name,a,b,parent in spec:
    bone=arm.edit_bones.new(name);bone.head=Th@Vector(a);bone.tail=Th@Vector(b)
    if parent:bone.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
# Skin weights: base head retains control; localized deform bone weights, normalized.
vgs={name:h.vertex_groups.new(name=name) for name,*_ in spec}
for i,v in enumerate(h.data.vertices):
    p=to_canonical@v.co
    weights={
      'Jaw':.85*spot(p,(.0,-.125,.225),.135,.080,.115),
      'UpperLip':.45*spot(p,L['upper'],.07,.028,.07),
      'LowerLip':.55*spot(p,L['lower'],.07,.028,.07),
      'MouthCorner.L':.55*spot(p,L['left'],.05,.045,.08),
      'MouthCorner.R':.55*spot(p,L['right'],.05,.045,.08),
      'Brow.L':.60*spot(p,L['browL'],.075,.045,.085),
      'Brow.R':.60*spot(p,L['browR'],.075,.045,.085),
      'UpperEyelid.L':.60*spot(p,(.097,.14,.285),.060,.035,.060),
      'UpperEyelid.R':.60*spot(p,(-.097,.14,.285),.060,.035,.060),
      'Cheek.L':.34*spot(p,(-.14,.0,.22),.10,.09,.10),
      'Cheek.R':.34*spot(p,(.14,.0,.22),.10,.09,.10)}
    total=sum(weights.values());factor=min(1.,.93/max(total,1e-8))
    for bone,w in weights.items():
        if w*factor>.008:vgs[bone].add([i],w*factor,'REPLACE')
    vgs['BrookeHead'].add([i],max(.07,1.-total*factor),'REPLACE')
mod=h.modifiers.new('Brooke_3948_ActualFacialBones','ARMATURE');mod.object=rig
# Register geometry at the old Brooke fitting position using source-space alignment.
placement=Tb@Matrix.Translation(Vector((.0118137358,1.518908886,.0253151481)))@Matrix.Scale(.29,4)@Th.inverted()
h.matrix_world=placement;rig.matrix_world=placement
bpy.context.view_layer.update()
# Verify bone motion produces DIFFERENT evaluated vertex coordinates, then reset.
rig.pose.bones['Jaw'].rotation_mode='XYZ'
rig.pose.bones['Jaw'].location=Th@Vector((0,-.032,0))
bpy.context.view_layer.update()
evaluated=h.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
delta=max((evaluated.vertices[k].co-h.data.vertices[k].co).length for k in range(0,len(verts),23))
h.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh_clear()
rig.pose.bones['Jaw'].location=(0,0,0)
bpy.context.view_layer.update()
assert delta>.00001, 'Facial bone did not physically deform skin'
# Include existing body and armature, modified head clone and its facial rig in inspection export.
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type in {'MESH','ARMATURE','EMPTY'}:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',use_selection=True,export_morph=True,export_skins=True)
report={'source_hashes_unchanged':hashfile(HEAD)==expected['head'] and hashfile(BODY)==expected['body'],
  'body_vertices_before':bodybefore,'body_vertices_after_cut':len(base.data.vertices),
  'body_head_cut_y_glb':cut,'selective_head_vertices_removed':len(head_remove_indices),'protected_shoulder_arm_spine_vertices':len(preserve_high_indices),'head_scale':0.29,'head_source':'3948','approved_crown_baked':True,
  'model_local_axis':str(Th),'landmark_residual':residual,
  'facial_bones':list(vgs),'facial_morphs':list(shapes),'facial_bone_test_delta':delta,
  'export_path':OUT,'export_bytes':os.path.getsize(OUT),
  'not_verified':['mouth cavity/topology','face likeness','skin color match','pose quality','neck seam','phone viewer']}
open(REPORT,'w').write(json.dumps(report,indent=2))
print('BROOKE_31_RIG_SWAP_REPORT '+json.dumps(report))
