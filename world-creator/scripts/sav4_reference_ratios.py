"""Generate auditable SAV4 reference ratios from the two stored movie stills.

These are projected 2D measurements, not true 3D facial dimensions.
Run: python world-creator/scripts/sav4_reference_ratios.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "characters/sav4/laura-two-view-landmarks.json"
OUTPUT = ROOT / "characters/sav4/laura-projected-ratios.json"

def distance(a, b):
    return math.dist(a, b)

def calculate(data):
    front = data["front_three_quarter"]
    profile = data["profile"]
    eyes = distance(*front["eye_centers"])
    mouth = distance(*front["mouth_corners"])
    nose_mouth = distance(front["nose_tip"], front["mouth_center"])
    mouth_chin = distance(front["mouth_center"], front["chin"])
    profile_nose_lip = distance(profile["nose_tip"], profile["lip_contour"])
    profile_lip_chin = distance(profile["lip_contour"], profile["chin_contour"])
    if min(eyes, mouth, nose_mouth, mouth_chin, profile_nose_lip, profile_lip_chin) <= 0:
        raise ValueError("Reference landmark distance must be positive")
    return {
        "method": "manual projected two-view pixel landmark ratios",
        "source": str(SOURCE.relative_to(ROOT)),
        "status": "2D perspective-only; NOT calibrated 3D target geometry",
        "front": {
            "mouth_width_over_eye_separation": mouth / eyes,
            "nose_to_mouth_over_eye_separation": nose_mouth / eyes,
            "mouth_to_chin_over_eye_separation": mouth_chin / eyes,
            "mouth_to_chin_over_lower_face": mouth_chin / (nose_mouth + mouth_chin),
        },
        "profile": {
            "nose_to_lip_over_lip_to_chin": profile_nose_lip / profile_lip_chin,
            "nose_to_ear_projected": distance(profile["nose_tip"], profile["ear_center"]),
            "chin_to_jaw_back_projected": distance(profile["chin_contour"], profile["jaw_back"]),
        },
        "next_step": "Measure matching projected landmarks on SAV4 front/three-quarter and profile renders using a fixed camera; map verified facial mesh vertex IDs before applying target displacements.",
    }

if __name__ == "__main__":
    result = calculate(json.loads(SOURCE.read_text()))
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
