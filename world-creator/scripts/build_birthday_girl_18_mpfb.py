"""Birthday Girl 18: reproducible MPFB first facial pass, isolated WVLRP test.
Reference: approved Blonde Character Study Montage (not copied into repository).
Requires Blender 4.2, MPFB 2.0.18 and official CC0 MakeHuman asset ZIP.
A VISUAL first pass, not automatic photogrammetry or exact measurements.
"""
import bpy, os, sys, json, zipfile, shutil
from pathlib import Path
from mathutils import Vector
from bl_ext.wvlrp_local.mpfb.services.humanservice import HumanService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.assetservice import AssetService
from bl_ext.wvlrp_local.mpfb.services.locationservice import LocationService
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService
from bl_ext.wvlrp_local.mpfb.entities.objectproperties import HumanObjectProperties

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'birthday-girl-18-face-stage1'
OUT.mkdir(parents=True,exist_ok=True)
# MakeHuman age mapping for ages 1–25: age=(years-1)/48
AGE=(18.0-1.0)/48.0
MACROS={'gender':0.,'age':AGE,'height':.50,'weight':.48,
        'muscle':.34,'proportions':.49,'cupsize':.50,'firmness':.55}
# Verified against MPFB's official target.json. Balanced L/R.
T={
'head-round':.28,'head-oval':.18,'head-fat-incr':.10,
'l-cheek-volume-incr':.32,'r-cheek-volume-incr':.32,
'l-cheek-bones-decr':.10,'r-cheek-bones-decr':.10,
'chin-width-decr':.20,'chin-height-decr':.15,'chin-prominent-decr':.09,'chin-cleft-decr':.15,
'l-eye-scale-incr':.22,'r-eye-scale-incr':.22,
'l-eye-height1-incr':.13,'r-eye-height1-incr':.13,
'l-eye-trans-in':.04,'r-eye-trans-in':.04,
'l-eye-bag-decr':.10,'r-eye-bag-decr':.10,
'nose-scale-horiz-decr':.19,'nose-point-width-decr':.12,
'nose-scale-depth-decr':.08,'nose-point-up':.06,'nose-hump-decr':.16,
'mouth-scale-horiz-decr':.12,'mouth-upperlip-volume-incr':.24,
'mouth-lowerlip-volume-incr':.23,'mouth-cupidsbow-incr':.09,
'l-ear-scale-decr':.15,'r-ear-scale-decr':.15,
'l-ear-wing-decr':.10,'r-ear-wing-decr':.10,
'eyebrows-angle-up':.06,'forehead-scale-vert-decr':.06,
}
assert len(T)==34

def assets():
    pack=Path('/tmp/mh-system.zip')
    if not pack.is_file():raise RuntimeError('Official CC0 asset pack missing')
    destroot=Path(LocationService.get_user_data())
    categories={'skins','hair','eyes','eyebrows','eyelashes','teeth'}
    n=0
    with zipfile.ZipFile(pack) as archive:
        for info in archive.infolist():
            parts=Path(info.filename).parts
            i=next((i for i,p in enumerate(parts) if p in categories),None)
            if i is None or info.is_dir():continue
            path=Path(*parts[i:])
            if '..' in path.parts:continue
            dest=destroot/path
            dest.parent.mkdir(parents=True,exist_ok=True)
            with archive.open(info) as source,dest.open('wb') as output:shutil.copyfileobj(source,output)
            n+=1
    if n<20:raise RuntimeError('Missing official assets')
    AssetService.invalidate_pack_metadata_cache()
    print('BIRTHDAY_INSTALLED_CC0_ASSETS',n)

def add(h,kind,subdir,names):
    for name in names:
        path=AssetService.find_asset_absolute_path(name,asset_subdir=subdir)
        if path:return HumanService.add_mhclo_asset(path,h,asset_type=kind,material_type='GAMEENGINE')
    print('BIRTHDAY_OPTIONAL_ASSET_MISSING',kind)
    return None

def view(camera,at,aim):
    camera.location=at
    camera.rotation_euler=(Vector(aim)-camera.location).to_track_quat('-Z','Y').to_euler()

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
assets()
h=HumanService.create_human()
h.name='BIRTHDAY GIRL 18 - native MPFB editable master'
for k,v in MACROS.items():
    HumanObjectProperties.set_value(k,v,entity_reference=h)
TargetService.reapply_macro_details(h)
actual=float(HumanObjectProperties.get_value('age',entity_reference=h))
if abs(actual-AGE)>.00001:raise RuntimeError('Age macro incorrectly set')
if abs(float(HumanObjectProperties.get_value('gender',entity_reference=h)))>.001:raise RuntimeError('Not a female base')

