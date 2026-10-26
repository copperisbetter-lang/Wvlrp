"""Brooke V5 owner's final proportion trial using the verified native body neck.
Derived from native neck build. No synthetic underlay, no original overwrite.
"""
from pathlib import Path
source=Path('avatar-work/brooke/second-chance/build_v5_native_neck.py').read_text()
def replace_one(old,new):
    global source
    n=source.count(old)
    assert n==1, f'Unsafe V5 owner-fit anchor {n}: {old[:75]}'
    source=source.replace(old,new,1)
replace_one('brooke-3-1-v5-native-neck-trial.glb','brooke-3-1-v5-owner-fit.glb')
replace_one('brooke-3-1-v5-native-neck-check.json','brooke-3-1-v5-owner-fit-check.json')
# The owner asked for +1-3%. 0.35 * 1.02 = 0.357 exactly.
replace_one('head_scale=.29","head_scale=.35"', 'head_scale=.29","head_scale=.357"')
replace_one("'head_scale':0.35,'head_raise_m':place_y",
            "'head_scale':0.357,'head_raise_m':place_y")
replace_one('place_y=float(head_joint_world.z+.20*head_scale-.030)',
            'place_y=float(head_joint_world.z+.20*head_scale-.040)')
replace_one("'v5_head_scale':.35", "'v5_head_scale':.357,'v5_owner_head_increase_pct':2.0,'v5_owner_shorter_neck_m':.010")
exec(compile(source,'brooke_v5_owner_native_neck_derived.py','exec'),globals())
