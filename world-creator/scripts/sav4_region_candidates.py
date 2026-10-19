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


# Provisional geometric candidate zones measured from the actual SAV4
# front/profile point-cloud. These require visual verification in Blender.
FACIAL_CANDIDATE_ZONES = {
    "nose_bridge": lambda x,y,z: abs(x)<.014 and 1.522<z<1.539 and y<-.145,
    "nose_tip": lambda x,y,z: abs(x)<.015 and 1.500<z<1.522 and y<-.145,
    "upper_lip": lambda x,y,z: abs(x)<.030 and 1.488<z<1.497 and y<-.140,
    "lower_lip": lambda x,y,z: abs(x)<.030 and 1.476<z<1.487 and y<-.140,
    "mouth_corners": lambda x,y,z: .024<abs(x)<.039 and 1.476<z<1.490 and y<-.130,
}

def propose_regions(path):
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))
    result = {name: [] for name in FACIAL_CANDIDATE_ZONES}
    for row in rows:
        x,y,z = (float(row[k]) for k in ("x", "y", "z"))
        matches = [name for name, test in FACIAL_CANDIDATE_ZONES.items()
                   if test(x,y,z)]
        if len(matches) == 1:
            result[matches[0]].append(int(row["vertex_id"]))
    return {
        "status": "CANDIDATES_ONLY_NOT_VALIDATED",
        "warning": "Must inspect vertices in Blender before use as a calibrated map.",
        "regions": result,
        "counts": {name: len(ids) for name, ids in result.items()},
    }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: sav4_region_candidates.py face-vertices.csv")
    print(json.dumps({"analysis": analyze(Path(sys.argv[1])), "candidates": propose_regions(Path(sys.argv[1]))}, indent=2))
