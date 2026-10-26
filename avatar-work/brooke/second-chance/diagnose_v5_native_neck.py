"""Geometry probe for Brooke 3.1 V5; READ ONLY originals. No scene export or model mutation."""
import bpy,json,math
from mathutils import Vector,Matrix
P='avatar-work/brooke/second-chance/'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=P+'brooke-3-1-body-candidate.glb')
base=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.name.startswith('base'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
bones=rig.data.bones
for name in ['mixamorig:Head','mixamorig:Neck','mixamorig:Spine2']:
 b=bones[name]
 print('V5_BONE',json.dumps({'name':name,'head':list(rig.matrix_world@b.head_local),'tail':list(rig.matrix_world@b.tail_local)}))
print('V5_BODY',json.dumps({'base_name':base.name,'matrix':list(map(list,base.matrix_world)),'material_names':[m.name for m in base.data.materials],'verts':len(base.data.vertices),'uv_maps':[m.name for m in base.data.uv_layers]}))
hg=base.vertex_groups.get('mixamorig:Head')
pg=[base.vertex_groups.get(x) for x in ['mixamorig:LeftShoulder','mixamorig:RightShoulder','mixamorig:LeftArm','mixamorig:RightArm','mixamorig:Spine2','mixamorig:LeftForeArm','mixamorig:RightForeArm']]
def weight(v,g):return max([w.weight for w in v.groups if w.group==g.index] or [0])
ps=[(base.matrix_world@v.co,v) for v in base.data.vertices]
for lo in [1.25,1.30,1.35,1.40,1.43,1.46,1.49,1.52,1.55,1.58,1.62,1.66,1.70,1.75]:
 xs=[(p,v) for p,v in ps if lo<=p.z<lo+.03 and abs(p.x)<.22]
 if not xs:continue
 native=[(p,v) for p,v in xs if abs(p.x)<.14 and abs(p.y)<.14]
 rated=[(p,v) for p,v in xs if weight(v,hg)>.12 and not any(weight(v,g)>.10 for g in pg)]
 def stats(c):
  return {'n':len(c),'x':[round(min(x[0].x for x in c),3),round(max(x[0].x for x in c),3)] if c else [],'y':[round(min(x[0].y for x in c),3),round(max(x[0].y for x in c),3)] if c else []}
 print('V5_BODY_SECTION',json.dumps({'z':lo,'all':stats(xs),'native_center':stats(native),'head_candidate':stats(rated)}))
for m in base.data.materials:
 if m:
  imgs=[{'name':n.image.name,'size':list(n.image.size),'filepath':n.image.filepath} for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image] if m.use_nodes else []
  print('V5_BODY_MAT',json.dumps({'name':m.name,'rgba':list(m.diffuse_color),'images':imgs}))
bpy.ops.import_scene.gltf(filepath='3948-3d.glb')
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o!=base and len(o.data.vertices)>100000)
coords=[v.co for v in mesh.data.vertices]
for lo in [-.25,-.20,-.18,-.16,-.14,-.12,-.10,-.08,0,.10,.25,.40,.46]:
 c=[p for p in coords if lo<=p.y<lo+.02]
 if not c:continue
 front=[p for p in c if p.z>.12 and abs(p.x)<.22]
 rear=[p for p in c if p.z<.12 and abs(p.x)<.22]
 def bb(c):return {'n':len(c),'x':[round(min(p.x for p in c),3),round(max(p.x for p in c),3)] if c else [],'depth':[round(min(p.z for p in c),3),round(max(p.z for p in c),3)] if c else []}
 print('V5_SCAN_SECTION',json.dumps({'y':lo,'all':bb(c),'front':bb(front),'rear':bb(rear)}))
for m in mesh.data.materials:
 if m:
  print('V5_SCAN_MAT',json.dumps({'name':m.name,'images':[{'name':n.image.name,'size':list(n.image.size)} for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image] if m.use_nodes else []}))
print('V5_PROBE_COMPLETE')
