import bpy,json
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath='avatar-work/brooke/second-chance/brooke-head-3-0.glb')
report={'meshes':[]}
for o in [x for x in bpy.context.scene.objects if x.type=='MESH']:
 v=o.data.vertices
 mins=[min(p.co[i] for p in v) for i in range(3)]
 maxs=[max(p.co[i] for p in v) for i in range(3)]
 mats=[{'name':m.name,'alpha':m.diffuse_color[3]} for m in o.data.materials if m]
 report['meshes'].append({'name':o.name,'vertices':len(v),'bounds_min':mins,'bounds_max':maxs,'materials':mats[:30],'shape_keys':list(o.data.shape_keys.key_blocks.keys()) if o.data.shape_keys else [],'vertex_groups':[g.name for g in o.vertex_groups],'loose_parts':'not evaluated'})
print('BROOKE_MOUTH_DIAGNOSTIC '+json.dumps(report))
