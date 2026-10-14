"""Temporary adult Carol pelvic ×10 exaggeration for mesh location diagnosis.

Export a SECOND GLB; leave the normal Carol inspection GLB and saved source untouched.
The base sculpt uses visibility multiplier 4.0; this deliberately magnifies
ONLY its displacement from its original rollback key 10× (effective 40.0).
It must not be used for gameplay or judged as realistic anatomy.
"""
import bpy, os, runpy, sys
from pathlib import Path

here=Path(__file__).resolve().parent
marked=[o for o in bpy.data.objects if o.get("wvlrp_caroline_export_root",False)]
if len(marked)!=1:
    raise RuntimeError("Carol x10: expected exactly one export character root")
members=[marked[0]]+list(marked[0].children_recursive)
models=[o for o in members if o.type=="MESH" and o.get("wvlrp_carol_pelvic_contour_baked",False)]
if len(models)!=1:
    raise RuntimeError("Carol x10: pelvic contour basemesh not found")
body=models[0]
keys=body.data.shape_keys.key_blocks if body.data.shape_keys else None
if not keys or "Carol pelvic contour OFF - inspection rollback" not in keys:
    raise RuntimeError("Carol x10: original geometry rollback key missing")
original=keys["Carol pelvic contour OFF - inspection rollback"]
basis=keys[0]
if original.value!=0.0:
    raise RuntimeError("Carol x10: rollback key must start disabled")
n=0
peak=0.0
# Each delta from rollback is EXACTLY the earlier 4x sculpt, not the original
# MakeHuman pelvis or the glute/face changes. Amplify only that identified delta.
for i in range(len(basis.data)):
    delta=basis.data[i].co-original.data[i].co
    size=delta.length
    if size<0.00005:
        continue
    for key in keys:
        if key.name!=original.name:
            key.data[i].co+=delta*9.0
    n+=1
    peak=max(peak,size*10.0)
if n<75:
    raise RuntimeError("Carol x10: not enough pelvic contour vertices to inspect")
body.data.update()
body["wvlrp_carol_pelvic_x10_diagnostic"]=True
print("WVLRP_CAROL_PELVIC_X10_READY",n,"vertices",
      "max_exaggerated_displacement_mm",round(peak*1000,2),
      "base_multiplier",4,"test_multiplier",40,
      "original_point_from_MakeHuman_unmodified",True)
os.environ["CAROL_GLTF_OUTPUT"]="caroline-pelvic-x10-inspection.glb"
runpy.run_path(str(here/"export_caroline_glb.py"),run_name="__main__")
