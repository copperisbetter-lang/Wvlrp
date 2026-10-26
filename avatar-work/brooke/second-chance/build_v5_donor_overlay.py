"""Compare full donor long01 hair against Brooke V5 photo hair; do not remove originals.
This is a diagnostic overlay, not a release asset.
"""
from pathlib import Path
import bpy,json,os
from mathutils import Vector
builder=Path('avatar-work/brooke/second-chance/build_v5_owner_fit.py')
exec(compile(builder.read_text(),str(builder),'exec'),globals())
assert len(bodyrigs)>=1
orig_rig=bodyrigs[0]
prior=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=BODY)
imported=set(bpy.context.scene.objects)-prior
candidate=[o for o in imported if o.type=='MESH' and ('long01' in o.data.name.lower() or 'long01' in o.name.lower())]
assert len(candidate)==1, 'Missing or ambiguous donor long01 hair: '+str([(o.name,o.data.name) for o in imported if o.type=='MESH'])
donor=candidate[0];donor_world=donor.matrix_world.copy()
donor.name='Brooke_V5_Donor_Long01_Trial'
for mod in donor.modifiers:
    if mod.type=='ARMATURE': mod.object=orig_rig
donor.parent=orig_rig
donor.parent_type='OBJECT'
donor.matrix_world=donor_world
for o in imported:
    if o!=donor:bpy.data.objects.remove(o,do_unlink=True)
bpy.context.view_layer.update()
def bounds(o):
    pts=[o.matrix_world@Vector(v) for v in o.bound_box]
    return {'x':[round(min(v.x for v in pts),3),round(max(v.x for v in pts),3)],
            'y':[round(min(v.y for v in pts),3),round(max(v.y for v in pts),3)],
            'z':[round(min(v.z for v in pts),3),round(max(v.z for v in pts),3)]}
stats={'donor_mesh':donor.data.name,'donor_vertices':len(donor.data.vertices),
       'donor_materials':[m.name for m in donor.data.materials],
       'donor_bounds':bounds(donor),'photo_head_bounds':bounds(h),
       'armature_modifiers':sum(mod.type=='ARMATURE' for mod in donor.modifiers)}
print('BROOKE_DONOR_HAIR_COMPARE',json.dumps(stats))
assert stats['donor_vertices']>1000
out=BASE+'brooke-3-1-v5-donor-overlay.glb'
report=BASE+'brooke-3-1-v5-donor-overlay-check.json'
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    if obj.type in {'MESH','ARMATURE','EMPTY'}:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_morph=True,export_skins=True)
stats.update({'export_bytes':os.path.getsize(out),'trial_only':True,'previous_owner_model_untouched':True})
Path(report).write_text(json.dumps(stats,indent=2))
