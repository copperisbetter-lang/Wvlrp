#!/usr/bin/env python3
"""Read-only GLB source inspection. No mesh/material/rig modifications."""
import hashlib
import json
import struct
import sys
from pathlib import Path

EXPECTED_SHA256 = "1f30b81b2e59484251ba71ecef6c0987ca4ea9172534340c6c156dddead976a4"
EXPECTED_SIZE = 21314700

def parse_glb(path):
    blob = Path(path).read_bytes()
    sha = hashlib.sha256(blob).hexdigest()
    if len(blob) != EXPECTED_SIZE or sha != EXPECTED_SHA256:
        raise ValueError("Source validation FAILED: actual %d bytes SHA256 %s" % (len(blob), sha))
    if len(blob) < 20:
        raise ValueError("Truncated GLB")
    magic, version, size = struct.unpack_from("<4sII", blob, 0)
    if (magic, version, size) != (b"glTF", 2, len(blob)):
        raise ValueError("Invalid GLB header/version/declared length")
    off = 12
    chunks = []
    while off + 8 <= len(blob):
        ln, typ = struct.unpack_from("<I4s", blob, off)
        off += 8
        if off + ln > len(blob):
            raise ValueError("GLB chunk exceeds source length")
        chunks.append((typ, blob[off:off + ln]))
        off += ln
    if off != len(blob) or not chunks or chunks[0][0] != b"JSON":
        raise ValueError("GLB chunks malformed")
    doc = json.loads(chunks[0][1].decode("utf-8"))
    if doc.get("asset", {}).get("version") != "2.0":
        raise ValueError("Not glTF 2.0")
    return blob, sha, doc, chunks

def inspect(path):
    blob, sha, d, chunks = parse_glb(path)
    meshes = d.get("meshes", [])
    materials = d.get("materials", [])
    animations = d.get("animations", [])
    skins = d.get("skins", [])
    nodes = d.get("nodes", [])
    accessors = d.get("accessors", [])
    views = d.get("bufferViews", [])
    candidate = []
    primitive_details = []
    problems = []
    terms = ("bikini", "swim", "gold", "bra", "top", "bottom", "cloth", "panty")
    for mi, m in enumerate(meshes):
        for pi, p in enumerate(m.get("primitives", [])):
            attrs = p.get("attributes", {})
            matid = p.get("material")
            matname = materials[matid].get("name", "") if isinstance(matid, int) and 0 <= matid < len(materials) else None
            data = {
                "mesh": mi, "mesh_name": m.get("name", ""),
                "primitive": pi, "material_id": matid, "material_name": matname,
                "mode": p.get("mode", 4),
                "attributes": sorted(attrs.keys()),
                "vertex_count": accessors[attrs["POSITION"]].get("count") if isinstance(attrs.get("POSITION"), int) and attrs["POSITION"] < len(accessors) else None,
                "index_count": accessors[p["indices"]].get("count") if isinstance(p.get("indices"), int) and p["indices"] < len(accessors) else None,
                "morph_target_count": len(p.get("targets", [])),
                "joint_weights_present": "JOINTS_0" in attrs and "WEIGHTS_0" in attrs
            }
            primitive_details.append(data)
            if any(t in (str(matname) + " " + str(m.get("name", ""))).lower() for t in terms):
                candidate.append({"mesh": mi, "primitive": pi, "material_name": matname, "mesh_name": m.get("name", "")})
            for name, ai in list(attrs.items()) + ([("indices", p["indices"])] if "indices" in p else []):
                if not isinstance(ai, int) or ai < 0 or ai >= len(accessors):
                    problems.append("Primitive %d/%d attribute %s invalid accessor" % (mi, pi, name))
    for i, a in enumerate(accessors):
        if "bufferView" in a:
            vi = a["bufferView"]
            if not isinstance(vi, int) or vi < 0 or vi >= len(views):
                problems.append("Accessor %d invalid bufferView" % i)
    for i, skin in enumerate(skins):
        for joint in skin.get("joints", []):
            if not isinstance(joint, int) or joint < 0 or joint >= len(nodes):
                problems.append("Skin %d invalid bone node" % i)
    for i, anim in enumerate(animations):
        chans = anim.get("channels", [])
        samples = anim.get("samplers", [])
        for j, c in enumerate(chans):
            if not isinstance(c.get("sampler"), int) or c["sampler"] >= len(samples):
                problems.append("Animation %d channel %d invalid sampler" % (i, j))
    return {
        "inspection_type": "metadata and GLB structural scan of genuine GitHub source bytes; NOT Blender posing QA",
        "source": str(path),
        "source_size": len(blob),
        "source_sha256": sha,
        "source_bytes_verified_against_existing_QA": True,
        "glb_chunk_types": [c[0].decode("ascii", "replace") for c in chunks],
        "counts": {
            "meshes": len(meshes), "mesh_primitives": len(primitive_details),
            "nodes": len(nodes), "skins": len(skins), "animations": len(animations),
            "materials": len(materials), "textures": len(d.get("textures", [])),
            "accessors": len(accessors), "buffer_views": len(views)
        },
        "skin_joint_counts": [len(s.get("joints", [])) for s in skins],
        "mesh_nodes": [{"node_index": i, "name": n.get("name"), "mesh": n.get("mesh"), "skin": n.get("skin")} for i, n in enumerate(nodes) if "mesh" in n],
        "material_names": [m.get("name", "(unnamed)") for m in materials],
        "candidate_clothing_primitives_by_name_only": candidate,
        "primitives": primitive_details,
        "animation_clip_names": [a.get("name", "(unnamed)") for a in animations],
        "structural_issues": problems,
        "limits": [
            "Material and mesh naming do not prove a separate removable bikini exists",
            "No seam welding, deformation, collision or posing tests done by this check",
            "No private Round 01 or Round 03 asset was accessed or published",
            "No source geometry, skin, original gold outfit or existing animation was changed"
        ]
    }

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: inspect_gina5.py SOURCE.glb REPORT.json")
    report = inspect(sys.argv[1])
    target = Path(sys.argv[2])
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Verified original", report["source_size"], report["source_sha256"])
    print("Counts:", report["counts"])
    print("Clothing candidate primitives:", report["candidate_clothing_primitives_by_name_only"])
    print("Issues:", report["structural_issues"])
    if report["structural_issues"]:
        raise SystemExit("Structural report contains issues; see report")
