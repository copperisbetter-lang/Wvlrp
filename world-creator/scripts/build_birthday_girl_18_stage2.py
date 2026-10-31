"""Birthday Girl 18, stage 2: improve the ACTUAL saved MakeHuman mesh.
Open stage-one .blend, preserve all prior native target shape keys, refine
eye/jaw/nose/lips, tint existing texture maps, export GLB and three face views.
The montage is a visual reference only; result is NOT an exact measured likeness.
"""
import bpy, os, sys, json, math, numpy as np
from pathlib import Path
from mathutils import Vector
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService

OUT=Path(__file__).resolve().parents[1]/'assets'/'birthday-girl-18-face-stage2'
OUT.mkdir(parents=True, exist_ok=True)
stageone=Path(os.environ.get('BIRTHDAY_STAGE1_DIR','/tmp/birthday-stage1'))
candidates=list(stageone.rglob('Birthday_Girl_18_EDITABLE_MPFB_STAGE1.blend'))
if len(candidates)!=1:raise RuntimeError('Expected exactly one prior editable Birthday Girl master, got '+str(len(candidates)))
bpy.ops.wm.open_mainfile(filepath=str(candidates[0]))
h=bpy.data.objects.get('BIRTHDAY GIRL 18 - native MPFB editable master')
if not h or h.type!='MESH' or len(h.data.vertices)<10000:
    raise RuntimeError('Original parametric MakeHuman body not found; refusing substitute')
original_keys={k.name:k.value for k in h.data.shape_keys.key_blocks}
print('BIRTHDAY_STAGE1_LOADED',candidates[0], 'native_shapes',len(original_keys))

# Values are adjustments to the FIRST-PASS parametric face, not a new generic head.
# Visual targets: moderately enlarged blue-grey eyes, gentler tapered jaw, round
# upper cheeks, soft nose bridge, naturally fuller lips, and petite ears.
T={
 'head-round':.23, 'head-oval':.29, 'head-fat-incr':.08,
 'l-cheek-volume-incr':.31,'r-cheek-volume-incr':.31,
 'l-cheek-bones-decr':.07,'r-cheek-bones-decr':.07,
 'chin-width-decr':.31,'chin-height-decr':.12,
 'chin-prominent-decr':.15,'chin-cleft-decr':.20,
 'l-eye-scale-incr':.29,'r-eye-scale-incr':.29,
 'l-eye-height1-incr':.18,'r-eye-height1-incr':.18,
 'l-eye-trans-in':.07,'r-eye-trans-in':.07,
 'l-eye-bag-decr':.13,'r-eye-bag-decr':.13,
 'nose-scale-horiz-decr':.22,'nose-point-width-decr':.14,
 'nose-scale-depth-decr':.10,'nose-point-up':.08,'nose-hump-decr':.18,
 'mouth-scale-horiz-decr':.07,'mouth-upperlip-volume-incr':.31,
 'mouth-lowerlip-volume-incr':.33,'mouth-cupidsbow-incr':.13,
 'l-ear-scale-decr':.14,'r-ear-scale-decr':.14,
 'l-ear-wing-decr':.10,'r-ear-wing-decr':.10,
 'eyebrows-angle-up':.045,'forehead-scale-vert-decr':.06,
 'mouth-angles-up':.045,
 'l-eye-corner1-up':.045,'r-eye-corner1-up':.045,
 'l-eye-corner2-up':.035,'r-eye-corner2-up':.035,
}
for name,value in T.items():
    if name in h.data.shape_keys.key_blocks:
        h.data.shape_keys.key_blocks[name].value=value
    else:
        path=TargetService.target_full_path(name)
        if not path:raise RuntimeError('Missing native face target '+name)
        TargetService.load_target(h,path,weight=value,name=name)
for name,v in T.items():
    got=h.data.shape_keys.key_blocks[name].value
    if abs(got-v)>1e-5:raise RuntimeError('Native facial slider mismatch '+name)
print('BIRTHDAY_STAGE2_NATIVE_FACE_CONTROLS',len(T),
      'preserved prior shapes',len(original_keys))

