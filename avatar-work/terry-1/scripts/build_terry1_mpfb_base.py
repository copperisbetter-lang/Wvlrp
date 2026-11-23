# Copyright © 2026 WVLRP / The Wild. Original project-created work only.
"""Terry 1: freshly generated official MakeHuman MPFB adult-male base.
Face likeness is NOT fitted yet. Generates editable .blend and rigged GLB,
isolated from Mason, Dad, Brooke and all original characters.
Requires the existing MPFB 2.0.18/Blender 4.2 setup and official CC0 assets.
"""
import bpy, runpy, json, hashlib, traceback, os, sys
from pathlib import Path

REPO=Path(__file__).resolve().parents[2]
ROOT=REPO/'avatar-work/terry-1'
OUT=ROOT/'base';OUT.mkdir(parents=True,exist_ok=True)
BASE=OUT/'Terry1_MakeHuman_Editable_Base.blend'
GLB=OUT/'Terry1_MakeHuman_Rigged_Base.glb'
QA=OUT/'Terry1_MakeHuman_Base_QA.json'
# Reuse the existing proven MPFB loader and utilities. Importing without __main__
# does NOT build, touch or modify Mason.
mh=runpy.run_path(str(REPO/'world-creator/scripts/build_mason_mpfb.py'))
HumanService=mh['HumanService']
TargetService=mh['TargetService']
AssetService=mh['AssetService']
ExportService=mh['ExportService']
ObjectService=mh['ObjectService']
Props=mh['HumanObjectProperties']
mh['load_system_pack']()

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
human=HumanService.create_human()
human.name='Terry1_Original_MakeHuman_Base_UNFIT_FACE'
# Provisional mature-adult male proportions, not claimed measured Terry likeness.
settings={'gender':1.0,'age':.65,'weight':.55,'muscle':.47,
          'height':.52,'proportions':.50,'cupsize':0.0,'firmness':.5}
for key,val in settings.items():
    Props.set_value(key,val,entity_reference=human)
    got=Props.get_value(key,entity_reference=human)
    if key in ('gender','age','weight','height') and abs(float(got)-val)>.015:
        raise RuntimeError(f'{key} macro failed: wanted {val}, saw {got}')
TargetService.reapply_macro_details(human)
# Use official CC0 skin and add separate anatomically rigged eyes/teeth.
skin=(AssetService.find_asset_absolute_path('young_caucasian_male.mhmat',asset_subdir='skins') or
      AssetService.find_asset_absolute_path('young_caucasian_female.mhmat',asset_subdir='skins'))
if not skin:raise RuntimeError('Missing official MakeHuman CC0 skin')
HumanService.set_character_skin(skin,human,skin_type='GAMEENGINE')
rig=HumanService.add_builtin_rig(human,'mixamo')
if not rig or len(rig.data.bones)<25:raise RuntimeError('MakeHuman Mixamo rig unavailable or too few bones')
for sub,options,kind in [
    ('eyes',['high-poly.mhclo','low-poly.mhclo'],'Eyes'),
    ('eyebrows',['eyebrow001.mhclo'],'Eyebrows'),
    ('eyelashes',['eyelashes01.mhclo'],'Eyelashes'),
    ('teeth',['teeth_base.mhclo'],'Teeth')]:
    asset=mh['add_asset'](human,sub,options,kind)
    print('TERRY1_ASSET',kind,'ok' if asset else 'missing')

# Keep the native original MPFB body and macros editable; hair, clothes, and face
# reconstruction are intentionally deferred until Terry likeness approval.
bpy.context.scene.render.film_transparent=False
bpy.ops.wm.save_as_mainfile(filepath=str(BASE),compress=True)
print('TERRY1_EDITABLE_BLEND_SAVED',BASE,BASE.stat().st_size)

# Export a rigged working copy. Never apply clothes masks as they erase skin.
export_root=ExportService.create_character_copy(human,name_suffix='_Terry1_rigged_export')
full=[export_root]+list(ObjectService.get_list_of_children(export_root))
basebody=ObjectService.find_object_of_type_amongst_nearest_relatives(export_root,'Basemesh')
if basebody is None:raise RuntimeError('Export base body missing')
ExportService.bake_modifiers_remove_helpers(basebody,bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
for mod in list(basebody.modifiers):
    if mod.type=='MASK':basebody.modifiers.remove(mod)
assert len(basebody.data.vertices)>10000
assert any(x.type=='ARMATURE' for x in full)
bpy.ops.object.select_all(action='DESELECT')
for x in set(full):x.select_set(True)
bpy.context.view_layer.objects.active=next(x for x in full if x.type=='ARMATURE')
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,
                          export_animations=False,export_materials='EXPORT')
if GLB.stat().st_size<500000:raise RuntimeError('Exported GLB missing geometry')
import struct
blob=GLB.read_bytes()
if blob[:4]!=b'glTF':raise RuntimeError('Invalid GLB')
n=struct.unpack_from('<I',blob,12)[0]
meta=json.loads(blob[20:20+n])
assert meta.get('skins') and len(meta['skins'][0]['joints'])>=25, 'No full-body rig'
assert meta.get('meshes'), 'No mesh'
joint_names=[meta['nodes'][x].get('name','') for x in meta['skins'][0]['joints']]
assert any('head' in x.lower() for x in joint_names), 'No head joint'
assert any('leg' in x.lower() for x in joint_names), 'No leg joints'
obj={
  'identity':'Terry Clark / The Wild park ranger — generic MakeHuman base, NO photo likeness yet',
  'workflow':'Blender 4.2 + MPFB 2.0.18; reused working WVLRP official-asset loader',
  'license':'Check included asset licenses before distribution; source assets official MakeHuman CC0',
  'status':'Rigged body ready for facial morph stage, NOT character approved',
  'editable_blend':str(BASE.relative_to(REPO)), 'rigged_glb':str(GLB.relative_to(REPO)),
  'settings':settings,'rig_joints':len(meta['skins'][0]['joints']),
  'meshes':len(meta['meshes']), 'source_bones':len(rig.data.bones),
  'glb_size':GLB.stat().st_size,'blend_size':BASE.stat().st_size,
  'glb_sha256':hashlib.sha256(blob).hexdigest(),
  'blend_sha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),
  'preserves_originals':True,
  'pending':'Fit Terry uploaded front and profile images to this SAME editable MakeHuman face, use FaceFit-MPFB if suitable; preserve hair as separate geometry. Uniform later.'
}
QA.write_text(json.dumps(obj,indent=2))
print('TERRY1_BASE_SUCCESS',json.dumps(obj,indent=2))
