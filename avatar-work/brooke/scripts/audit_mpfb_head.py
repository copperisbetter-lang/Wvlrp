"""Inventory the actual approved MakeHuman/MPFB GLB before photo fitting.

Usage: python3 avatar-work/brooke/scripts/audit_mpfb_head.py
No third-party dependencies. Never modifies source or production.
"""
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parents[3]
src = root / "world-creator/assets/morph-head-clone.glb"
if not src.exists():
    raise SystemExit(f"BLOCKED: MPFB source missing: {src}")
with src.open("rb") as f:
    header = f.read(12)
    if len(header) != 12:
        raise SystemExit("BLOCKED: truncated GLB")
    magic, version, total = struct.unpack("<4sII", header)
    if magic != b"glTF" or version != 2 or total != src.stat().st_size:
        raise SystemExit("BLOCKED: invalid GLB header/size")
    length, kind = struct.unpack("<I4s", f.read(8))
    if kind != b"JSON":
        raise SystemExit("BLOCKED: missing GLB JSON chunk")
    gltf = json.loads(f.read(length))
nodes = gltf.get("nodes", [])
meshes = gltf.get("meshes", [])
materials = gltf.get("materials", [])
morphs = []
for index, mesh in enumerate(meshes):
    for pindex, primitive in enumerate(mesh.get("primitives", [])):
        targets = primitive.get("targets", [])
        if targets:
            morphs.append({"mesh": index, "primitive": pindex, "targets": len(targets),
                           "names": mesh.get("extras", {}).get("targetNames", [])})
print(json.dumps({
    "source": str(src.relative_to(root)), "bytes": src.stat().st_size,
    "nodes": len(nodes), "meshes": len(meshes), "materials": len(materials),
    "skins": len(gltf.get("skins", [])), "animations": len(gltf.get("animations", [])),
    "morph_target_groups": morphs,
    "mesh_names": [m.get("name", f"mesh-{i}") for i, m in enumerate(meshes)],
}, indent=2))
if not meshes:
    raise SystemExit("BLOCKED: no mesh in approved MPFB source")
if not morphs:
    print("WARNING: No GLB morph targets. Native MPFB parameters may not be embedded;"
          " photo fit needs a verified non-destructive mesh-deformation method.")
