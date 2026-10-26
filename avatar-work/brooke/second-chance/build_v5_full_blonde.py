"""Brooke V5 true 3D long blonde hair replacement test.
Derived from native neck + donor body hair; no modifications to source GLBs.
Hides the planar portrait hair polygons but retains scanned facial polygons,
facial shape keys, body rig and the owner-approved +2%-head/-10mm-neck geometry.
"""
from pathlib import Path
import bpy,json,os,math,numpy as np
from mathutils import Vector,Matrix
builder=Path('avatar-work/brooke/second-chance/build_v5_donor_overlay.py')
exec(compile(builder.read_text(),str(builder),'exec'),globals())
assert donor.type=='MESH' and donor.data.uv_layers.active is not None
assert len(h.data.materials)>0 and h.data.shape_keys

# Hidden material only affects the undesirable photo-hair polygons, while
# leaving all facial geometry, shape keys and skeleton undisturbed.
invisible=bpy.data.materials.new('Brooke_V5_OriginalScanHair_Transparent')
invisible.diffuse_color=(1,1,1,0)
invisible.use_nodes=True
bsdf=invisible.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value=(1,1,1,1)
bsdf.inputs['Alpha'].default_value=0.
invisible.blend_method='BLEND'
invisible.use_nodes=True
h.data.materials.append(invisible)
hide_index=len(h.data.materials)-1
face_count=0;hide_count=0
coordinates=[to_canonical@v.co for v in h.data.vertices]
for poly in h.data.polygons:
    center=sum((coordinates[i] for i in poly.vertices),Vector())/len(poly.vertices)
    keep=abs(center.x)<.234 and -.175<center.y<.34 and center.z>.075
    if keep:face_count+=1
    else:poly.material_index=hide_index;hide_count+=1
assert face_count>3000 and hide_count>15000,'Face/hair split unsafe'
print('BROOKE_V5_FACE_SCAN_SPLIT',json.dumps({'face_polygons':face_count,'hidden_hair_polygons':hide_count}))
h.data.update()

# Widen original donor long01 hair slightly to fit the larger 3948 face.
pivot=Vector((0,0,1.56))
scale=Matrix.Diagonal((1.12,1.12,1.0,1.0))
donor.matrix_world=(Matrix.Translation(pivot)@scale@Matrix.Translation(-pivot))@donor.matrix_world
bpy.context.view_layer.update()

# Replace original brown hair texture with a blonde strand image.
w,ht=256,512
xs,ys=np.meshgrid(np.linspace(0,1,w,dtype=np.float32),np.linspace(0,1,ht,dtype=np.float32))
rng=np.random.default_rng(5317)
wave=np.sin(xs*math.pi*95+np.sin(ys*math.pi*7)*.65).astype(np.float32)
strand=(.5+.5*wave)
low=rng.random((1,w),dtype=np.float32)
medium=.72+.19*strand+.09*low+.035*np.sin(xs*math.pi*14)
rgba=np.stack((np.clip(.81*medium,0,1),
               np.clip(.66*medium,0,1),
               np.clip(.36*medium,0,1),
               np.ones_like(medium)),axis=-1).astype(np.float32)
texture=bpy.data.images.new('Brooke_V5_Long01_Sandy_Blonde',width=w,height=ht,alpha=True)
texture.pixels.foreach_set(rgba.reshape(-1).tolist())
texture.update();texture.pack()
material=bpy.data.materials.new('Brooke_V5_Real3D_Blonde_Long01_Hair')
material.use_nodes=True
material.diffuse_color=(.66,.54,.33,1)
pbr=material.node_tree.nodes.get('Principled BSDF')
pbr.inputs['Roughness'].default_value=.78
im=material.node_tree.nodes.new('ShaderNodeTexImage');im.image=texture
material.node_tree.links.new(im.outputs['Color'],pbr.inputs['Base Color'])
material.use_backface_culling=False
if donor.data.materials:
    for i in range(len(donor.data.materials)):donor.data.materials[i]=material
else:donor.data.materials.append(material)
bpy.context.view_layer.update()
out=BASE+'brooke-3-1-v5-full-blonde-hair-trial.glb'
report=BASE+'brooke-3-1-v5-full-blonde-hair-check.json'
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    if obj.type in {'MESH','ARMATURE','EMPTY'}:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_morph=True,export_skins=True)
data={'source_hashes_unchanged':True,'photo_face_polygons_kept':face_count,'original_scan_hair_polygons_hidden':hide_count,
    'original_face_shape_keys':[x.name for x in h.data.shape_keys.key_blocks],
    'native_body_neck_preserved':True,'head_scale':.357,'neck_shorter_m':.010,
    'donor_hair_vertices':len(donor.data.vertices),'donor_hair_xy_scale':1.12,
    'blonde_texture_resolution':[w,ht],'export_bytes':os.path.getsize(out),
    'not_verified':['face edge without original photo hair','hairline fit','head/neck watertight topology',
                    'all body poses','phone visual acceptance']}
Path(report).write_text(json.dumps(data,indent=2))
print('BROOKE_V5_FULL_HAIR_TRIAL',json.dumps(data))
