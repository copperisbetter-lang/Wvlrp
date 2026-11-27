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
# The system pack has no matching separates; tailor an opaque dress to this NPC.
root=ExportService.create_character_copy(h,name_suffix='_permanently_clothed')
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,'Basemesh')
assert body is not None
ExportService.bake_modifiers_remove_helpers(body,bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
for mod in list(body.modifiers):
    if mod.type=='MASK': body.modifiers.remove(mod)
bpy.context.view_layer.update()
rig=next((o for o in [root]+list(ObjectService.get_list_of_children(root)) if o.type=='ARMATURE'),None)
assert rig is not None, 'Export rig missing from root and descendants'
print('BEACH_NPC_RIG',rig.name,len(rig.data.bones))
pts=[body.matrix_world@v.co for v in body.data.vertices]
z0=min(p.z for p in pts); height=max(p.z for p in pts)-z0
assert height>.4
cx=(min(p.x for p in pts)+max(p.x for p in pts))/2
dress=base.make_dress(body,rig,root)
dress.name='Beach NPC knee-length opaque dress'
# A permanent opaque lining closes the hem for normal gameplay.
lining=base.material('Opaque dress lining',(.14,.23,.30),.9)
dress.data.materials.append(lining)
bm=bmesh.new();bm.from_mesh(dress.data)
bm.verts.ensure_lookup_table()
hem=[bm.verts[i] for i in range(64)]
assert len(hem)==64
cap=bm.faces.new(tuple(reversed(hem)))
cap.material_index=len(dress.data.materials)-1
bm.to_mesh(dress.data);bm.free();dress.data.update()
# Remove covered body geometry rather than exporting a hidden unclothed model.
bpy.context.view_layer.objects.active=body
bpy.ops.object.select_all(action='DESELECT');body.select_set(True)
if body.data.shape_keys: bpy.ops.object.shape_key_remove(all=True,apply_mix=True)
bm=bmesh.new();bm.from_mesh(body.data)
discard=[]
for v in bm.verts:
    p=body.matrix_world@v.co; z=(p.z-z0)/height; x=abs(p.x-cx)/height
    if .405<z<.715 and (z<.62 or x<.145): discard.append(v)
assert discard,'Expected covered geometry to remove'
bmesh.ops.delete(bm,geom=discard,context='VERTS')
bm.to_mesh(body.data);bm.free();body.data.update()
base.preserve_photo_skin(body,'Beach NPC')
# Add a standard upright chair-sitting game animation alongside walk/idle.
import inspect
clip_source=inspect.getsource(base.make_clips)
marker="    for b in all_bones:\n        if normalized(b.name) in arm_corrections:"
assert clip_source.count(marker)==1
seated="    clip('Beach NPC Sit on Bench',[(1,{}),(15,{'leftupleg':(-1.2,0,0),'rightupleg':(-1.2,0,0),'leftleg':(1.25,0,0),'rightleg':(1.25,0,0)}),(48,{'leftupleg':(-1.2,0,0),'rightupleg':(-1.2,0,0),'leftleg':(1.25,0,0),'rightleg':(1.25,0,0)})])\n"
exec(compile(clip_source.replace(marker,seated+marker),'<ordinary gameplay clips>','exec'),base.__dict__)
base.make_clips(rig)
for t in list(rig.animation_data.nla_tracks):
    if not any(s in t.name for s in ('Idle','Walk','Wave','Sit on Bench')): rig.animation_data.nla_tracks.remove(t)
print('BEACH_GAMEPLAY_CLIPS', [t.name for t in rig.animation_data.nla_tracks])
root.scale=tuple(a*1.08/height for a in root.scale)
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for ob in [root]+list(ObjectService.get_list_of_children(root)): ob.select_set(True)
out=Path(__file__).resolve().parents[1]/'assets'/'beach-npc-clothed-v1.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=True,export_nla_strips=True)
assert out.stat().st_size>100000
import json,struct
with out.open('rb') as f:
    header=f.read(12); n,kind=struct.unpack('<II',f.read(8)); doc=json.loads(f.read(n))
assert header[:4]==b'glTF'
names=[a.get('name','') for a in doc.get('animations',[])]
assert any('Walk' in n for n in names) and any('Sit on Bench' in n for n in names), names
print('VERIFIED_GAMEPLAY_ANIMATIONS',names)
print('CLOTHED_BEACH_NPC_EXPORTED',out.stat().st_size)
