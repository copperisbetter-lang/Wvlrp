"""Laura stage 1: official MPFB basemesh and official MakeHuman targets only.

This stage does not crop, export a GLB, construct hair, or touch protected avatars.
Run inside Blender with MPFB installed and official system target assets available.
"""
import bpy
from pathlib import Path
from bl_ext.wvlrp_local.mpfb.services.humanservice import HumanService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.locationservice import LocationService
from bl_ext.wvlrp_local.mpfb.entities.objectproperties import HumanObjectProperties

ROOT = Path(__file__).resolve().parents[1]
# Explicit reviewed list only: never invent or silently substitute targets.
TARGETS = ROOT / "characters" / "laura" / "official-target-stack.tsv"
if not TARGETS.is_file():
    raise RuntimeError("No reviewed official MakeHuman target stack: " + str(TARGETS))
rows = []
for line in TARGETS.read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    fields = line.split("\t")
    if len(fields) != 2:
        raise ValueError("Expected tab-separated official target name and weight: " + line)
    name, weight_text = fields
    weight = float(weight_text)
    if not 0.0 <= weight <= 1.0:
        raise ValueError("Target weight outside [0,1]: " + name)
    path = TargetService.target_full_path(name)
    if not path or not Path(path).is_file():
        raise RuntimeError("Official MakeHuman target unavailable: " + name)
    rows.append((name, weight, path))
if not rows:
    raise RuntimeError("No reviewed targets selected. Refusing a neutral-face export.")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
human = HumanService.create_human()
human.name = "Laura MPFB native target stage"
for name, value in (("gender", 0.0), ("age", .38), ("weight", .40),
                    ("muscle", .28), ("height", .52), ("proportions", .47)):
    HumanObjectProperties.set_value(name, value, entity_reference=human)
TargetService.reapply_macro_details(human)
for name, weight, path in rows:
    TargetService.load_target(human, path, weight=weight)
for name, weight, _ in rows:
    if abs(TargetService.get_target_value(human, name) - weight) > .0001:
        raise RuntimeError("Target verification failed: " + name)
out = ROOT / "assets" / "laura-mpfb-native-stage.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(out))
print("LAURA_MPFB_TARGET_STAGE_SUCCESS", len(rows), str(out))