# These ARE MakeHuman native targets; preserve their sliders on the source .blend.
for name,weight in T.items():
    path=TargetService.target_full_path(name)
    if not path:raise RuntimeError('MPFB target missing '+name)
    key=TargetService.load_target(h,path,weight=weight)
    if key is None:raise RuntimeError('MPFB load failed '+name)
print('BIRTHDAY_NATIVE_MORPH_CONTROLS',len(T))
skin=AssetService.find_asset_absolute_path('young_caucasian_female.mhmat',asset_subdir='skins')
if not skin:raise RuntimeError('Female CC0 skin missing')
HumanService.set_character_skin(skin,h,skin_type='GAMEENGINE')
rig=HumanService.add_builtin_rig(h,'mixamo')
if not rig:raise RuntimeError('Rig missing')
add(h,'Eyes','eyes',['high-poly.mhclo','low-poly.mhclo'])
add(h,'Eyebrows','eyebrows',['eyebrow001.mhclo'])
add(h,'Eyelashes','eyelashes',['eyelashes01.mhclo'])
hair=add(h,'Hair','hair',['long01.mhclo'])
# Neutral original hair card texture is temporary; hair likeness is not finished.
h['birthgirl_reference']='Approved Blonde Character Study Montage, visual comparison only'
h['birthgirl_age_years']=18
h['birthgirl_stage']='stage 1 visual-parametric face pass; likeness not validated'
blend=OUT/'Birthday_Girl_18_EDITABLE_MPFB_STAGE1.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))

# Export copy only; NEVER flatten the editable master.
root=ExportService.create_character_copy(h,name_suffix='_GLB_preview_copy')
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,'Basemesh')
if not body or len(body.data.vertices)<10000:raise RuntimeError('Export body incomplete')
ExportService.bake_modifiers_remove_helpers(body,bake_masks=False,bake_subdiv=False,
                                              remove_helpers=True,also_proxy=True)
for mod in list(body.modifiers):
    if mod.type=='MASK':body.modifiers.remove(mod)
chosen=[root]+list(root.children_recursive)
bpy.ops.object.select_all(action='DESELECT')
for ob in chosen:ob.select_set(True)
bpy.context.view_layer.objects.active=root
glb=OUT/'Birthday_Girl_18_STAGE1.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,
                          export_materials='EXPORT')
if not glb.exists() or glb.stat().st_size<100000:raise RuntimeError('No usable GLB export')

# Front and profile inspections of the actual exported 3D mesh.
for ob in [h]+list(h.children_recursive):ob.hide_render=True
for ob in chosen:ob.hide_render=False
scene=bpy.context.scene
world=bpy.data.worlds.new('Birthday neutral studio')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.45,.46,.48,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.85
scene.world=world
lightdata=bpy.data.lights.new('Softbox','AREA');lightdata.energy=650;lightdata.size=4
light=bpy.data.objects.new('Softbox',lightdata);bpy.context.collection.objects.link(light)
light.location=(1,-3,3)
light.rotation_euler=(Vector((0,0,1.5))-light.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('Face orthographic')
camera=bpy.data.objects.new('Face orthographic',cd);bpy.context.collection.objects.link(camera)
scene.camera=camera
cd.type='ORTHO';cd.ortho_scale=.57
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=620;scene.render.resolution_y=720
scene.render.image_settings.file_format='PNG'
# The real bounding box is used to locate the head: no assumed coordinate frame.
def bbox(o):
    coords=[o.matrix_world @ v.co for v in o.data.vertices]
    return min(v.z for v in coords),max(v.z for v in coords)
lower,upper=bbox(body)
headz=upper-(upper-lower)*.105
for title,pos in [('front',(0,-3,headz)),('left',(3,0,headz)),('right',(-3,0,headz))]:
    view(camera,pos,(0,0,headz))
    scene.render.filepath=str(OUT/('birthday_'+title+'.png'))
    bpy.ops.render.render(write_still=True)
manifest={'age_years':18,'age_slider':AGE,'macros':MACROS,'facial_targets':T,
          'reference':'Approved Blonde Character Study Montage',
          'status':'first-pass test ONLY; not validated photographic likeness'}
(OUT/'birthday_stage1_report.json').write_text(json.dumps(manifest,indent=2))
print('BIRTHDAY_GIRL_MPFB_STAGE1_SUCCESS',blend,glb,'controls',len(T))
