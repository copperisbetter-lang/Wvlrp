"""Brooke 3.1 V5: Preserve original body neck; remove pink underlay.
Owner V4 screenshot rejected. Isolated branch, source hash guards inherited.
"""
from pathlib import Path
v3=Path('avatar-work/brooke/second-chance/build_v3_neck_fit.py').read_text()
def edit_exact(old,new):
    global v3
    assert v3.count(old)==1, f'Expected unique V3 source anchor: {old[:90]!r}, found {v3.count(old)}'
    v3=v3.replace(old,new,1)
edit_exact("OUT=BASE+'brooke-3-1-v3-neck-fit-experimental.glb'",
           "OUT=BASE+'brooke-3-1-v5-native-neck-trial.glb'")
edit_exact("REPORT=BASE+'brooke-3-1-v3-neck-fit-check.json'",
           "REPORT=BASE+'brooke-3-1-v5-native-neck-check.json'")
# The photo's bust pedestal was cut in V3 at -0.20; trim slightly further.
edit_exact("crop_y=-.20","crop_y=-.18")
# Keep V4 head proportions while moving portrait cut upward and leaving skull pose fixed.
edit_exact("head_scale=.29","head_scale=.35")
edit_exact("'head_scale':0.29,'head_raise_m':place_y","'head_scale':0.35,'head_raise_m':place_y")
edit_exact("place_y=float(head_joint_world.z-crop_y*head_scale-.012)",
           "place_y=float(head_joint_world.z+.20*head_scale-.030)")
# V4 independently generated pink neck is explicitly NOT reused.
start=v3.index("# Create a deliberately independent SKIN-COLORED NECK UNDERLAY.")
end=v3.index('""")',start)
v3=v3[:start]+("# V5: original torso skin/UV neck retained instead of separate neck underlay.\\n"
                 "# Do not create detached pale geometry.\\n")+v3[end:]
edit_exact("'v3_underlay_not_welded':True",
    "'v3_underlay_not_welded':False,'v5_native_neck_used':True,'v5_owner_feedback':'V4 detached pale neck patches','v5_head_scale':.35,'v5_body_cut_scale_error_corrected':True")
# The V3 script is itself a text transform of the V2 builder. The cut fix is
# inserted after that transform, against the unique audited source anchor.
tail="exec(compile(source,'v3_patched_build_3948_swap.py','exec'),globals())"
assert v3.count(tail)==1
addition="""# Fix: original V2/3/4 divided local neck cut by object AND armature scale,
# even though head_world is already in world coordinates. This deleted
# most of the native neck. Convert only through actual base world inverse.
old_cut=\"cut=head_world[up]/(base.matrix_world.to_scale()[up]*bodyrigs[0].matrix_world.to_scale()[up])-.025\"
new_cut=\"cut=float(head_in_mesh[up]-.020/base.matrix_world.to_scale()[up])\"
assert source.count(old_cut)==1, 'Unsafe body neck cut patch'
source=source.replace(old_cut,new_cut,1)
# Keep native neck vertices up to ~1.439m, and remove remaining head only.
# Reject attempts that still delete the lower neck during source skin cut.
anchor=\"head_remove_indices=[]\\npreserve_high_indices=[]\"
before=\"head_remove_indices=[]\\nnative_neck_set={v.index for v in base.data.vertices if 1.38 <= (base.matrix_world@v.co).z <= 1.434 and abs((base.matrix_world@v.co).x)<.11}\\npreserve_high_indices=[]\"
assert source.count(anchor)==1
source=source.replace(anchor,before,1)
check=\"assert not set(head_remove_indices).intersection(preserve_high_indices), 'Attempted shoulder deletion'\"
repl=check+\"
assert len(native_neck_set)>100, 'Native neck mesh missing from donor'\\nassert not set(head_remove_indices).intersection(native_neck_set), 'Original neck skin still being removed'\\nprint('BROOKE_V5_NECK_PRESERVED',json.dumps({'native_neck_vertices':len(native_neck_set),'local_cut':cut,'world_cut':cut*base.matrix_world.to_scale()[up]}))\"
assert source.count(check)==1
source=source.replace(check,repl,1)
# Expected removed head count may shrink with the now-corrected cut.
source=source.replace(\"assert len(head_remove_indices)>3000 and len(head_remove_indices)<4800\",
                      \"assert len(head_remove_indices)>2200 and len(head_remove_indices)<4800\",1)
# Round crown modestly more: V4 phone image still has visibly flat hair crest.
old_crown=\"crown=.155*smooth((y-.29)/.14)*max(0,1-(x/.52)**2)**.85 * max(0,1-((z+.01)/.52)**2)**.45\"
new_crown=\"crown=.215*smooth((y-.285)/.155)*max(0,1-(x/.47)**2)**1.25 * max(0,1-((z+.01)/.52)**2)**.45\"
assert source.count(old_crown)==1
source=source.replace(old_crown,new_crown,1)
# Report native neck retention separately. The join is NOT welded.
mark=\"'model_local_axis':str(Th),'landmark_residual':residual,\"
assert source.count(mark)==1
source=source.replace(mark,\"'v5_native_neck_vertices':len(native_neck_set),'v5_cut_world_z':cut*base.matrix_world.to_scale()[up],'v5_no_extra_neck_mesh':True,\\n  \"+mark,1)
# V5 must be visually inspected before approval.
assert source.count(\"'not_verified':['mouth cavity/topology','face likeness','skin color match','all body poses','welded neck seam','phone viewer']\")==1
exec(compile(source,'v5_native_neck_builder.py','exec'),globals())
"""
v3=v3.replace(tail,addition,1)
exec(compile(v3,'v5_rebuild_patch.py','exec'),globals())