# Modify copies of original MakeHuman texture IMAGES, not material color swatches.
# Texture-aware edits retain freckles/skin structure, iris variation, hair strands,
# skin UVs, and transparency. This stage is a visual material study, not measured skin.
def restore_embedded_glb_image(image_name):
    """Stage 1 saved .blend has external paths to missing textures.
    The VERIFIED stage-one GLB embeds original CC0 texture PNGs. Recover them
    from its bufferViews instead of assuming unloaded .blend images have pixels.
    """
    import struct
    glb=candidates[0].with_name('Birthday_Girl_18_STAGE1.glb')
    raw=glb.read_bytes()
    if raw[:4]!=b'glTF':raise RuntimeError('Invalid saved source GLB')
    length,kind=struct.unpack_from('<II',raw,12)
    meta=json.loads(raw[20:20+length])
    binary_at=20+((length+3)//4)*4
    nbytes,bintype=struct.unpack_from('<II',raw,binary_at)
    if bintype!=0x004e4942:raise RuntimeError('Source GLB missing binary chunk')
    binary_at+=8
    for image_info in meta.get('images',[]):
        if image_info.get('name','').lower()!=image_name.lower():continue
        view=meta['bufferViews'][image_info['bufferView']]
        data=raw[binary_at+view.get('byteOffset',0):binary_at+view.get('byteOffset',0)+view['byteLength']]
        if not data.startswith(bytes.fromhex('89504e470d0a1a0a')):
            raise RuntimeError('Source embedded texture not PNG: '+image_name)
        outpath=Path('/tmp/birthday18-restored-textures')
        outpath.mkdir(exist_ok=True)
        dest=outpath/(image_name+'.png')
        dest.write_bytes(data)
        recovered=bpy.data.images.load(str(dest),check_existing=False)
        recovered.name=image_name+'_Stage1_GLB_restored'
        print('BIRTHDAY_RESTORED_VERIFIED_SOURCE',image_name,list(recovered.size))
        return recovered
    raise RuntimeError('Source GLB missing image '+image_name)

def tweak_image(material, kind, fx):
    if not material or not material.use_nodes:return 0
    n=0
    for node in material.node_tree.nodes:
        if node.type!='TEX_IMAGE' or not node.image: continue
        img=node.image
        if kind not in img.name.lower():continue
        # When unpacked image paths point to the old GitHub runner, reload
        # this *exact* original texture from the saved stage-one GLB.
        if img.size[0]<2 or img.size[1]<2:
            img=restore_embedded_glb_image(kind)
            node.image=img
        pixels=np.empty(img.size[0]*img.size[1]*4,dtype=np.float32)
        img.pixels.foreach_get(pixels)
        a=pixels.reshape((-1,4))
        rgb=a[:,:3]
        fx(rgb,a[:,3])
        np.clip(rgb,0,1,out=rgb)
        copy=bpy.data.images.new('Birthday18_STAGE2_'+img.name,
                  width=img.size[0],height=img.size[1],
                  alpha=True,float_buffer=bool(img.is_float))
        copy.pixels.foreach_set(pixels)
        copy.update()
        copy.pack()
        node.image=copy
        print('BIRTHDAY_TEXTURE_EDIT',kind,img.name,'size',list(img.size))
        n+=1
    return n

def skin_fx(rgb,alpha):
    # Keep the real diffuse map; gently warm beige and reduce flat whiteness.
    rgb[:,0]=np.clip(rgb[:,0]*.99,0,1)
    rgb[:,1]=np.clip(rgb[:,1]*.955,0,1)
    rgb[:,2]=np.clip(rgb[:,2]*.915,0,1)
def hair_fx(rgb,alpha):
    # Preserve original shading/strand noise when lightening chestnut to honey blonde.
    luma=rgb[:,0]*.32+rgb[:,1]*.50+rgb[:,2]*.18
    lum=np.clip(.32 + .80*luma, .22,.94)
    # Darker roots/tips retain contrast; transparent cards stay transparent.
    rgb[:,0]=lum*1.10
    rgb[:,1]=lum*.86
    rgb[:,2]=lum*.57
def eyes_fx(rgb,alpha):
    # Only replace reddish-brown IRIS pixels. Preserve pupil & eye white.
    r,g,b=rgb[:,0].copy(),rgb[:,1].copy(),rgb[:,2].copy()
    mask=(r>.10)&(r>g*1.30)&(r>b*1.30)&(g>.015)&(b<.36)
    lum=r[mask]*.3+g[mask]*.55+b[mask]*.15
    rgb[mask,0]=np.clip(lum*.57+.027,0,.9)
    rgb[mask,1]=np.clip(lum*.96+.043,0,.9)
    rgb[mask,2]=np.clip(lum*1.22+.085,0,.92)

changes={'skin':0,'blonde':0,'eyes':0}
# In MPFB the eyes and hair can be siblings of the basemesh, NOT its children.
# Search the whole isolated saved Blender scene for the exact original texture
# names rather than only basemesh descendants.
for ob in list(bpy.data.objects):
    if ob.type!='MESH':continue
    for index,existing in enumerate(ob.data.materials):
        if not existing or not existing.use_nodes:continue
        original_images={n.image.name.lower() for n in existing.node_tree.nodes
                         if n.type=='TEX_IMAGE' and n.image}
        match_skin=any('young_lightskinned_female_diffuse' in s for s in original_images)
        match_hair=any('long01_diffuse' in s for s in original_images)
        match_eyes=any('brown_eye' in s for s in original_images)
        if not any((match_skin,match_hair,match_eyes)):continue
        m=existing.copy()
        ob.data.materials[index]=m
        if match_skin:
            changes['skin']+=tweak_image(m,'young_lightskinned_female_diffuse',skin_fx)
            for node in m.node_tree.nodes:
                if node.type=='BSDF_PRINCIPLED':
                    node.inputs['Roughness'].default_value=.76
                    if 'Subsurface Weight' in node.inputs:
                        node.inputs['Subsurface Weight'].default_value=.075
        if match_hair:
            changes['blonde']+=tweak_image(m,'long01_diffuse',hair_fx)
        if match_eyes:
            changes['eyes']+=tweak_image(m,'brown_eye',eyes_fx)
print('BIRTHDAY_MATERIAL_SCAN',changes,
      'scene_meshes',len([o for o in bpy.data.objects if o.type=='MESH']))
if min(changes.values())<1:raise RuntimeError('Texture modification incomplete '+str(changes))
print('BIRTHDAY_STAGE2_MATERIAL_MAPS',changes)
h['birthgirl_reference']='Approved Blonde Character Study Montage (front/profile/closeups)'
h['birthgirl_age_years']=18
h['birthgirl_stage']='stage2 native-MPFB likeness and realistic-material trial; not approved'
h['birthgirl_parent']='Birthday_Girl_18_EDITABLE_MPFB_STAGE1.blend'
for ob in bpy.data.objects:
    if ob.type=='MESH':
        for mat in ob.data.materials:
            if mat and mat.use_nodes:
                for node in mat.node_tree.nodes:
                    if node.type=='TEX_IMAGE' and node.image:
                        try:node.image.pack()
                        except Exception:pass
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Birthday_Girl_18_EDITABLE_MPFB_STAGE2.blend'))

# Preserve native shape keys in editable .blend; bake only a copy for game preview.
root=ExportService.create_character_copy(h,name_suffix='_birthday_stage2_export')
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,'Basemesh')
if not body or len(body.data.vertices)<10000:raise RuntimeError('Copy lacks full continuous basemesh')
ExportService.bake_modifiers_remove_helpers(body,bake_masks=False,bake_subdiv=False,
                                           remove_helpers=True,also_proxy=True)
