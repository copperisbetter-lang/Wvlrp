"""Extract normalized facial landmarks from locally supplied, authorized Brooke photos.

Dependencies: pip install mediapipe==0.10.21 opencv-python-headless
Usage:
 python extract_photo_landmarks.py --front path/to/front.jpg \
   --left path/to/left.jpg --right path/to/right.jpg \
   --license-record 'User-supplied reference photographs' \
   --output avatar-work/brooke/reference-landmarks.json

Never guesses missing measurements; never fetches copyrighted photos.
The output is a new file, leaving the unfilled template untouched.
"""
import argparse
import json
from pathlib import Path

KEYS = {
    "left_eye_outer": 33, "left_eye_inner": 133,
    "right_eye_inner": 362, "right_eye_outer": 263,
    "nose_tip": 1, "mouth_left": 61, "mouth_right": 291,
    "chin": 152, "left_jaw": 172, "right_jaw": 397,
}

def main():
    parser = argparse.ArgumentParser()
    for name in ("front", "left", "right"):
        parser.add_argument("--" + name, required=True, type=Path)
    parser.add_argument("--license-record", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    import cv2
    import mediapipe as mp
    views = []
    with mp.solutions.face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1,
                                        refine_landmarks=True,
                                        min_detection_confidence=0.5) as detector:
        for view, file in (("front", args.front),
                           ("left_three_quarter", args.left),
                           ("right_three_quarter", args.right)):
            if not file.is_file():
                raise SystemExit(f"Missing authorized image: {file}")
            frame = cv2.imread(str(file))
            if frame is None:
                raise SystemExit(f"Cannot read image: {file}")
            h, w = frame.shape[:2]
            result = detector.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if not result.multi_face_landmarks or len(result.multi_face_landmarks) != 1:
                raise SystemExit(f"Exactly one detectable face required: {file}")
            points = result.multi_face_landmarks[0].landmark
            coords = {key: [round(points[idx].x, 6), round(points[idx].y, 6)]
                      for key, idx in KEYS.items()}
            if any(not 0 <= c <= 1 for p in coords.values() for c in p):
                raise SystemExit(f"Face landmarks outside image: {file}")
            views.append({"view": view, "image_path": str(file),
                          "image_width": w, "image_height": h,
                          "landmarks_normalized": coords})
    manifest = {"schema_version": 1, "subject": "Brooke",
                "status": "landmarks-extracted-awaiting-human-approval",
                "views": views, "license_record": args.license_record,
                "coordinate_convention": "x rightward, y downward; normalized 0..1"}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.exists():
        raise SystemExit(f"Refusing to overwrite existing manifest: {args.output}")
    args.output.write_text(json.dumps(manifest, indent=2) + "\n")
    print("BROOKE_LANDMARKS_EXTRACTED_REVIEW_REQUIRED", args.output)

if __name__ == "__main__":
    main()
