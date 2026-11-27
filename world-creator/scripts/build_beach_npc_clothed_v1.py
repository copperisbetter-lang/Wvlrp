"""Isolated beach NPC. Only a permanently clothed mesh is exported."""
import bpy, bmesh, sys, re
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_young_explorer_real as base
from build_young_explorer_real import HumanService, TargetService, AssetService, LocationService, ExportService, ObjectService, HumanObjectProperties

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
base.load_assets()
h=HumanService.create_human()
for key,val in {'gender':0.,'age':.08333333,'weight':.43,'muscle':.45,'height':.5,'proportions':.52}.items():
    HumanObjectProperties.set_value(key,val,entity_reference=h)
TargetService.reapply_macro_details(h)
skin=AssetService.find_asset_absolute_path('young_caucasian_female.mhmat',asset_subdir='skins')
assert skin, 'Missing age-appropriate skin'
HumanService.set_character_skin(skin,h,skin_type='GAMEENGINE')
assert HumanService.add_builtin_rig(h,'mixamo') is not None
for typ,names,label in [('eyes',['high-poly.mhclo','low-poly.mhclo'],'Eyes'),('eyebrows',['eyebrow001.mhclo'],'Eyebrows'),('eyelashes',['eyelashes01.mhclo'],'Eyelashes')]:
    base.add_asset(h,typ,names,label)
assets=Path(LocationService.get_user_data())
def find(kind,pattern):
    return sorted(p for p in (assets/kind).rglob('*.mhclo') if re.search(pattern,p.stem,re.I))
hair_paths=find('hair',r'pony.?tail|ponytail')
assert hair_paths, 'No verified ponytail in installed pack'
hair=HumanService.add_mhclo_asset(str(hair_paths[0]),h,asset_type='Hair',material_type='GAMEENGINE')
base.tint_hair(hair)
for m in hair.data.materials:
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type=='BSDF_PRINCIPLED': n.inputs['Base Color'].default_value=(.52,.37,.20,1)
tops=find('clothes',r'blouse|t.?shirt|shirt')
skirts=find('clothes',r'skirt')
tops=[p for p in tops if not re.search(r'under|crop|bra|bikini',p.stem,re.I)]
skirts=[p for p in skirts if not re.search(r'mini|micro|short',p.stem,re.I)]
assert tops and skirts, 'No suitable blouse/shirt and skirt found; stop rather than export incomplete clothing'
# Apply actual mesh clothing and its supplied delete masks.
for p in (tops[0],skirts[0]):
    print('GARMENT',p.name)
    assert HumanService.add_mhclo_asset(str(p),h,asset_type='Clothes',material_type='GAMEENGINE') is not None
root=ExportService.create_character_copy(h,name_suffix='_permanently_clothed')
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,'Basemesh')
assert body is not None
assert any(m.type=='MASK' and m.vertex_group!='body' for m in body.modifiers), 'Garment masks absent'
ExportService.bake_modifiers_remove_helpers(body,bake_masks=True,bake_subdiv=False,remove_helpers=True,also_proxy=True)
bpy.context.view_layer.update()
# Permanently discard any remaining underlying torso/pelvic geometry, even if the asset mask was incomplete.
pts=[body.matrix_world@v.co for v in body.data.vertices]
z0=min(p.z for p in pts); height=max(p.z for p in pts)-z0
assert height>.4
cx=(min(p.x for p in pts)+max(p.x for p in pts))/2
bpy.context.view_layer.objects.active=body
bpy.ops.object.select_all(action='DESELECT');body.select_set(True)
if body.data.shape_keys: bpy.ops.object.shape_key_remove(all=True,apply_mix=True)
bm=bmesh.new();bm.from_mesh(body.data)
discard=[]
for v in bm.verts:
    p=body.matrix_world@v.co; z=(p.z-z0)/height; x=abs(p.x-cx)/height
    if .44<z<.79 and x<.14: discard.append(v)
bmesh.ops.delete(bm,geom=discard,context='VERTS')
bm.to_mesh(body.data);bm.free();body.data.update()
assert len(discard)>0 or len(body.data.vertices)<12000
rig=next(o for o in ObjectService.get_list_of_children(root) if o.type=='ARMATURE')
base.preserve_photo_skin(body,'Beach NPC')
base.make_clips(rig)
# Only ordinary standing/walking/waving animations in this preview.
for t in list(rig.animation_data.nla_tracks):
    if not any(s in t.name for s in ('Idle','Walk','Wave')): rig.animation_data.nla_tracks.remove(t)
root.scale=tuple(a*1.08/height for a in root.scale)
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for ob in [root]+list(ObjectService.get_list_of_children(root)): ob.select_set(True)
out=Path(__file__).resolve().parents[1]/'assets'/'beach-npc-clothed-v1.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=True)
assert out.stat().st_size>100000
print('CLOTHED_BEACH_NPC_EXPORTED',out.stat().st_size)
