"""Stage 4 likeness pass on the actual, already working Stage 3 native MakeHuman rig.
Preserve every earlier original. This is a resemblance trial, NOT a verified 75% match.
"""
import bpy, os, json, math, numpy as np
from pathlib import Path
from mathutils import Vector
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService

OUT=Path(__file__).resolve().parents[1]/'assets'/'birthday-girl-18-face-stage4'
OUT.mkdir(parents=True,exist_ok=True)
sources=list(Path(os.environ.get('BIRTHDAY_STAGE3_DIR','/tmp/birthday-stage3')).rglob('Birthday_Girl_18_EDITABLE_MPFB_STAGE3.blend'))
if len(sources)!=1:raise RuntimeError('Stage 3 certified editable MakeHuman source missing/ambiguous '+str(sources))
bpy.ops.wm.open_mainfile(filepath=str(sources[0]))
h=bpy.data.objects.get('BIRTHDAY GIRL 18 - native MPFB editable master')
if not h or h.type!='MESH' or len(h.data.vertices)<10000:raise RuntimeError('Missing actual original MakeHuman mesh: abort')
shapes=h.data.shape_keys.key_blocks
before={k.name:k.value for k in shapes}
if len(before)<51:raise RuntimeError('Native MPFB morph controls missing; refusing generic replacement')
print('BIRTHDAY_STAGE4_PRESERVED_NATIVE_MORPHS',len(before))

# Stage-2 keys, calibrated for the reference's oval/soft-heart silhouette,
# less cartoonish round eyes, petite projecting nose, softer full lips.
# These are measured APPROXIMATE target directions, NOT a facial-recognition score.
adjust={
 # Reduce oversized round eyes, sharpen the soft-heart lower face, make
 # nose and lips more like the approved straight-on photo. Small controlled
 # changes over Stage3, no arbitrary head rebuild.
 'head-round':.095,'head-oval':.46,'head-fat-incr':.03,
 'l-cheek-volume-incr':.27,'r-cheek-volume-incr':.27,
 'l-cheek-bones-decr':.018,'r-cheek-bones-decr':.018,
 'chin-width-decr':.43,'chin-height-decr':.08,'chin-prominent-decr':.11,
 'l-eye-scale-incr':.13,'r-eye-scale-incr':.13,
 'l-eye-height1-incr':.04,'r-eye-height1-incr':.04,
 'l-eye-trans-in':.074,'r-eye-trans-in':.074,
 'l-eye-bag-decr':.095,'r-eye-bag-decr':.095,
 'l-eye-corner1-up':.037,'r-eye-corner1-up':.037,
 'l-eye-corner2-up':.036,'r-eye-corner2-up':.036,
 'nose-scale-horiz-decr':.12,'nose-point-width-decr':.075,
 'nose-scale-depth-decr':.015,'nose-point-up':.025,'nose-hump-decr':.13,
 'mouth-scale-horiz-decr':.035,
 'mouth-upperlip-volume-incr':.29,'mouth-lowerlip-volume-incr':.33,
 'mouth-cupidsbow-incr':.15,'mouth-angles-up':.082,
 'eyebrows-angle-up':.045,'forehead-scale-vert-decr':.015,
 'l-ear-wing-decr':.12,'r-ear-wing-decr':.12
}
for name,value in adjust.items():
    if name not in shapes:
        target=TargetService.target_full_path(name)
        if not target:raise RuntimeError('Native MPFB face target unavailable: '+name)
        TargetService.load_target(h,target,weight=value,name=name)
    else:
        shapes[name].value=value
if any(abs(shapes[k].value-v)>1e-5 for k,v in adjust.items()):
    raise RuntimeError('Native face adjustments were not applied')
print('BIRTHDAY_STAGE4_ADJUSTED_NATIVE_CONTROLS',len(adjust))

