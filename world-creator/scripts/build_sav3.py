"""Build Sav 3 from the already-tested adult MakeHuman/Vulva2 pipeline.
Run from repository root in the configured Blender + MPFB build environment:
  blender -b -t 2 --python world-creator/scripts/build_sav3.py
Requires /tmp/mh-system.zip and the installed wvlrp_local MPFB extension.
Never deploy to the public game automatically.
"""
from pathlib import Path
import os

root = Path(__file__).resolve().parents[1]
base = root / "scripts" / "build_vulva2_female18.py"
source = base.read_text(encoding="utf-8")
old = 'OUT=ROOT/"assets"/"vulva2-female18-inspection.glb"'
new = 'OUT=ROOT/"assets"/"sav3-adult-inspection.glb"'
if source.count(old) != 1:
    raise RuntimeError("Upstream adult builder output definition changed")
source = source.replace(old, new)
source = source.replace('h.name="Vulva2 Test Adult Female 18"', 'h.name="Sav 3 Adult Female 18"')
# Preserve the original topology and MHX2 fitting map. No manual offsets.
# 36-inch bust is a circumference target, NOT a MakeHuman cup-size value;
# measure on the exported mesh before claiming it has been achieved.
source = source.replace('("cupsize",.72)', '("cupsize",.72)')
source = source.replace('print("VULVA2_FEMALE18_BUILD_SUCCESS"', 'print("SAV3_ADULT_BUILD_SUCCESS"')
exec(compile(source, str(base), "exec"), {"__name__": "__main__", "__file__": str(base)})
