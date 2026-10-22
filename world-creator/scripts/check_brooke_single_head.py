#!/usr/bin/env python3
"""Brooke single-head OBJ sanity gate. Run after 3DDFA single-face patch."""
import argparse
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument("obj", type=Path)
a = p.parse_args()
verts, faces = [], []
for line in a.obj.read_text(errors="replace").splitlines():
    if line.startswith("v "):
        vals = line.split()
        verts.append(tuple(float(x) for x in vals[1:4]))
    elif line.startswith("f "):
        faces.append(tuple(int(x.split("/")[0]) for x in line.split()[1:]))
if len(verts) < 100 or len(faces) < 100:
    raise SystemExit(f"FAIL: incomplete OBJ ({len(verts)} vertices, {len(faces)} faces)")
if any(not (1 <= i <= len(verts)) for face in faces for i in face):
    raise SystemExit("FAIL: invalid face index")
# Count connected components of the actual triangle/face topology.
parent = list(range(len(verts)))
def root(i):
    while parent[i] != i:
        parent[i] = parent[parent[i]]
        i = parent[i]
    return i
for face in faces:
    first = face[0] - 1
    for v in face[1:]:
        x, y = root(first), root(v - 1)
        parent[x] = y
from collections import Counter
sizes = Counter(root(i) for f in faces for i in (v-1 for v in f))
large = [n for n in sizes.values() if n >= 100]
print(f"OBJ: {len(verts)} vertices; {len(faces)} faces; {len(large)} large connected components")
if len(large) != 1:
    raise SystemExit("FAIL: expected exactly one substantial connected facial mesh")
print("PASS: single substantial connected mesh; visual likeness and full-skull completeness still require inspection")
