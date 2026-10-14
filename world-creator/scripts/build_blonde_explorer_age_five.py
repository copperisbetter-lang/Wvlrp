"""Build a separate five-year-old explorer using the existing continuous MakeHuman pipeline.
Run with Blender Python after the same MPFB/MakeHuman dependencies as build_young_explorer_real.py.
Never modifies Jenny or Penny assets.
"""
from pathlib import Path
import runpy
import bpy

BASE=Path(__file__).with_name('build_young_explorer_real.py')
source=BASE.read_text()
changes={
"OUT=ROOT/'assets'/'young-explorer-olive-plaid.glb'":"OUT=ROOT/'assets'/'blonde-explorer-age-five.glb'",
"'age':.125":"'age':.0833333333",
"assert abs(age-.125)<.001":"assert abs(age-.0833333333)<.001",
"scale_factor=1.22/built_height":"scale_factor=1.08/built_height",
"if not 1.19<scaled_height<1.25:":"if not 1.05<scaled_height<1.11:",
"m.name='Young Explorer naturally brown hair '+str(index)":"m.name='Five-year-old explorer blonde hair '+str(index)",
"nd.inputs['Base Color'].default_value=(.205,.107,.065,1)":"nd.inputs['Base Color'].default_value=(.68,.49,.20,1)",
"olive_skin(body)":"olive_skin(body)",
}
for old,new in changes.items():
    if old not in source:
        raise RuntimeError('Upstream character generator changed: '+old)
    source=source.replace(old,new)
# Avoid replacing the olive_skin function declaration: change only its call.
source=source.replace("    olive_skin(body)\n","    preserve_five_year_old_skin(body)\n")
source=source.replace("young-explorer-real-full-body-preview.png","blonde-explorer-age-five-preview.png")
source=source.replace("def olive_skin(body):","def preserve_five_year_old_skin(body):")
# Preserve source UV photographic skin instead of applying the original olive tint.
start=source.index("def preserve_five_year_old_skin(body):")
end=source.index("\ndef ",start+5)
source=source[:start]+"""def preserve_five_year_old_skin(body):
    preserve_photo_skin(body,'Young Explorer')
    print('FIVE_YEAR_OLD_PHOTO_SKIN_PRESERVED')
""" + source[end:]
source=source.replace("assert len(meta.get('skins',[{}])[0].get('joints',[]))>=25",
"""joint_count=len(meta.get('skins',[{}])[0].get('joints',[]))
    if joint_count != 56:
        raise RuntimeError(f'56-bone requirement unmet: exported {joint_count} joints')""")
anchor="    for b in all_bones:\n        if normalized(b.name) in arm_corrections:"
assert anchor in source, 'Animation insertion point missing'
source=source.replace(anchor, "    clip('Young Explorer Run',[(1,{}),(7,{'leftupleg':(.47,0,0),'rightupleg':(-.47,0,0),'leftleg':(.25,0,0),'rightleg':(.8,0,0),'leftarm':(-.32,0,0),'rightarm':(.32,0,0)}),(13,{'leftupleg':(-.47,0,0),'rightupleg':(.47,0,0),'leftleg':(.8,0,0),'rightleg':(.25,0,0),'leftarm':(.32,0,0),'rightarm':(-.32,0,0)}),(19,{})])\n    clip('Young Explorer Sit',[(1,{}),(14,{'leftupleg':(-1.2,0,0),'rightupleg':(-1.2,0,0),'leftleg':(1.25,0,0),'rightleg':(1.25,0,0)}),(35,{'leftupleg':(-1.2,0,0),'rightupleg':(-1.2,0,0),'leftleg':(1.25,0,0),'rightleg':(1.25,0,0)}),(48,{})])\n    clip('Young Explorer Bend and Pick Up',[(1,{}),(14,{'spine':(.55,0,0),'leftupleg':(-.25,0,0),'rightupleg':(-.25,0,0),'leftarm':(.5,0,0),'rightarm':(.5,0,0)}),(26,{'spine':(.8,0,0),'leftupleg':(-.45,0,0),'rightupleg':(-.45,0,0),'leftleg':(.5,0,0),'rightleg':(.5,0,0),'leftarm':(.85,0,0),'rightarm':(.85,0,0)}),(40,{})])\n    clip('Young Explorer Crouch',[(1,{}),(15,{'leftupleg':(-1.1,0,0),'rightupleg':(-1.1,0,0),'leftleg':(1.5,0,0),'rightleg':(1.5,0,0),'spine':(.18,0,0)}),(30,{})])\n    clip('Young Explorer Jump',[(1,{}),(8,{'leftupleg':(-.4,0,0),'rightupleg':(-.4,0,0),'leftleg':(.65,0,0),'rightleg':(.65,0,0)}),(15,{'leftupleg':(.18,0,0),'rightupleg':(.18,0,0),'leftarm':(-.45,0,0),'rightarm':(-.45,0,0)}),(22,{'leftupleg':(-.3,0,0),'rightupleg':(-.3,0,0),'leftleg':(.5,0,0),'rightleg':(.5,0,0)}),(30,{})])\n"+anchor)
source=source.replace("if __name__=='__main__':","if __name__=='__build_original_disabled__':")
scope={'__name__':'five_year_old_build','__file__':str(BASE)}
exec(compile(source,str(BASE),'exec'),scope)
scope['main']()
print('FIVE_YEAR_OLD_EXPLORER_GLB_BUILT',scope['OUT'])

# A push to this script triggers the dedicated GitHub Actions Blender build.
