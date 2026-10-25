import bpy, json, math, os
from mathutils import Vector
path="avatar-work/brooke/second-chance/brooke-head-3-0.glb"
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=path)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
report={"source":path,"meshes":len(meshes),"vertices":sum(len(o.data.vertices) for o in meshes),"faces":sum(len(o.data.polygons) for o in meshes),"shape_keys":{o.name:list(o.data.shape_keys.key_blocks.keys()) if o.data.shape_keys else [] for o in meshes},"armatures":[o.name for o in bpy.context.scene.objects if o.type=='ARMATURE']}
if not meshes: raise RuntimeError("No meshes in Brooke Head 3.0")
bpy.ops.object.armature_add()
rig=bpy.context.object;rig.name="TEST_ONLY_Brooke_Head_Rig"
rig.data.bones[0].name="Head"
for obj in meshes:
 mod=obj.modifiers.new("TEST_ONLY_Head_Bone","ARMATURE");mod.object=rig
 group=obj.vertex_groups.new(name="Head");group.add(list(range(len(obj.data.vertices))),1.0,'REPLACE')
 rig.matrix_world.translation=Vector((0,0,0))
before=[tuple(v.co) for v in meshes[0].data.vertices[:min(10,len(meshes[0].data.vertices))]]
rig.pose.bones["Head"].rotation_mode='XYZ'
rig.pose.bones["Head"].rotation_euler[0]=math.radians(10)
bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get()
evaluated=meshes[0].evaluated_get(deps).to_mesh()
after=[tuple(v.co) for v in evaluated.vertices[:len(before)]]
report["rig_modifier_attached"]=True
report["deformation_test_changed_vertices"]=any(sum(abs(a-b) for a,b in zip(p,q))>1e-6 for p,q in zip(before,after))
report["note"]="Single-bone deformation only. Does not validate jaw/eye separation, facial expressions, or body rig compatibility."
print("BROOKE_RIG_TEST_RESULT "+json.dumps(report))
if not report["deformation_test_changed_vertices"]:raise RuntimeError("Head bone failed deformation test")