for modifier in list(body.modifiers):
    if modifier.type=='MASK':body.modifiers.remove(modifier)
chosen=[root]+list(root.children_recursive)
bpy.ops.object.select_all(action='DESELECT')
for ob in chosen:ob.select_set(True)
bpy.context.view_layer.objects.active=root
glb=OUT/'Birthday_Girl_18_STAGE2.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_materials='EXPORT')
if not glb.exists() or glb.stat().st_size<100000:raise RuntimeError('Stage 2 GLB export missing')
# Light and camera tuned to show existing skin details; no clay override.
for ob in [h]+list(h.children_recursive):ob.hide_render=True
for ob in chosen:ob.hide_render=False
scene=bpy.context.scene
world=bpy.data.worlds.new('Birthday18 soft neutral studio')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.36,.39,.42,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.52
scene.world=world
scene.view_settings.view_transform='AgX'
scene.view_settings.exposure=-.27
def light(xyz,energy,size):
    ld=bpy.data.lights.new('Beauty softbox','AREA');ld.energy=energy;ld.size=size
    lo=bpy.data.objects.new('Beauty softbox',ld);bpy.context.collection.objects.link(lo)
    lo.location=xyz;lo.rotation_euler=(Vector((0,0,1.50))-lo.location).to_track_quat('-Z','Y').to_euler()
light((1.5,-2.6,3.0),420,4.0)
light((-2.0,-.4,2.7),170,3.8)
cam=bpy.data.cameras.new('Face orthographic');camera=bpy.data.objects.new('Face orthographic',cam)
bpy.context.collection.objects.link(camera)
scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=.60
scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=640
scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
positions=[body.matrix_world @ v.co for v in body.data.vertices]
headz=max(v.z for v in positions)-(max(v.z for v in positions)-min(v.z for v in positions))*.105
for angle,point in [('front',(0,-3,headz)),('left',(3,0,headz)),('right',(-3,0,headz))]:
    camera.location=point
    camera.rotation_euler=(Vector((0,0,headz))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('birthday_stage2_'+angle+'.png'))
    bpy.ops.render.render(write_still=True)
report={'age':18,'actual_source':'prior saved stage1 Blender project','native_morph_controls':T,
        'material_maps_changed':changes,
        'status':'first refined likeness trial; needs side-by-side human visual approval',
        'untouched':'Original Stage 1 blend, GLB, approved master characters'}
(OUT/'birthday_stage2_report.json').write_text(json.dumps(report,indent=2))
print('BIRTHDAY_STAGE2_SUCCESS',OUT,glb)
