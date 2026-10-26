"""Brooke V5 hair-surface repair (working clone only).
Uses validated native-neck V5 as input, reduces tall hair wedge, replaces the
black/untextured rear scan region with a woven blonde hair material. Keeps
approved face UV, facial shapes, and source meshes unchanged.
"""
from pathlib import Path
import bpy, json, os, math
import numpy as np
from mathutils import Vector

builder=Path('avatar-work/brooke/second-chance/build_v5_owner_fit.py')
exec(compile(builder.read_text(),str(builder),'exec'),globals())
assert h.type=='MESH' and len(h.data.vertices)>100000
assert h.data.shape_keys and len(h.data.shape_keys.key_blocks)>=11
original_report=Path(REPORT)
old_report=json.loads(original_report.read_text())
assert old_report['source_hashes_unchanged'] and old_report['v5_native_neck_used']
assert abs(old_report['head_scale']-.357)<1e-8

# Lower just the top of the too-high photo wedge, maintaining head +2%.
# Apply identical deltas to Basis and all 10 facial keys to preserve expressions.
keys=list(h.data.shape_keys.key_blocks)
trimmed=0
max_trim=0.
for i,vertex in enumerate(h.data.vertices):
    p=to_canonical@vertex.co
    t=max(0.,min(1.,(p.y-.41)/.21))
    t=t*t*(3-2*t)
    taper=max(0.,1.-(p.x/.39)**2)**1.2
    trim=.077*t*taper
    if trim<.0002:continue
    offset=Th.to_3x3()@Vector((0,trim,0))
    vertex.co-=offset
    for key in keys: key.data[i].co-=offset
    trimmed+=1;max_trim=max(max_trim,trim)
h.data.update()
print('BROOKE_V5_HAIR_ROUNDING',json.dumps({'vertices_adjusted':trimmed,'max_source_trim':max_trim}))
assert trimmed>500 and max_trim>.03

# The scan contains almost-black/untextured polygons on the back, not blonde
# hair. Create a modest color-streaked reusable texture for the rear hair only.
w,ht=256,512
xx,yy=np.meshgrid(np.linspace(0,1,w,dtype=np.float32),np.linspace(0,1,ht,dtype=np.float32))
rng=np.random.default_rng(3948)
phase=rng.uniform(0,math.pi*2,size=(1,w)).astype(np.float32)
strands=(.5+.5*np.sin(xx*math.pi*130+phase+np.sin(yy*math.pi*6)*.4)).astype(np.float32)
wide=np.sin(xx*math.pi*23+yy*.75).astype(np.float32)
variation=.70+.18*strands+.09*wide+rng.normal(0,.025,(ht,w)).astype(np.float32)
rgba=np.stack((np.clip(.70*variation,0,1),
               np.clip(.54*variation,0,1),
               np.clip(.25*variation,0,1),
               np.ones_like(variation)),axis=-1).astype(np.float32)
image=bpy.data.images.new('Brooke_V5_Back_Hair_Wheat_Blonde_Texture',width=w,height=ht,alpha=True)
image.pixels.foreach_set(rgba.reshape(-1).tolist());image.update()
image.pack()
mat=bpy.data.materials.new('Brooke_V5_Photographic_Hair_Backfill')
mat.use_nodes=True
mat.diffuse_color=(.55,.43,.23,1)
bsdf=mat.node_tree.nodes.get('Principled BSDF')
assert bsdf is not None
bsdf.inputs['Roughness'].default_value=.83
tex=mat.node_tree.nodes.new('ShaderNodeTexImage')
tex.image=image;tex.interpolation='Linear'
mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
mat.use_backface_culling=False
h.data.materials.append(mat)
idx=len(h.data.materials)-1
assert h.data.uv_layers.active,'Photo-head original UV set missing'
uv=h.data.uv_layers.active.data
local=[to_canonical@v.co for v in h.data.vertices]
changed=0
for poly in h.data.polygons:
    p=sum((local[vi] for vi in poly.vertices),Vector())/len(poly.vertices)
    # Rearward hair only; preserve original front face, eyes, hairline, neck.
    if p.z<-.045 and p.y>-.16 and (p.y>-.035 or abs(p.x)>.115):
        poly.material_index=idx
        poly.use_smooth=True
        for li in poly.loop_indices:
            c=local[h.data.loops[li].vertex_index]
            uv[li].uv=((c.x+.52)/1.04, (c.y+.20)/.90)
        changed+=1
assert changed>2500, f'Back hair material selection too small: {changed}'
print('BROOKE_V5_HAIR_REAR_BACKFILL',json.dumps({'polygons':changed,'material_index':idx,'texture_size':[w,ht]}))

OUT=BASE+'brooke-3-1-v5-hair-surface-trial.glb'
REPORT=BASE+'brooke-3-1-v5-hair-surface-check.json'
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type in {'MESH','ARMATURE','EMPTY'}:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',use_selection=True,export_morph=True,export_skins=True)
report=dict(old_report)
report.update({'export_path':OUT,'export_bytes':os.path.getsize(OUT),
               'v5_hair_crown_trimmed_vertices':trimmed,
               'v5_hair_crown_max_source_trim':max_trim,
               'v5_rear_hair_polygons_textured':changed,
               'v5_rear_hair_texture_resolution':[w,ht],
               'v5_face_source_uv_retained':True,
               'not_verified':['head/neck watertight seam','real Samsung appearance',
                               'pose quality','skin color match','mouth cavity geometry']})
Path(REPORT).write_text(json.dumps(report,indent=2))
print('BROOKE_V5_HAIR_SURFACE_REPORT',json.dumps(report))