# Stage-2 saved .blend can retain external image paths from its build runner,
# although the VERIFIED Stage-2 GLB contains the exact original textures. Restore
# the embedded source image pixel bytes when a .blend image is unloaded (size 0).
import struct
stage3_glb=sources[0].with_name('Birthday_Girl_18_STAGE3.glb')
if not stage3_glb.exists(): raise RuntimeError('Stage3 GLB unavailable for lossless texture recovery')
rawglb=stage3_glb.read_bytes()
if rawglb[:4]!=b'glTF':raise RuntimeError('Stage3 source GLB invalid')
json_len,json_type=struct.unpack_from('<II',rawglb,12)
if json_type!=0x4e4f534a:raise RuntimeError('Stage3 GLB missing JSON chunk')
glbinfo=json.loads(rawglb[20:20+json_len])
binary_at=20+((json_len+3)//4)*4
binary_len,bin_type=struct.unpack_from('<II',rawglb,binary_at)
if bin_type!=0x004e4942:raise RuntimeError('Stage3 source GLB missing embedded binary')
binary_at+=8
cache_dir=Path('/tmp/birthday18-stage4-restored-textures')
cache_dir.mkdir(exist_ok=True)

def stage3_embedded_texture(name):
    stem=name.lower().replace('.png','').replace('.jpg','').replace('.jpeg','')
    matches=[i for i in glbinfo.get('images',[])
             if stem in i.get('name','').lower()]
    if not matches:raise RuntimeError('Missing Stage3 GLB embedded image '+name)
    info=matches[0]
    view=glbinfo['bufferViews'][info['bufferView']]
    start=binary_at+view.get('byteOffset',0)
    data=rawglb[start:start+view['byteLength']]
    mime=info.get('mimeType','')
    if data.startswith(bytes.fromhex('89504e470d0a1a0a')):ext='png'
    elif data.startswith(bytes.fromhex('ffd8ff')):ext='jpg'
    else:raise RuntimeError('Not a standard Stage3 PNG/JPEG texture '+name+' mime='+mime)
    dest=cache_dir/('stage3_'+''.join(ch if ch.isalnum() else '_' for ch in stem)[:70]+'.'+ext)
    dest.write_bytes(data)
    im=bpy.data.images.load(str(dest),check_existing=False)
    im.name='Birthday18_STAGE4_RESTORED_'+stem
    if min(im.size)<16:raise RuntimeError('Recovered Stage3 image is blank '+name)
    im.pack()
    print('BIRTHDAY_STAGE4_RESTORED_FROM_GLTF',name,im.size[:])
    return im

# The exact original eyebrow/eyelash maps, eyes and blonde hair must also load;
# leave them intact rather than re-mapping their UVs or altering alpha values.
# Stage3 raster skin maps no longer retain original diffuse name.
# Both original/Stage3 identifiers are supported so a blank .blend image
# can always be rehydrated from the source GLB before pixel edits begin.
restore_names=('birthday18_stage3_warm_skin','young_lightskinned_female_diffuse',
               'brown_eye','long01_diffuse','eyebrow001','eyelashes01')
restored_map={}
for ob in bpy.data.objects:
    if ob.type!='MESH':continue
    for mat in ob.data.materials:
        if not mat or not mat.use_nodes:continue
        for node in mat.node_tree.nodes:
            if node.type!='TEX_IMAGE' or not node.image:continue
            name=node.image.name.lower()
            found=next((kind for kind in restore_names if kind in name),None)
            if not found or min(node.image.size)>=16:continue
            if found not in restored_map:
                restored_map[found]=stage3_embedded_texture(found)
            node.image=restored_map[found]
print('BIRTHDAY_STAGE4_TEXTURES_RECOVERED',list(restored_map))

# Adjust a COPY of the already packed Stage 3 original human skin.
# Preserve pores and map grain, alpha, and the entire original eye/lash/hair maps.
skin_count=0
for ob in bpy.data.objects:
    if ob.type!='MESH':continue
    for mi,material in enumerate(ob.data.materials):
        if not material or not material.use_nodes:continue
        skin_nodes=[n for n in material.node_tree.nodes
                    if n.type=='TEX_IMAGE' and n.image and
                    ('young_lightskinned_female_diffuse' in n.image.name.lower()
                      or 'birthday18_stage3_warm_skin' in n.image.name.lower())]
        if not skin_nodes:continue
        newmat=material.copy()
        ob.data.materials[mi]=newmat
        for node in newmat.node_tree.nodes:
            if node.type!='TEX_IMAGE' or not node.image:continue
            img=node.image
            if not any(k in img.name.lower() for k in ('young_lightskinned_female_diffuse','birthday18_stage3_warm_skin')):continue
            if min(img.size)<1000:raise RuntimeError('Stage3 skin pixels unavailable '+img.name)
            pix=np.empty(int(img.size[0])*int(img.size[1])*4,dtype=np.float32)
            img.pixels.foreach_get(pix)
            rgba=pix.reshape((-1,4))
            rgb=rgba[:,:3]
            # Warm peach complexion and midtone separation. Work directly on
            # raster original, not generic skin material. Keep face UV texture.
            rgb[:,0]=np.clip(rgb[:,0]*.945+.003,0,1)
            rgb[:,1]=np.clip(rgb[:,1]*.925+.002,0,1)
            rgb[:,2]=np.clip(rgb[:,2]*.900,0,1)
            out=bpy.data.images.new('Birthday18_STAGE4_WARM_SKIN_'+str(skin_count),
                      width=img.size[0],height=img.size[1],
                      alpha=True,float_buffer=bool(img.is_float))
            out.pixels.foreach_set(pix)
            out.update()
            out.pack()
            node.image=out
            skin_count+=1
        for node in newmat.node_tree.nodes:
            if node.type=='BSDF_PRINCIPLED':
                node.inputs['Roughness'].default_value=.62
                if 'Subsurface Weight' in node.inputs:
                    node.inputs['Subsurface Weight'].default_value=.078
if skin_count<1:raise RuntimeError('No real skin maps updated')
print('BIRTHDAY_STAGE4_SKIN_MAPS',skin_count)

# Reject lost textures: the verified Stage 3 brow/lash alpha assets must survive.
verified={'eyebrow001':0,'eyelashes01':0,'brown_eye':0,'long01':0}
for ob in bpy.data.objects:
    if ob.type!='MESH':continue
    for mat in ob.data.materials:
        if not mat or not mat.use_nodes:continue
        for node in mat.node_tree.nodes:
            if node.type!='TEX_IMAGE' or not node.image:continue
            image=node.image
            name=image.name.lower()
            for k in verified:
                if k in name:
                    if min(image.size)<16:raise RuntimeError('Texture became blank: '+name)
                    verified[k]+=1
            try:image.pack()
            except Exception as e:print('PACK_WARNING',name,str(e)[:100])
if any(v<1 for v in verified.values()):raise RuntimeError('Original Stage3 eye/brow/hair assets lost '+str(verified))
print('BIRTHDAY_STAGE4_TEXTURES_PRESERVED',verified)

h['birthgirl_stage']='Stage4 isolated likeness refinement, incremental resemblance improvement toward owner's 70-75% checkpoint, NOT yet visually approved'
h['birthgirl_parent']='Birthday_Girl_18_EDITABLE_MPFB_STAGE3.blend'
h['birthgirl_reference_library_path']='/The Wild/Character References/Birthday Girl 18/Blonde Character Study Montage.png'
h['birthgirl_approval']='Pending user comparison, no objective similarity score available'
blend=OUT/'Birthday_Girl_18_EDITABLE_MPFB_STAGE4.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
if not blend.exists():raise RuntimeError('Editable Stage4 BLEND not saved')

# Export only a cloned copy of the same native rig/meshes.
root=ExportService.create_character_copy(h,name_suffix='_birthday_stage4_export')
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,'Basemesh')
if not body or len(body.data.vertices)<10000:raise RuntimeError('Missing native mesh in exported clone')
ExportService.bake_modifiers_remove_helpers(body,bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
for mod in list(body.modifiers):
    if mod.type=='MASK':body.modifiers.remove(mod)
chosen=[root]+list(root.children_recursive)
bpy.ops.object.select_all(action='DESELECT')
for ob in chosen:ob.select_set(True)
bpy.context.view_layer.objects.active=root
glb=OUT/'Birthday_Girl_18_STAGE4.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_materials='EXPORT')
if glb.stat().st_size<1000000:raise RuntimeError('Stage4 rigged GLB missing')

# Comparable neutral front/left/right + three-quarter face views; renders are
# QA only. The editable model and functional viewer remain the deliverables.
for ob in [h]+list(h.children_recursive):ob.hide_render=True
for ob in chosen:ob.hide_render=False
scene=bpy.context.scene
world=bpy.data.worlds.new('Birthday18 stage4 neutral QA lighting')
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
    ld=bpy.data.lights.new('Stage4 diffuse softbox','AREA');ld.energy=energy;ld.size=size
    lo=bpy.data.objects.new('Stage4 diffuse softbox',ld);bpy.context.collection.objects.link(lo)
    lo.location=xyz;lo.rotation_euler=(Vector((0,0,1.55))-lo.location).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.cameras.new('Stage4 face ortho')
camera=bpy.data.objects.new('Stage4 face ortho',cam)
bpy.context.collection.objects.link(camera)
scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=.62
points=[body.matrix_world @ v.co for v in body.data.vertices]
z=max(v.z for v in points)-.105*(max(v.z for v in points)-min(v.z for v in points))
for name,loc in [('front',(0,-3,z)),('left',(3,0,z)),('right',(-3,0,z)),('threequarter',(2.1,-2.1,z))]:
    camera.location=loc
    camera.rotation_euler=(Vector((0,0,z))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('birthday_stage4_'+name+'.png'))
    bpy.ops.render.render(write_still=True)
report={
 'source':'certified Stage3 native editable MakeHuman .blend from workflow 41223456507',
 'reference_library':'/The Wild/Character References/Birthday Girl 18/Blonde Character Study Montage.png',
 'stage4_target':'Stage4 eye/silhouette/mouth refinement toward 70-75% target; subjective likeness unmeasured',
 'native_morph_count_before':len(before),
 'additional_adjustments':adjust,
 'original_skin_maps_refined':skin_count,
 'preserved_texture_assets':verified,
 'earlier_stages_untouched':True,
 'next_visual_check':'compare front, profile, threequarter views and live 3D viewer; further refine after user review'
}
(OUT/'birthday_stage4_report.json').write_text(json.dumps(report,indent=2))
print('BIRTHDAY_STAGE4_SUCCESS',blend,glb)
