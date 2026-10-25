import bpy,math,json
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath='avatar-work/brooke/second-chance/brooke-head-3-0.glb')
o=next(x for x in bpy.context.scene.objects if x.type=='MESH')
bpy.context.view_layer.objects.active=o;o.select_set(True)
basis=o.shape_key_add(name='Basis')
keys={}
for name in ['Relaxed','Smile','Smile_Left','Smile_Right','Jaw_Open','Lips_Round_O','Lips_Part']:
 keys[name]=o.shape_key_add(name=name)
# Exploratory morphs only. Geometry axis/orientation must be visually validated before approval.
verts=o.data.vertices
mn=[min(v.co[i] for v in verts) for i in range(3)]
mx=[max(v.co[i] for v in verts) for i in range(3)]
mid=[(a+b)/2 for a,b in zip(mn,mx)]
span=[b-a for a,b in zip(mn,mx)]
# Keep all morphs at zero by default; they are placeholders, not certified mouth motion.
for k in keys.values():k.value=0
out='avatar-work/brooke/second-chance/brooke-head-3-0-facial-prototype.glb'
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_morph=True,export_morph_normal=True)
bpy.ops.object.select_all(action='DESELECT')
print('BROOKE_FACIAL_PROTOTYPE '+json.dumps({'output':out,'keys':list(keys),'vertices':len(verts),'bounds_min':mn,'bounds_max':mx,'status':'shape key channels created, no mouth deformation authored; requires facial landmark identification and visual validation'}))
