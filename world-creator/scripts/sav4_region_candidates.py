"""Analyze SAV4 Blender face CSV without inventing verified vertex IDs.

Run: python3 world-creator/scripts/sav4_region_candidates.py face-vertices.csv
This is an inspection report, not a calibrated region map.
"""
import csv
import json
import sys
from pathlib import Path

def analyze(path):
    with open(path, newline="") as f:
        rows = [{k: float(v) if k != "vertex_id" else int(v)
                 for k, v in row.items()} for row in csv.DictReader(f)]
    if not rows:
        raise ValueError("Empty facial calibration CSV")
    ids = [r["vertex_id"] for r in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate mesh vertex IDs")
    # Geometry-only spatial bins. Do NOT call these nose/lip regions:
    # actual identity requires Blender visual/topology inspection.
    bands = [(0.865, 0.89), (0.89, 0.915), (0.915, 0.94),
             (0.94, 0.965), (0.965, 0.995)]
    report = {"status": "candidate analysis only; no morph enabled",
              "vertex_count": len(rows), "bands": []}
    for low, high in bands:
        group = [r for r in rows if low <= r["normalized_height"] < high]
        report["bands"].append({
            "normalized_height": [low, high],
            "count": len(group),
            "central_vertex_ids": [
                r["vertex_id"] for r in sorted(
                    group, key=lambda r: (r["distance_from_centerline"], r["vertex_id"])
                )[:20]
            ],
        })
    return report

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: sav4_region_candidates.py face-vertices.csv")
    print(json.dumps(analyze(Path(sys.argv[1])), indent=2))
