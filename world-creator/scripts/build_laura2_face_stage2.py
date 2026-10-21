"""Stage 2 Laura 2: preserve the complete clone and export real MPFB face targets.
No procedural vertex sculpting. Never edit Sophie 1 or SAV4.
This is a staging scaffold: requires verified MPFB targets and rig-compatible
topology before producing a morph-enabled GLB.
"""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"assets/laura-2-base.glb"
LANDMARKS=ROOT/"characters/sav4/laura-two-view-landmarks.json"
PLAN=ROOT/"characters/sav4/laura-photo-fit-plan.json"
TARGETS=ROOT/"characters/laura-2/official-face-targets.json"

def main():
    assert BASE.is_file() and BASE.stat().st_size>10000, "Laura 2 cloned base missing"
    reference=json.loads(LANDMARKS.read_text())
    plan=json.loads(PLAN.read_text())
    assert reference["calibration_status"].startswith("uncalibrated")
    assert plan["status"].endswith("pending")
    if not TARGETS.exists():
        raise RuntimeError("STAGE2_NOT_READY: MPFB face target manifest absent. No geometry exported or altered.")
    targets=json.loads(TARGETS.read_text())
    if not targets.get("verified_official_targets"):
        raise RuntimeError("STAGE2_NOT_READY: No verified MPFB face targets. Refusing fake likeness morph.")
    raise RuntimeError("STAGE2_NOT_READY: target-to-Sophie-clone topology mapping and rig compatibility must be verified before export.")

if __name__=="__main__":main()
