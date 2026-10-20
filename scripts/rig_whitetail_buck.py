"""Experimental automatic quadruped armature for the uploaded whitetail buck.
Run: blender -b -P scripts/rig_whitetail_buck.py -- INPUT.glb OUTPUT.glb
Does not overwrite the original; inspect deformation before game integration.
"""
import bpy, sys, math
from mathutils import Vector
argv=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
if len(argv)!=2: raise SystemExit("Usage: blender -b -P scripts/rig_whitetail_buck.py -- input.glb output.glb")
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=argv[0])
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes: raise RuntimeError("No mesh in GLB")
# Retain the source appearance and hierarchy; add a new dedicated rig.
bounds=[o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo=Vector(tuple(min(v[i] for v in bounds) for i in range(3)))
hi=Vector(tuple(max(v[i] for v in bounds) for i in range(3)))
size=hi-lo
# Deer is expected to face approximately +X, with Z vertical.
# Require a conventional axis layout instead of silently deforming a rotated asset.
if size.z < .3*max(size.x,size.y): raise RuntimeError("Unexpected deer orientation; rig not applied")
cx=(lo.x+hi.x)/2; cy=(lo.y+hi.y)/2
def pt(x,y,z): return (lo.x+size.x*x,lo.y+size.y*y,lo.z+size.z*z)
bpy.ops.object.armature_add(enter_editmode=True)
rig=bpy.context.object; rig.name='Whitetail_NewRig'; arm=rig.data
arm.edit_bones.remove(arm.edit_bones[0])
spec=[
 ('pelvis',None,pt(.38,.5,.62),pt(.48,.5,.63)),
 ('spine','pelvis',pt(.48,.5,.63),pt(.66,.5,.65)),
 ('chest','spine',pt(.66,.5,.65),pt(.75,.5,.69)),
 ('neck','chest',pt(.75,.5,.69),pt(.84,.5,.82)),
 ('head','neck',pt(.84,.5,.82),pt(.94,.5,.85)),
 ('jaw','head',pt(.93,.5,.81),pt(.99,.5,.79)),
 ('tail','pelvis',pt(.37,.5,.65),pt(.27,.5,.67)),
]
for side,y in [('L',.3),('R',.7)]:
 for prefix,x in [('front',.73),('rear',.37)]:
  hip=pt(x,y,.63); knee=pt(x+(.03 if prefix=='rear' else -.02),y,.36)
  ankle=pt(x+(.01 if prefix=='rear' else -.03),y,.12); toe=pt(x+.04,y,.055)
  parent='chest' if prefix=='front' else 'pelvis'
  spec += [(f'{prefix}_{side}_upper',parent,hip,knee),
           (f'{prefix}_{side}_lower',f'{prefix}_{side}_upper',knee,ankle),
           (f'{prefix}_{side}_hoof',f'{prefix}_{side}_lower',ankle,toe)]
for name,parent,head,tail in spec:
 b=arm.edit_bones.new(name);b.head=head;b.tail=tail;b.use_connect=False
 if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
# Assign mesh vertex weights by proximity to bone line segments, favoring the
# closest two segments. This is a starting rig, NOT validated anatomical skinning.
segments=[(name,Vector(a),Vector(b)) for name,_,a,b in spec]
for obj in meshes:
 if obj.find_armature(): continue
 groups={name:obj.vertex_groups.new(name=name) for name,_,_,_ in spec}
 inv=obj.matrix_world
 for v in obj.data.vertices:
  p=inv @ v.co
  distances=[]
  for name,a,b in segments:
   d=b-a; t=max(0,min(1,(p-a).dot(d)/max(d.length_squared,1e-9)))
   distances.append(((p-(a+d*t)).length,name))
  distances.sort()
  picks=distances[:2]; weights=[1/max(d,.015)**4 for d,_ in picks]; total=sum(weights)
  for (d,name),w in zip(picks,weights):groups[name].add([v.index],w/total,'REPLACE')
 mod=obj.modifiers.new('Whitetail skin','ARMATURE');mod.object=rig
 obj.parent=rig;obj.matrix_parent_inverse=rig.matrix_world.inverted()
bpy.ops.export_scene.gltf(filepath=argv[1],export_format='GLB',export_animations=True)
print('Created experimental whitetail rig:',len(spec),'bones; output',argv[1])
