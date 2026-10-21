#!/usr/bin/env python3
"""Validate a 3DDFA OBJ before attempting MakeHuman topology transfer."""
import argparse
from pathlib import Path

def validate(path: Path):
    vertices = []
    faces = 0
    bad_faces = 0
    for line in path.open("r", encoding="utf-8", errors="replace"):
        if line.startswith("v "):
            parts = line.split()
            if len(parts) >= 4:
                xyz = tuple(float(x) for x in parts[1:4])
                if all(abs(x) < 1e8 and x == x for x in xyz):
                    vertices.append(xyz)
        elif line.startswith("f "):
            refs = [p.split("/")[0] for p in line.split()[1:]]
            if len(refs) < 3:
                bad_faces += 1
                continue
            try:
                ids = [int(v) for v in refs]
                if any(i == 0 or (i > 0 and i > len(vertices)) or (i < 0 and -i > len(vertices)) for i in ids):
                    bad_faces += 1
            except ValueError:
                bad_faces += 1
            faces += 1
    if not vertices or not faces or bad_faces:
        raise SystemExit(f"INVALID OBJ: vertices={len(vertices)} faces={faces} bad_faces={bad_faces}")
    mins = [min(v[i] for v in vertices) for i in range(3)]
    maxs = [max(v[i] for v in vertices) for i in range(3)]
    print(f"VALID OBJ: vertices={len(vertices)}, faces={faces}, bounds={list(zip(mins,maxs))}")
    return 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("obj", type=Path)
    args = parser.parse_args()
    raise SystemExit(validate(args.obj))
