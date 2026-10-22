#!/usr/bin/env python3
"""Subtle, reversible-by-checkpoint orbital/under-eye morph on Lauren 3's real GLB.
Only modifies eye-area POSITION.Z values in Lauren 3. No photo/image output.
Laura 2.5 is a permanently untouched backup, and colors/indices never change.
"""
from __future__ import annotations
import base64
import hashlib
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / "world-creator/assets/lauren-3-face"
BACKUP = ROOT / "world-creator/assets/laura-2-5-face"
REPORT = ROOT / "world-creator/LAUREN_3_EYE_AREA_MORPH_REPORT.md"
N = 10
COUNT = 38365
FACE_BYTES = 1527736
# 3DDFA's local coordinates: +Y is toward forehead, +Z is forward.
# Centers calibrated against the single 38,365-vertex photo-derived mesh.
EYES = (697.0, 955.0)

def bump(x, y, cx, cy, sx, sy, height):
    dx=(x-cx)/sx
    dy=(y-cy)/sy
    return height*math.exp(-0.5*(dx*dx+dy*dy))

def run():
    chunks = [WORK/f"face.part{i:02d}.b64" for i in range(N)]
    originals = [BACKUP/f"face.part{i:02d}.b64" for i in range(N)]
    assert all(p.is_file() for p in chunks+originals), "Missing model chunks or protected backup; abort"
    back_hash = hashlib.sha256("".join(p.read_text().strip() for p in originals).encode()).hexdigest()
    parts = [p.read_text().strip() for p in chunks]
    sizes = [len(s) for s in parts]
    raw = bytearray(base64.b64decode("".join(parts), validate=True))
    sha_before = hashlib.sha256(raw).hexdigest()
    if REPORT.exists() and ("Final GLB SHA-256: `"+sha_before+"`") in REPORT.read_text():
        print("Already sculpted; no duplicate displacement applied")
        return
    assert raw[:4] == b"glTF" and len(raw) == FACE_BYTES
    assert struct.unpack_from("<I", raw, 8)[0] == len(raw), "Corrupt GLB length"
    jsonlen, chunkmagic = struct.unpack_from("<I4s", raw, 12)
    assert chunkmagic == b"JSON", "Invalid GLB JSON chunk"
    model = json.loads(raw[20:20+jsonlen])
    attrs = model["meshes"][0]["primitives"][0]["attributes"]
    assert attrs["POSITION"] == 1 and attrs["COLOR_0"] == 2
    assert model["accessors"][1]["count"] == COUNT and model["accessors"][0]["count"] == 228219
    assert model["accessors"][1]["componentType"] == 5126
    assert len(model["bufferViews"]) == 3
    bstart = 20+jsonlen+8
    posstart = bstart+model["bufferViews"][1]["byteOffset"]
    colorstart = bstart+model["bufferViews"][2]["byteOffset"]
    before_header = bytes(raw[:posstart])
    before_colors = bytes(raw[colorstart:])
    # Preserve original eye image, iris coloration and all external surfaces.
    # Under-eye pads immediately below the lid (y=505), with a wider,
    # gentler transition onto the upper cheek (y=487).
    # Upper-lid soft tissue sits above lash line (y=579). There is no global
    # inflation, no scaling, and no repositioning of the painted irises.
    changed = 0
    under = upper = 0
    max_delta = 0.0
    sum_delta = 0.0
    for i in range(COUNT):
        offset = posstart + i*12
        x,y,z = struct.unpack_from("<fff",raw,offset)
        if y < 454 or y > 615 or min(abs(x-e) for e in EYES) > 117:
            continue
        # Protect baked eye and lash region y 528..553 completely.
        if 528 <= y <= 553:
            continue
        dz = 0.0
        for cx in EYES:
            if y < 528:
                dz += bump(x,y,cx,503,38,13.0,6.2)
                dz += bump(x,y,cx,484,56,21.0,1.9)
            elif y > 553:
                dz += bump(x,y,cx,576,43,12.5,3.9)
                dz += bump(x,y,cx,590,56,19,1.25)
        if dz < 0.012:
            continue
        dz=min(dz,9.0)
        struct.pack_into("<f",raw,offset,z+dz)
        changed+=1
        sum_delta+=dz
        max_delta=max(max_delta,dz)
        if y < 528: under+=1
        else: upper+=1
    assert 500 < changed < 9000, f"Unexpected changed vertex count {changed}"
    assert under > 200 and upper > 150, f"Under/upper coverage unexpectedly low: {under}/{upper}"
    assert 0 < max_delta <= 9.0
    assert raw[:posstart] == before_header, "Non-position data modified"
    assert raw[colorstart:] == before_colors, "Colors or other buffers modified"
    assert len(raw) == FACE_BYTES, "GLB changed size"
    newblob=base64.b64encode(raw).decode("ascii")
    assert len(newblob)==sum(sizes), "Chunk lengths changed unexpectedly"
    start=0
    for path, size in zip(chunks,sizes):
        path.write_text(newblob[start:start+size]+"\n")
        start+=size
    assert start == len(newblob)
    assert hashlib.sha256("".join(p.read_text().strip() for p in originals).encode()).hexdigest() == back_hash, "Laura 2.5 was modified!"
    end_sha=hashlib.sha256(raw).hexdigest()
    REPORT.write_text(
       "# Lauren 3 — eye-area soft-tissue morph: real 3D geometry\n\n"
       "This is a vertex-level edit to **Lauren 3's original 38,365-vertex GLB**, "
       "not an image-based concept or an overlay.\n\n"
       "- Raised both under-eye pads slightly at mesh y≈503 with diffuse upper-cheek blending.\n"
       "- Added slight upper-lid fullness at mesh y≈576 and gradual transition toward brows.\n"
       "- Normal eyelid opening/iris region (y=528..553) unchanged; original skin vertex color unchanged.\n"
       "- Identical triangle indices, face identity, jaw, lips, cheeks below eyes, nose and forehead silhouette.\n"
       "- Laura Original, Laura 2, **Laura 2.5** and their viewers/assets untouched.\n"
       "- Body matching and skin darkening deliberately deferred.\n"
       "- This pass does not by itself create independently movable 3D eyeballs.\n"
       "- Phone viewer: https://wvlrp.com/lauren-3-face-viewer.html\n\n"
       f"Changed vertices: {changed} (under {under}; upper {upper}); "
       f"max forward displacement {max_delta:.3f} native units; average {sum_delta/changed:.3f} units.\n"
       f"Protected Laura 2.5 chunk SHA-256: `{back_hash}`\n"
       f"Starting GLB SHA-256: `{sha_before}`\n"
       f"Final GLB SHA-256: `{end_sha}`\n"
    )
    print(f"SUCCESS: Lauren 3 sculpt: total={changed} under={under}, above={upper}, max={max_delta:.3f}; SHA {end_sha}")

if __name__ == "__main__":
    run()
