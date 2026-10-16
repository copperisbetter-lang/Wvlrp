"""Build Sav 3 adult; require exactly 56 exported skeletal joints."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
base = root / "scripts" / "build_vulva2_female18.py"
source = base.read_text(encoding="utf-8")
old = 'OUT=ROOT/"assets"/"vulva2-female18-inspection.glb"'
if source.count(old) != 1:
    raise RuntimeError("Upstream adult builder output definition changed")
source = source.replace(old, 'OUT=ROOT/"assets"/"sav3-adult-inspection.glb"')
source = source.replace('h.name="Vulva2 Test Adult Female 18"', 'h.name="Sav 3 Adult Female 18"')
source = source.replace('print("VULVA2_FEMALE18_BUILD_SUCCESS"', 'print("SAV3_ADULT_BUILD_SUCCESS"')
anchor = 'if not glb.get("skins"):raise RuntimeError("Model lost rig skinning")'
if source.count(anchor) != 1:
    raise RuntimeError("Exported skin validation anchor missing")
source = source.replace(anchor, anchor + '''
joint_ids = set()
for skin in glb["skins"]:
    joint_ids.update(skin.get("joints", []))
if len(joint_ids) != 56:
    raise RuntimeError(f"Sav 3 requires 56 exported skeletal joints; found {len(joint_ids)}")
print("SAV3_56_JOINTS_VERIFIED", len(joint_ids))
''')
exec(compile(source, str(base), "exec"), {"__name__": "__main__", "__file__": str(base)})
