"""Brooke 3.1 V4: enlarge working photo head, slim and shorten derived neck.
Built atop audited V3 source in memory. Never overwrites body, source head, V2 or V3.
Actual body proportions require owner screenshot review before any release.
"""
from pathlib import Path
v3 = Path('avatar-work/brooke/second-chance/build_v3_neck_fit.py').read_text()
def revise(old, new):
    global v3
    n=v3.count(old)
    assert n==1, f'V4 patch anchor mismatch ({n}): {old[:75]!r}'
    v3=v3.replace(old,new,1)
revise("OUT=BASE+'brooke-3-1-v3-neck-fit-experimental.glb'",
       "OUT=BASE+'brooke-3-1-v4-proportion-trial.glb'")
revise("REPORT=BASE+'brooke-3-1-v3-neck-fit-check.json'",
       "REPORT=BASE+'brooke-3-1-v4-proportion-check.json'")
# .290 was visibly undersized on owner's phone; .436 was previously oversized.
# .350 is deliberately intermediate, subject to actual front/profile QA.
revise("head_scale=.29", "head_scale=.35")
revise("'head_scale':0.29,'head_raise_m':place_y", "'head_scale':0.35,'head_raise_m':place_y")
# Lower cropped scan bottom 30mm below actual head joint rather than 12mm:
# less visible stalk and more overlap with collar/shoulder transition.
revise("place_y=float(head_joint_world.z-crop_y*head_scale-.012)",
       "place_y=float(head_joint_world.z-crop_y*head_scale-.030)")
# Narrow upper-neck tube by ~31% at the former widest ring, shorten its
# exposed rise and taper it from collar to jaw. This changes DERIVED underlay
# only, not approved Brooke/Sophie body source or the pose skeleton.
revise("layers=[(-.090,.077),(-.057,.072),(-.021,.065),(.016,.061),(.045,.059)]",
       "layers=[(-.078,.053),(-.052,.051),(-.023,.047),(.009,.044),(.032,.041)]")
# Warmer underlay candidate; no skin-color match claimed.
revise("neck_mat.diffuse_color=(.77,.56,.48,1)", "neck_mat.diffuse_color=(.86,.65,.55,1)")
revise("bsdf.inputs['Base Color'].default_value=(.77,.56,.48,1)",
       "bsdf.inputs['Base Color'].default_value=(.86,.65,.55,1)")
# Record version-specific provenance and correct QA uncertainty.
revise("'v3_underlay_not_welded':True",
       "'v3_underlay_not_welded':True,'v4_owner_feedback':'V3 head too small and neck too large','v4_new_underlay_max_radius_m':.053,'v4_underlay_taper_top_radius_m':.041,'v4_head_scale':.35,'v4_lowered_collar_overlap_m':.030")
exec(compile(v3,'brooke_v4_derived_from_v3.py','exec'),globals())
