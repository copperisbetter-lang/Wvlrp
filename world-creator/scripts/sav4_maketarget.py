"""SAV4 MPFB MakeTarget utilities.

Convert explicit, reviewed basemesh vertex displacements to MPFB .target files.
No face region is guessed from a photograph or head height.
Run: python world-creator/scripts/sav4_maketarget.py offsets.json output.target
Input: {"mesh_vertex_count": 19158, "offsets": [{"vertex_id": 123, "dx": 0.0, "dy": 0.001, "dz": 0.0}]}
Offsets are in Blender coordinates; MPFB stores X,Z,-Y.
"""
import argparse
import json
import math
from pathlib import Path


def encode_target(spec):
    count = spec["mesh_vertex_count"]
    if type(count) is not int or count <= 0:
        raise ValueError("Invalid mesh vertex count")
    offsets = spec["offsets"]
    if not offsets:
        raise ValueError("No reviewed vertex offsets; refusing empty target")
    seen = set()
    lines = ["# SAV4 reviewed MakeTarget morph", "# basemesh hm08"]
    for item in sorted(offsets, key=lambda item: item["vertex_id"]):
        index = item["vertex_id"]
        if type(index) is not int or not 0 <= index < count or index in seen:
            raise ValueError("Invalid or repeated vertex index")
        seen.add(index)
        x, y, z = (item[k] for k in ("dx", "dy", "dz"))
        if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (x, y, z)):
            raise ValueError("Invalid offset")
        if max(abs(x), abs(y), abs(z)) > 0.04:
            raise ValueError("Displacement exceeds 4 cm safety limit")
        if max(abs(x), abs(y), abs(z)) < 0.000001:
            continue
        lines.append(f"{index} {x:.8f} {z:.8f} {-y:.8f}")
    if len(lines) == 2:
        raise ValueError("All offsets zero")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("offsets_json", type=Path)
    parser.add_argument("output_target", type=Path)
    args = parser.parse_args()
    args.output_target.write_text(encode_target(json.loads(args.offsets_json.read_text())))
    print("Saved MPFB target:", args.output_target)
