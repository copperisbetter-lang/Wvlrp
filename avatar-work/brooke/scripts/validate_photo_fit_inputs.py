"""Validate inputs for Brooke MPFB photographic fit. Fail closed on missing references.
Run: python3 avatar-work/brooke/scripts/validate_photo_fit_inputs.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
manifest = ROOT / "avatar-work/brooke/reference-landmarks.template.json"
base = ROOT / "world-creator/assets/morph-head-clone.glb"
required = {
    "front": ("left_eye_outer", "left_eye_inner", "right_eye_inner", "right_eye_outer",
              "nose_tip", "mouth_left", "mouth_right", "chin", "left_jaw", "right_jaw"),
    "left_three_quarter": (),
    "right_three_quarter": (),
}
errors = []
if not base.is_file():
    errors.append(f"Missing approved MPFB head source: {base}")
if not manifest.is_file():
    errors.append(f"Missing manifest: {manifest}")
else:
    data = json.loads(manifest.read_text())
    views = {v.get("view"): v for v in data.get("views", [])}
    if not data.get("license_record"):
        errors.append("Reference-photo provenance/license record is missing")
    for name, keys in required.items():
        v = views.get(name)
        if not v:
            errors.append(f"Missing view: {name}")
            continue
        image = v.get("image_path")
        if not image or not (ROOT / image).is_file():
            errors.append(f"{name}: approved reference image is absent")
        for k in keys:
            pt = v.get("landmarks_normalized", {}).get(k)
            if not isinstance(pt, list) or len(pt) != 2 or any(
                not isinstance(t, (int, float)) or not 0 <= t <= 1 for t in pt
            ):
                errors.append(f"{name}: missing/invalid landmark {k}")
if errors:
    print("PHOTO_TO_MPFB_FIT_BLOCKED:")
    for e in errors:
        print(" -", e)
    raise SystemExit(2)
print("PHOTO_TO_MPFB_INPUTS_VALIDATED; fitting may proceed after topology inspection")
