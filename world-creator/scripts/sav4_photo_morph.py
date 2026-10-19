"""Photo landmark -> MPFB fitting plan, without inventing 3D correspondences.

Usage:
 python world-creator/scripts/sav4_photo_morph.py \
   world-creator/characters/sav4/laura-two-view-landmarks.json \
   world-creator/characters/sav4/laura-photo-fit-plan.json

Image landmarks are projected 2D coordinates. A human-reviewed Blender
vertex correspondence map is required before producing any .target morph.
"""
import argparse
import json
import math
from pathlib import Path


def distance(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def build_plan(reference):
    front = reference["front_three_quarter"]
    side = reference["profile"]
    for view in (front, side):
        width, height = view["size"]
        if width <= 0 or height <= 0:
            raise ValueError("Invalid photograph dimensions")
    eye_span = distance(*front["eye_centers"])
    mouth_span = distance(*front["mouth_corners"])
    nose_mouth = distance(front["nose_tip"], front["mouth_center"])
    mouth_chin = distance(front["mouth_center"], front["chin"])
    profile_nose_lip = distance(side["nose_tip"], side["lip_contour"])
    profile_lip_chin = distance(side["lip_contour"], side["chin_contour"])
    if min(eye_span, mouth_span, nose_mouth, mouth_chin,
           profile_nose_lip, profile_lip_chin) <= 0:
        raise ValueError("Degenerate photograph landmarks")
    return {
        "method": "two-view projected landmark fitting plan",
        "reference_images": [front["image"], side["image"]],
        "reference_ratios": {
            "mouth_width_over_eye_spacing": mouth_span / eye_span,
            "nose_to_mouth_over_eye_spacing": nose_mouth / eye_span,
            "mouth_to_chin_over_eye_spacing": mouth_chin / eye_span,
            "profile_nose_lip_over_lip_chin": profile_nose_lip / profile_lip_chin,
        },
        "projection_warning": "These are perspective-image ratios, NOT physical 3D dimensions.",
        "required_before_morph": [
            "Identify matching eye, nose, mouth, chin vertices on SAV4 in Blender",
            "Render SAV4 with camera views matched to both reference photos",
            "Compare 2D projected SAV4 landmarks against these measured ratios",
            "Solve bounded per-region displacements and review front/profile renders",
            "Export reviewed displacements with sav4_maketarget.py",
        ],
        "status": "reference measured; 3D correspondences and fitted target pending",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("reference", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    plan = build_plan(json.loads(args.reference.read_text()))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(plan, indent=2) + "\n")
    print("Wrote photo fitting plan:", args.output)


if __name__ == "__main__":
    main()
