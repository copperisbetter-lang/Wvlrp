"""Bethany Stage 8 — incremental MPFB2 native facial morph from verified Stage 7.
Real MakeHuman body and original rig; never overwrite the Stage 7 source.
This remains a visual-review candidate, not an approved likeness percentage.
"""
import bpy, os, json, math, struct, numpy as np
from pathlib import Path
from mathutils import Vector
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService

STAGE7=Path(os.environ.get('BETHANY_STAGE7_DIR','/tmp/bethany-stage7'))
OUT=Path(__file__).resolve().parents[1]/'assets'/'bethany-face-stage8'
OUT.mkdir(parents=True,exist_ok=True)
sources=list(STAGE7.rglob('Bethany_EDITABLE_MPFB_STAGE7.blend'))
if len(sources)!=1:raise RuntimeError('Stage 7 native editable source missing/ambiguous: '+str(sources))
source=sources[0]
source_glb=source.with_name('Bethany_STAGE7.glb')
if not source_glb.is_file():raise RuntimeError('Stage7 genuine GLB missing')
bpy.ops.wm.open_mainfile(filepath=str(source))
h=bpy.data.objects.get('BIRTHDAY GIRL 18 - native MPFB editable master')
if not h or h.type!='MESH' or len(h.data.vertices)<10000:
    raise RuntimeError('Missing original native MakeHuman basemesh')
if not h.data.shape_keys:raise RuntimeError('Native MPFB targets absent')
shapes=h.data.shape_keys.key_blocks
before={k.name:float(k.value) for k in shapes}
if len(before)<56:raise RuntimeError('Stage 7 lost native morphs: '+str(len(before)))
armatures=[o for o in bpy.data.objects if o.type=='ARMATURE']
if not armatures:raise RuntimeError('Source armature missing')

# Stage 7 front/profile comparison: face soft oval in the reference, wider
# almond eyes, gently tapered chin, natural nose and fuller smiling lips.
# Small, individually reversible changes. All names already exist in Stage7.
target={
    # Stage 8: first decisive reference-proportion trial, using ONLY existing
    # original MPFB2 shape keys. Not an approval or a likeness percentage.
    # Target: almond eye silhouette; higher cheek definition; narrower/shorter
    # jaw and chin; narrower nose tip; shorter forehead; slimmer mouth width
    # with defined upper/lower lips. Keep bilateral weights identical.
    'head-round':0.010,
    'head-oval':0.850,
    'head-fat-incr':0.015,
    'l-cheek-volume-incr':0.420,'r-cheek-volume-incr':0.420,
    'l-cheek-bones-decr':0.000,'r-cheek-bones-decr':0.000,
    'chin-width-decr':0.880,
    'chin-height-decr':0.355,
    'chin-prominent-decr':0.275,
    'l-eye-scale-incr':0.025,'r-eye-scale-incr':0.025,
    'l-eye-height1-incr':0.000,'r-eye-height1-incr':0.000,
    'l-eye-trans-in':0.095,'r-eye-trans-in':0.095,
    'l-eye-bag-decr':0.215,'r-eye-bag-decr':0.215,
    'l-eye-corner1-up':0.200,'r-eye-corner1-up':0.200,
    'l-eye-corner2-up':0.240,'r-eye-corner2-up':0.240,
    'nose-scale-horiz-decr':0.320,
    'nose-point-width-decr':0.245,
    'nose-scale-depth-decr':0.125,
    'nose-point-up':0.070,
    'nose-hump-decr':0.290,
    'mouth-scale-horiz-decr':0.235,
    'mouth-upperlip-volume-incr':0.675,
    'mouth-lowerlip-volume-incr':0.710,
    'mouth-cupidsbow-incr':0.405,
    'mouth-angles-up':0.135,
    'eyebrows-angle-up':0.085,
    'forehead-scale-vert-decr':0.205,
}
missing=[k for k in target if k not in shapes]
if missing:raise RuntimeError('Stage7 lost proven MPFB target names: '+str(missing))
# Reject implausible or asymmetric sliders BEFORE touching the mesh.
if any(v<0 or v>1 for v in target.values()):
    raise RuntimeError('Stage8 shape weight outside native 0..1 range')
for name,value in target.items():
    if name.startswith('l-'):
        other='r-'+name[2:]
        if other in target and abs(value-target[other])>1e-8:
            raise RuntimeError('Stage8 bilateral controls are asymmetric: '+name)

bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get()
ev=h.evaluated_get(deps)
tmp=ev.to_mesh()
pre_coords=np.array([v.co[:] for v in tmp.vertices],dtype=np.float64)
ev.to_mesh_clear()
for name,value in target.items(): shapes[name].value=value
bpy.context.view_layer.update()
deps.update()
ev=h.evaluated_get(deps)
tmp=ev.to_mesh()
post_coords=np.array([v.co[:] for v in tmp.vertices],dtype=np.float64)
ev.to_mesh_clear()
if pre_coords.shape!=post_coords.shape:raise RuntimeError('Native mesh vertex count changed')
changes=np.linalg.norm(post_coords-pre_coords,axis=1)
if np.max(changes)<0.0015:raise RuntimeError('Stage8 made no meaningful actual geometry change')
for name,value in target.items():
    if abs(shapes[name].value-value)>1e-5:raise RuntimeError('MPFB shape update failed: '+name)
print('BETHANY_STAGE8_NATIVE_MORPHS',len(shapes),'CHANGED',len(target))
print('BETHANY_STAGE8_GEOMETRY_DELTA_METERS max',float(changes.max()),'mean',float(changes.mean()),
      'moved_gt_0p1mm',int((changes>0.0001).sum()))

# Stage7 may contain packed images with stale external paths in a new runner.
# Repair only unavailable image node pixels from the verified Stage7 GLB.
raw=source_glb.read_bytes()
if raw[:4]!=b'glTF':raise RuntimeError('Stage7 GLB header invalid')
n,typ=struct.unpack_from('<II',raw,12)
if typ!=0x4e4f534a:raise RuntimeError('Stage7 GLB JSON invalid')
doc=json.loads(raw[20:20+n])
offset=20+((n+3)//4)*4
binary_length,binary_kind=struct.unpack_from('<II',raw,offset)
if binary_kind!=0x004e4942:raise RuntimeError('Stage7 embedded texture binary missing')
offset+=8
texture_families=('warm_skin','eyebrow001','eyelashes01','brown_eye','long01')
recovered={}
seen={k:0 for k in texture_families}
cache=Path('/tmp/bethany-stage8-images');cache.mkdir(exist_ok=True)
def recover(family):
    hits=[i for i in doc.get('images',[]) if family in i.get('name','').lower()]
    if not hits:raise RuntimeError('Stage7 GLB image absent for '+family)
    info=hits[0]
    view=doc['bufferViews'][info['bufferView']]
    data=raw[offset+view.get('byteOffset',0):offset+view.get('byteOffset',0)+view['byteLength']]
    ext='png' if data.startswith(bytes.fromhex('89504e470d0a1a0a')) else ('jpg' if data.startswith(bytes.fromhex('ffd8ff')) else None)
    if not ext:raise RuntimeError('Invalid Stage7 embedded image '+family)
    dst=cache/('bethany5_'+family+'.'+ext)
    dst.write_bytes(data)
    im=bpy.data.images.load(str(dst),check_existing=False)
    im.name='BethanyStage8_Restored_'+family
    # Blender 4.2 lazily loads pixel buffers: has_data may still be false
    # immediately after bpy.data.images.load even for a valid embedded PNG.
    # Force pixel decode before packing and checking availability.
    if min(im.size)<16:raise RuntimeError('Invalid Stage7 image dimensions '+family)
    pixel_sample=float(im.pixels[0])
    im.pack()
    if not im.packed_file or min(im.size)<16:
        raise RuntimeError('Stage7 image could not be decoded/packed '+family)
    print('BETHANY_STAGE8_IMAGE_RECOVERED',family,list(im.size),pixel_sample)
    return im
for ob in bpy.data.objects:
    if ob.type!='MESH':continue
    for mat in ob.data.materials:
        if not mat or not mat.use_nodes:continue
        for node in mat.node_tree.nodes:
            if node.type!='TEX_IMAGE' or not node.image:continue
            name=node.image.name.lower()
            key=next((k for k in texture_families if k in name),None)
            if key:
                if not node.image.has_data:
                    if key not in recovered:recovered[key]=recover(key)
                    node.image=recovered[key]
                # A packed image can be valid even when has_data is initially
                # false in Blender background mode. Trigger its lazy pixels first.
                if not node.image.has_data:
                    _=float(node.image.pixels[0])
                if not node.image.packed_file:node.image.pack()
                if not node.image.packed_file:
                    raise RuntimeError('Texture image was not packed '+name)
                seen[key]+=1
if any(x==0 for x in seen.values()):raise RuntimeError('Critical skin/eye/brow/hair material missing '+str(seen))
print('BETHANY_STAGE8_TEXTURE_FAMILIES',seen,'RECOVERED',list(recovered))

h['birthgirl_stage']='Stage8 isolated native MakeHuman/MPFB2 likeness trial, visual approval pending'
h['birthgirl_parent']='Bethany_EDITABLE_MPFB_STAGE7.blend'
h['birthgirl_approval']='NOT APPROVED; comparison required against original saved montage'
h['birthgirl_reference_library_path']='/The Wild/Character References/Birthday Girl 18/Blonde Character Study Montage.png'
blend=OUT/'Bethany_EDITABLE_MPFB_STAGE8.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
if not blend.is_file() or blend.stat().st_size<1000000:raise RuntimeError('Stage8 editable project missing')
root=ExportService.create_character_copy(h,name_suffix='_bethany_stage8_export')
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,'Basemesh')
if not body or len(body.data.vertices)<10000:raise RuntimeError('Exported MakeHuman native body lost')
ExportService.bake_modifiers_remove_helpers(body,bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
for mod in list(body.modifiers):
    if mod.type=='MASK':body.modifiers.remove(mod)
chosen=[root]+list(root.children_recursive)
bpy.ops.object.select_all(action='DESELECT')
for ob in chosen:ob.select_set(True)
bpy.context.view_layer.objects.active=root
glb=OUT/'Bethany_STAGE8.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_materials='EXPORT')
if glb.stat().st_size<1000000:raise RuntimeError('Stage8 GLB export missing')
for ob in [h]+list(h.children_recursive):ob.hide_render=True
for ob in chosen:ob.hide_render=False
scene=bpy.context.scene
world=bpy.data.worlds.new('Bethany Stage8 neutral lighting')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.34,.36,.38,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.51
scene.world=world
scene.view_settings.view_transform='AgX'
scene.view_settings.exposure=-.34
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=640
scene.render.resolution_y=720
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
for xyz,energy,size in [((1.6,-2.6,3.05),340,4.0),((-1.9,-.4,2.8),150,3.5)]:
    lamp=bpy.data.lights.new('Bethany Stage8 softbox','AREA')
    lamp.energy=energy;lamp.size=size
    obj=bpy.data.objects.new('Bethany Stage8 softbox',lamp)
    bpy.context.collection.objects.link(obj)
    obj.location=xyz
    obj.rotation_euler=(Vector((0,0,1.55))-obj.location).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.cameras.new('Bethany Stage8 orthographic face QA')
camera=bpy.data.objects.new('Bethany Stage8 orthographic face QA',cam)
bpy.context.collection.objects.link(camera)
scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=.62
pts=[body.matrix_world @ v.co for v in body.data.vertices]
z=max(v.z for v in pts)-.105*(max(v.z for v in pts)-min(v.z for v in pts))
for name,loc in [('front',(0,-3,z)),('left',(3,0,z)),('right',(-3,0,z)),('threequarter',(2.1,-2.1,z))]:
    camera.location=loc
    camera.rotation_euler=(Vector((0,0,z))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('bethany_stage8_'+name+'.png'))
    bpy.ops.render.render(write_still=True)
report={
 'character':'Bethany (formerly Birthday Girl 18)',
 'parent_stage':'Verified isolated Stage7 Actions run 41231352191; NO parent files overwritten',
 'source_blend':source.name,'source_glb':source_glb.name,
 'native_shape_count':len(shapes),
 'changed_native_controls':target,
 'previous_control_values':{k:before[k] for k in target},
 'evaluated_geometry_max_displacement_m':float(changes.max()),
 'evaluated_geometry_mean_displacement_m':float(changes.mean()),
 'vertices_moved_more_than_0p1mm':int((changes>.0001).sum()),
 'exported_glb_bytes':glb.stat().st_size,
 'material_families_verified':seen,
 'reference_basis':'Approved Blonde Character Study Montage: frontal and profile; ordinal landmark targets only, not calibrated absolute dimensions',
 'reference_constraints':{
   'eye_silhouette':'smaller vertical opening and raised outer corners for less circular appearance',
   'lower_face':'reduce chin width/height and forehead height toward shorter oval face',
   'nose':'slimmer alar width and tip in frontal/profile',
   'mouth':'narrow mouth width but increase lip shape definition',
   'bilateral_symmetry':'identical left/right native MPFB weights',
 },
 'min_required_max_movement_m':0.0015,
 'comparison_baseline':'Stage7 front/left/right/threequarter images and approved reference montage',
 'visual_likeness_percent':None,
 'owner_approval':False,
 'target_features':'Stage8: less-round almond eyes, tapered lower face, slightly fuller lips and restrained nose correction; hair and texture untouched',
 'source_preservation':'Stage1–7 and live viewer remain untouched; this is an isolated Stage8 trial',
}
(OUT/'bethany_stage8_report.json').write_text(json.dumps(report,indent=2))
print('BETHANY_STAGE8_SUCCESS',blend,glb)
