"""Bethany Stage 6 — incremental MPFB2 native facial morph from verified Stage 5.
Real MakeHuman body and original rig; never overwrite the Stage 5 source.
This remains a visual-review candidate, not an approved likeness percentage.
"""
import bpy, os, json, math, struct, numpy as np
from pathlib import Path
from mathutils import Vector
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService

STAGE5=Path(os.environ.get('BETHANY_STAGE5_DIR','/tmp/bethany-stage5'))
OUT=Path(__file__).resolve().parents[1]/'assets'/'bethany-face-stage6'
OUT.mkdir(parents=True,exist_ok=True)
sources=list(STAGE5.rglob('Bethany_EDITABLE_MPFB_STAGE5.blend'))
if len(sources)!=1:raise RuntimeError('Stage 5 native editable source missing/ambiguous: '+str(sources))
source=sources[0]
source_glb=source.with_name('Bethany_STAGE5.glb')
if not source_glb.is_file():raise RuntimeError('Stage5 genuine GLB missing')
bpy.ops.wm.open_mainfile(filepath=str(source))
h=bpy.data.objects.get('BIRTHDAY GIRL 18 - native MPFB editable master')
if not h or h.type!='MESH' or len(h.data.vertices)<10000:
    raise RuntimeError('Missing original native MakeHuman basemesh')
if not h.data.shape_keys:raise RuntimeError('Native MPFB targets absent')
shapes=h.data.shape_keys.key_blocks
before={k.name:float(k.value) for k in shapes}
if len(before)<56:raise RuntimeError('Stage 5 lost native morphs: '+str(len(before)))
armatures=[o for o in bpy.data.objects if o.type=='ARMATURE']
if not armatures:raise RuntimeError('Source armature missing')

# Stage 5 front/profile comparison: face soft oval in the reference, wider
# almond eyes, gently tapered chin, natural nose and fuller smiling lips.
# Small, individually reversible changes. All names already exist in Stage5.
target={
    # Stage5 renders retain a doll-like eye opening and pinched lower face.
    # Back off eye enlargement; relax chin taper while retaining soft oval.
    'head-round':0.055,
    'head-oval':0.520,
    'head-fat-incr':0.042,
    'l-cheek-volume-incr':0.300,'r-cheek-volume-incr':0.300,
    'chin-width-decr':0.445,
    'chin-height-decr':0.095,
    'chin-prominent-decr':0.115,
    'l-eye-scale-incr':0.135,'r-eye-scale-incr':0.135,
    'l-eye-height1-incr':0.046,'r-eye-height1-incr':0.046,
    'l-eye-trans-in':0.081,'r-eye-trans-in':0.081,
    'l-eye-bag-decr':0.100,'r-eye-bag-decr':0.100,
    'l-eye-corner1-up':0.025,'r-eye-corner1-up':0.025,
    'l-eye-corner2-up':0.028,'r-eye-corner2-up':0.028,
    'nose-scale-horiz-decr':0.101,
    'nose-point-width-decr':0.061,
    'nose-point-up':0.020,
    'nose-hump-decr':0.140,
    'mouth-upperlip-volume-incr':0.310,
    'mouth-lowerlip-volume-incr':0.350,
    'mouth-cupidsbow-incr':0.165,
    'mouth-angles-up':0.088,
    'eyebrows-angle-up':0.032,
}
missing=[k for k in target if k not in shapes]
if missing:raise RuntimeError('Stage5 lost proven MPFB target names: '+str(missing))
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
if np.max(changes)<0.00002:raise RuntimeError('Stage6 made no meaningful actual geometry change')
for name,value in target.items():
    if abs(shapes[name].value-value)>1e-5:raise RuntimeError('MPFB shape update failed: '+name)
print('BETHANY_STAGE6_NATIVE_MORPHS',len(shapes),'CHANGED',len(target))
print('BETHANY_STAGE6_GEOMETRY_DELTA_METERS max',float(changes.max()),'mean',float(changes.mean()),
      'moved_gt_0p1mm',int((changes>0.0001).sum()))

