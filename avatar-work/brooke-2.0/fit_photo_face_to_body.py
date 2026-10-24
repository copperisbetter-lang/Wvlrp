"""Candidate: fit a photo face surface to existing Brooke 2.0 body. Never edits Sophie 1."""
import bpy,sys
from mathutils import Vector
from pathlib import Path
body,photo,out=sys.argv[sys.argv.index('--')+1:][:3]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=body)
original=set(bpy.context.scene.objects)
heads=[o for o in original if o.type=='MESH' and ('head' in o.name.lower() or 'face' in o.name.lower()) and not any(t in o.name.lower() for t in ('hair','eye','lash','teeth','tongue'))]
assert heads,'Cannot identify head mesh: '+str([o.name for o in original if o.type=='MESH'])
# Choose largest head-like mesh; GLB imports may have multiple face-related accessories.
heads.sort(key=lambda o: len(o.data.vertices),reverse=True)
head=heads[0]
print('SELECTED_BODY_HEAD',head.name,len(head.data.vertices))
def bbox(o):
 p=[o.matrix_world@Vector(v) for v in o.bound_box]
 return Vector([min(q[i] for q in p) for i in range(3)]),Vector([max(q[i] for q in p) for i in range(3)])
lo,hi=bbox(head)
assert hi.z-lo.z>.06,'Head bounding box too small'
bpy.ops.import_scene.gltf(filepath=photo)
new=[o for o in bpy.context.scene.objects if o not in original and o.type=='MESH']
assert len(new)==1,'Photo face must contain exactly one mesh'
face=new[0];face.name='Brooke20_Photo_Face_CANDIDATE'
face.rotation_euler=(1.57079632679,0,0)
bpy.context.view_layer.update()
a,b=bbox(face);sz=b-a;hs=hi-lo
scale=min(hs.x/max(sz.x,1e-6)*.95,hs.z/max(sz.z,1e-6)*.91)
face.scale=(scale,)*3
bpy.context.view_layer.update()
a,b=bbox(face);mid=(a+b)*.5;hm=(lo+hi)*.5
face.location.x+=hm.x-mid.x
face.location.z+=hi.z-b.z+hs.z*.035
face.location.y+=lo.y-a.y+hs.x*.012
# Keep original head and all body meshes; candidate overlay only.
bpy.context.view_layer.update()
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_animations=True,export_morph=True)
assert Path(out).stat().st_size>10000
print('BODY_AND_PHOTO_FACE_CANDIDATE',out,'body_meshes',len(original),'original_head',head.name)
