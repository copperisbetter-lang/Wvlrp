"""Validate Brooke three-photo landmark annotations before fitting.
Usage: python3 avatar-work/brooke/check_landmarks.py annotations.json
Incomplete template data is intentionally rejected.
"""
import json
import math
import sys
from pathlib import Path

REQUIRED = {
    "front": ("left_eye_outer", "left_eye_inner", "right_eye_inner",
              "right_eye_outer", "nose_tip", "mouth_left", "mouth_right",
              "chin", "left_jaw", "right_jaw"),
    "left_three_quarter": ("left_eye_outer", "nose_tip", "mouth_left", "chin"),
    "right_three_quarter": ("right_eye_outer", "nose_tip", "mouth_right", "chin"),
}

def check(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    assert data.get("schema_version") == 1, "Unsupported landmark schema"
    views = data.get("views", [])
    assert len(views) == 3, "Exactly three views required"
    by_name = {v["view"]: v for v in views}
    assert set(by_name) == set(REQUIRED), "Expected front, left and right views"
    for name, required in REQUIRED.items():
        view = by_name[name]
        assert view.get("image_path"), f"{name}: image path missing"
        for field in ("image_width", "image_height"):
            value = view.get(field)
            assert isinstance(value, int) and value > 0, f"{name}: invalid {field}"
        points = view.get("landmarks_normalized", {})
        for landmark in required:
            xy = points.get(landmark)
            assert isinstance(xy, list) and len(xy) == 2, f"{name}: {landmark} missing"
            assert all(isinstance(n, (int, float)) and math.isfinite(n) and 0 <= n <= 1 for n in xy), f"{name}: {landmark} outside image"
    assert data.get("license_record"), "Record photo rights/authorization before use"
    print("PASS: all three annotated reference views are ready for supervised fitting")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 check_landmarks.py annotations.json")
    check(sys.argv[1])