# Stage5 may contain packed images with stale external paths in a new runner.
# Repair only unavailable image node pixels from the verified Stage5 GLB.
raw=source_glb.read_bytes()
if raw[:4]!=b'glTF':raise RuntimeError('Stage5 GLB header invalid')
n,typ=struct.unpack_from('<II',raw,12)
if typ!=0x4e4f534a:raise RuntimeError('Stage5 GLB JSON invalid')
doc=json.loads(raw[20:20+n])
offset=20+((n+3)//4)*4
binary_length,binary_kind=struct.unpack_from('<II',raw,offset)
if binary_kind!=0x004e4942:raise RuntimeError('Stage5 embedded texture binary missing')
offset+=8
texture_families=('warm_skin','eyebrow001','eyelashes01','brown_eye','long01')
recovered={}
seen={k:0 for k in texture_families}
cache=Path('/tmp/bethany-stage6-images');cache.mkdir(exist_ok=True)
def recover(family):
    hits=[i for i in doc.get('images',[]) if family in i.get('name','').lower()]
    if not hits:raise RuntimeError('Stage5 GLB image absent for '+family)
    info=hits[0]
    view=doc['bufferViews'][info['bufferView']]
    data=raw[offset+view.get('byteOffset',0):offset+view.get('byteOffset',0)+view['byteLength']]
    ext='png' if data.startswith(bytes.fromhex('89504e470d0a1a0a')) else ('jpg' if data.startswith(bytes.fromhex('ffd8ff')) else None)
    if not ext:raise RuntimeError('Invalid Stage5 embedded image '+family)
    dst=cache/('bethany5_'+family+'.'+ext)
    dst.write_bytes(data)
    im=bpy.data.images.load(str(dst),check_existing=False)
    im.name='BethanyStage6_Restored_'+family
    # Blender 4.2 lazily loads pixel buffers: has_data may still be false
    # immediately after bpy.data.images.load even for a valid embedded PNG.
    # Force pixel decode before packing and checking availability.
    if min(im.size)<16:raise RuntimeError('Invalid Stage5 image dimensions '+family)
    pixel_sample=float(im.pixels[0])
    im.pack()
    if not im.packed_file or min(im.size)<16:
        raise RuntimeError('Stage5 image could not be decoded/packed '+family)
    print('BETHANY_STAGE6_IMAGE_RECOVERED',family,list(im.size),pixel_sample)
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
print('BETHANY_STAGE6_TEXTURE_FAMILIES',seen,'RECOVERED',list(recovered))

h['birthgirl_stage']='Stage6 isolated native MakeHuman/MPFB2 likeness trial, visual approval pending'
h['birthgirl_parent']='Bethany_EDITABLE_MPFB_STAGE5.blend'
h['birthgirl_approval']='NOT APPROVED; comparison required against original saved montage'
h['birthgirl_reference_library_path']='/The Wild/Character References/Birthday Girl 18/Blonde Character Study Montage.png'
blend=OUT/'Bethany_EDITABLE_MPFB_STAGE6.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
if not blend.is_file() or blend.stat().st_size<1000000:raise RuntimeError('Stage6 editable project missing')
root=ExportService.create_character_copy(h,name_suffix='_bethany_stage6_export')
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,'Basemesh')
if not body or len(body.data.vertices)<10000:raise RuntimeError('Exported MakeHuman native body lost')
ExportService.bake_modifiers_remove_helpers(body,bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
for mod in list(body.modifiers):
    if mod.type=='MASK':body.modifiers.remove(mod)
chosen=[root]+list(root.children_recursive)
bpy.ops.object.select_all(action='DESELECT')
for ob in chosen:ob.select_set(True)
bpy.context.view_layer.objects.active=root
glb=OUT/'Bethany_STAGE6.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_materials='EXPORT')
if glb.stat().st_size<1000000:raise RuntimeError('Stage6 GLB export missing')
for ob in [h]+list(h.children_recursive):ob.hide_render=True
for ob in chosen:ob.hide_render=False
scene=bpy.context.scene
world=bpy.data.worlds.new('Bethany Stage6 neutral lighting')
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
    lamp=bpy.data.lights.new('Bethany Stage6 softbox','AREA')
    lamp.energy=energy;lamp.size=size
    obj=bpy.data.objects.new('Bethany Stage6 softbox',lamp)
    bpy.context.collection.objects.link(obj)
    obj.location=xyz
    obj.rotation_euler=(Vector((0,0,1.55))-obj.location).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.cameras.new('Bethany Stage6 orthographic face QA')
camera=bpy.data.objects.new('Bethany Stage6 orthographic face QA',cam)
bpy.context.collection.objects.link(camera)
scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=.62
pts=[body.matrix_world @ v.co for v in body.data.vertices]
z=max(v.z for v in pts)-.105*(max(v.z for v in pts)-min(v.z for v in pts))
for name,loc in [('front',(0,-3,z)),('left',(3,0,z)),('right',(-3,0,z)),('threequarter',(2.1,-2.1,z))]:
    camera.location=loc
    camera.rotation_euler=(Vector((0,0,z))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('bethany_stage6_'+name+'.png'))
    bpy.ops.render.render(write_still=True)
report={
 'character':'Bethany (formerly Birthday Girl 18)',
 'parent_stage':'Verified isolated Stage5 Actions run 41230565781; NO parent files overwritten',
 'source_blend':source.name,'source_glb':source_glb.name,
 'native_shape_count':len(shapes),
 'changed_native_controls':target,
 'previous_control_values':{k:before[k] for k in target},
 'evaluated_geometry_max_displacement_m':float(changes.max()),
 'evaluated_geometry_mean_displacement_m':float(changes.mean()),
 'vertices_moved_more_than_0p1mm':int((changes>.0001).sum()),
 'exported_glb_bytes':glb.stat().st_size,
 'material_families_verified':seen,
 'visual_likeness_percent':None,
 'owner_approval':False,
 'target_features':'Eye shape/size normalization, softly tapered oval lower face, gentle lips and nose; no texture edits',
 'source_preservation':'Stage1–5 and live viewer remain untouched; this is an isolated Stage6 trial',
}
(OUT/'bethany_stage6_report.json').write_text(json.dumps(report,indent=2))
print('BETHANY_STAGE6_SUCCESS',blend,glb)
