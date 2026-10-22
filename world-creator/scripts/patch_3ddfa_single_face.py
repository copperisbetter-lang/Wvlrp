#!/usr/bin/env python3
"""Patch upstream 3DDFA_V2 demo.py to reconstruct exactly ONE detected face.

Upstream demo uses all detected FaceBoxes; sample Emma photo contains three.
Keep the largest detection (in pixel area) and explicitly reject invalid boxes.
Fail closed if upstream code changes; never silently create multiple heads.
"""
from pathlib import Path
import argparse

p = argparse.ArgumentParser()
p.add_argument("demo", type=Path)
args = p.parse_args()
src = args.demo.read_text(encoding="utf-8")
anchor = "    param_lst, roi_box_lst = tddfa(img, boxes)"
replacement = """    # WVLRP: 3DDFA upstream reconstructs ALL detections by default.
    # Largest detected face is the intended single subject for this sample.
    # For Laura, supply a clear single-subject photo and inspect selection.
    def area(b):
        return max(0.0, float(b[2]) - float(b[0])) * max(0.0, float(b[3]) - float(b[1]))
    boxes = sorted(boxes, key=area, reverse=True)
    if not boxes or area(boxes[0]) <= 0:
        raise RuntimeError('No valid face detection after bounding-box checks')
    print(f'WVLRP single-face gate: selected 1 of {n} detections; box={boxes[0]}', flush=True)
    boxes = boxes[:1]
    assert len(boxes) == 1, 'Exactly one target face is required'
    param_lst, roi_box_lst = tddfa(img, boxes)
    if len(param_lst) != 1 or len(roi_box_lst) != 1:
        raise RuntimeError('Reconstruction returned multiple face parameters')
"""
if src.count(anchor) != 1:
    raise SystemExit(f"Upstream 3DDFA demo.py changed: expected exactly one anchor, found {src.count(anchor)}")
args.demo.write_text(src.replace(anchor, replacement), encoding="utf-8")
print("Patched 3DDFA demo.py: one selected detection, one reconstruction.")
