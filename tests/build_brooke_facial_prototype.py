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
# Experimental localized deformation based on estimated facial front and lower-face coordinates.
# This is a feasibility prototype, not an anatomically validated rig.
# Determine vertical axis from the bounding-box largest extent (likely Z on source mesh).
up=max(range(3),key=lambda i:span[i])
side=0 if up!=0 else 1
depth=next(i for i in range(3) if i not in (up,side))
# Facial features are approximated around the lower middle of the bounding box.
mouth_height=mn[up]+span[up]*0.37
mouth_halfwidth=span[side]*0.19
vertical_radius=span[up]*0.095
depth_mid=mid[depth]
# Only influence the forward-facing half, while leaving the rear head unaffected.
for idx,v in enumerate(verts):
 p=v.co
 dx=(p[side]-mid[side])/max(mouth_halfwidth,1e-6)
 dy=(p[up]-mouth_height)/max(vertical_radius,1e-6)
 mask=max(0.0,1.0-abs(dx)/1.6)**2*max(0.0,1.0-abs(dy)/1.8)**2
 if p[depth]<depth_mid:mask*=0.3
 if mask<1e-5:continue
 corner=min(1.0,abs(dx))
 lower=max(0.0,-dy)
 upper=max(0.0,dy)
 # Relaxed reduces upward corner tension from an existing smile.
 keys['Relaxed'].data[idx].co[up]-=0.014*mask*corner
 keys['Smile'].data[idx].co[up]+=0.022*mask*corner
 keys['Smile_Left'].data[idx].co[up]+=0.022*mask*corner*(1 if dx<0 else 0)
 keys['Smile_Right'].data[idx].co[up]+=0.022*mask*corner*(1 if dx>0 else 0)
 keys['Jaw_Open'].data[idx].co[up]-=0.038*mask*lower
 keys['Lips_Part'].data[idx].co[up]+=(0.012 if dy>=0 else -0.012)*mask
 keys['Lips_Round_O'].data[idx].co[side]-=(p[side]-mid[side])*0.20*mask
 keys['Lips_Round_O'].data[idx].co[depth]+=0.012*mask
for k in keys.values():k.value=0
out='avatar-work/brooke/second-chance/brooke-head-3-0-facial-prototype.glb'
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_morph=True,export_morph_normal=True)
bpy.ops.object.select_all(action='DESELECT')
print('BROOKE_FACIAL_PROTOTYPE '+json.dumps({'output':out,'keys':list(keys),'vertices':len(verts),'bounds_min':mn,'bounds_max':mx,'status':'experimental nonzero facial morphs generated; requires visual validation of axis, mouth region, and deformation quality'}))
