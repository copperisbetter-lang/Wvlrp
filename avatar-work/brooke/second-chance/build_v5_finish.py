"""Brooke V5 — owner-requested +2% head, slightly shorter neck, collar correction.
Isolated derived clone only; 3948, Brooke 1, Sophie 1, Mona, V2–V4 unchanged.
Output is experimental pending real photographic fit and animation review.
"""
from pathlib import Path

v4=Path('avatar-work/brooke/second-chance/build_v4_proportions.py').read_text()
def change(old,new):
    global v4
    count=v4.count(old)
    assert count==1, f'V5 source patch failed count={count} anchor={old[:80]}'
    v4=v4.replace(old,new,1)

# Owner says 1–3% larger; choose exactly +2% uniformly.
change('head_scale=.35")', 'head_scale=.357")')
change("'head_scale':0.35,'head_raise_m':place_y",
       "'head_scale':0.357,'head_raise_m':place_y")

# Keep real body/shoulders; reduce apparent neck length and pull scanned lower edge
# into retained body neck by an additional 12 mm compared with V4.
change('place_y=float(head_joint_world.z-crop_y*head_scale-.030)',
       'place_y=float(head_joint_world.z-crop_y*head_scale-.042)')

# Eliminate the tall underlay that extended up above chin in V4.
# The narrow transition ends *inside* the retained neck, just above cropped scan end.
change('layers=[(-.078,.053),(-.052,.051),(-.023,.047),(.009,.044),(.032,.041)]',
       'layers=[(-.120,.053),(-.097,.051),(-.075,.049),(-.054,.047),(-.037,.045)]')

# Reduced over-bright skin shade on the independent underlay (still not UV matched).
change('neck_mat.diffuse_color=(.86,.65,.55,1)',
       'neck_mat.diffuse_color=(.79,.55,.46,1)')
change("bsdf.inputs['Base Color'].default_value=(.86,.65,.55,1)",
       "bsdf.inputs['Base Color'].default_value=(.79,.55,.46,1)")

# V4 source printed V4-specific statistics; retain provenance but use V5 metadata.
change("'v4_head_scale':.35,'v4_lowered_collar_overlap_m':.030",
       "'v4_head_scale':.35,'v4_lowered_collar_overlap_m':.030,'v5_head_scale':.357,'v5_neck_overlap_m':.042,'v5_underlay_top_relative_to_head_joint_m':-.037,'v5_head_size_vs_v4':1.02")

change("brooke-3-1-v4-proportion-trial.glb", "brooke-3-1-v5-neck-head-trial.glb")
change("brooke-3-1-v4-proportion-check.json", "brooke-3-1-v5-neck-head-check.json")

# V3 intermediate source is dynamically composed. Prior to executing it,
# surgically tighten its scan crop from y=-.20 to -.16; this removes
# pale hanging scan material BELOW the measured chin landmark (-.1383),
# while preserving full face/jaw and facial controls.
# Dome the already-modeled hairline without flattening original hair texture.
needle="exec(compile(v3,'brooke_v4_derived_from_v3.py','exec'),globals())"
assert v4.count(needle)==1
adjustments = """
# V5 scan and crown adjustments before V3 builder assembles source:
assert v3.count('crop_y=-.20')==1
v3=v3.replace('crop_y=-.20','crop_y=-.16',1)
marker="exec(compile(source,'v3_patched_build_3948_swap.py','exec'),globals())"
assert v3.count(marker)==1
v3=v3.replace(marker, '''# V5 hair crown refinement on working scan geometry.
old_crown="crown=.155*smooth((y-.29)/.14)*max(0,1-(x/.52)**2)**.85 * max(0,1-((z+.01)/.52)**2)**.45"
new_crown="crown=.155*smooth((y-.29)/.14)*max(0,1-(x/.52)**2)**.85 * max(0,1-((z+.01)/.52)**2)**.45 + .055*smooth((y-.35)/.08)*max(0,1-(x/.28)**2)**1.3"
assert source.count(old_crown)==1
source=source.replace(old_crown,new_crown,1)
exec(compile(source,'v5_brooke_composed_build.py','exec'),globals())
''',1)
exec(compile(v3,'brooke_v5_derived_from_v3.py','exec'),globals())
"""
v4=v4.replace(needle,adjustments,1)
exec(compile(v4,'brooke_v5_derived_from_v4.py','exec'),globals())
