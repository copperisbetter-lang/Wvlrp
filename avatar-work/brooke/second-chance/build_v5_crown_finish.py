"""Brooke V5 crown refinement on verified +2%-head/native-neck owner fit.
Derived clone only. Preserve preceding V5 GLB and all original characters.
"""
from pathlib import Path
owner=Path('avatar-work/brooke/second-chance/build_v5_owner_fit.py').read_text()
def patch(old,new):
    global owner
    assert owner.count(old)==1, f'V5 crown patch anchor failure: {old[:70]}'
    owner=owner.replace(old,new,1)
patch('brooke-3-1-v5-owner-fit.glb','brooke-3-1-v5-crown-trial.glb')
patch('brooke-3-1-v5-owner-fit-check.json','brooke-3-1-v5-crown-check.json')
old_exec="exec(compile(source,'brooke_v5_owner_native_neck_derived.py','exec'),globals())"
assert owner.count(old_exec)==1
interpose="""# Finish the top/back hair curve without altering the photo face.
# The portrait scan was a shallow wedge at the back. Preserve its UV/texture
# and lift only upper hair vertices into a more rounded contour.
old_crown="crown=.215*smooth((y-.285)/.155)*max(0,1-(x/.47)**2)**1.25 * max(0,1-((z+.01)/.52)**2)**.45"
new_crown="crown=.215*smooth((y-.285)/.155)*max(0,1-(x/.47)**2)**1.25 * max(0,1-((z+.01)/.52)**2)**.45 + .065*smooth((y-.34)/.10)*max(0,1-(x/.34)**2)**1.45 * max(0,1-((z+.035)/.34)**2)**1.55"
assert source.count(old_crown)==1, 'Crown expression changed; inspect manually'
source=source.replace(old_crown,new_crown,1)
assert source.count("'v5_owner_shorter_neck_m':.010")==1
source=source.replace("'v5_owner_shorter_neck_m':.010", "'v5_owner_shorter_neck_m':.010,'v5_crown_extra_peak_source_m':.065",1)
exec(compile(source,'brooke_v5_crown_derived_source.py','exec'),globals())
"""
owner=owner.replace(old_exec,interpose,1)
exec(compile(owner,'brooke_v5_crown_derived_owner.py','exec'),globals())
