#!/usr/bin/env python3
"""Remove photographic hair streaks from Laura 2 forehead vertex colors.

This modifies only the editable Laura 2 clone, never the approved original.
Laura 2 currently uses 38,365-vertex GLB with RGBA vertex colors, not an image
texture, so repaint COLOR_0 without moving vertices or changing topology.
Requires Python standard library only. Invoked by the accompanying workflow.
"""
from __future__ import annotations
import base64
import hashlib
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "world-creator/assets/laura-2-face"
ORIGINAL = ROOT / "world-creator/assets/laura-face-original-2026-10-21"
REPORT = ROOT / "world-creator/LAURA_2_FOREHEAD_CLEANUP_2026-10-21.md"

def smoothstep(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t*t*(3.0-2.0*t)

def clamp(x: float) -> int:
    return max(0, min(255, round(x)))

def patch() -> None:
    source = [ASSETS / f"face.part{i:02d}.b64" for i in range(10)]
    backup = [ORIGINAL / f"face.part{i:02d}.b64" for i in range(10)]
    assert all(f.is_file() for f in source), "Clone asset chunks missing"
    assert all(f.is_file() for f in backup), "Protected backup missing; stop"
    original_sizes = [len(p.read_text().strip()) for p in source]
    raw = bytearray(base64.b64decode("".join(f.read_text().strip() for f in source), validate=True))
    old_sha = hashlib.sha256(raw).hexdigest()
    if REPORT.exists() and f"Patched GLB SHA-256: `{old_sha}`" in REPORT.read_text():
        print("Laura 2 is already patched; no changes.")
        return
    assert raw[:4] == b"glTF" and len(raw) == struct.unpack_from("<I", raw, 8)[0]
    assert len(raw) == 1527736, f"Unexpected model size: {len(raw)}"

    json_size, json_magic = struct.unpack_from("<I4s", raw, 12)
    assert json_magic == b"JSON"
    model = json.loads(raw[20:20+json_size])
    primitive = model["meshes"][0]["primitives"][0]
    assert primitive["attributes"]["COLOR_0"] == 2 and primitive["attributes"]["POSITION"] == 1
    vertices = model["accessors"][1]["count"]
    assert vertices == 38365 and model["accessors"][2]["count"] == vertices
    assert model["accessors"][2]["componentType"] == 5121
    binary_start = 20+json_size+8
    position_start = binary_start + model["bufferViews"][1]["byteOffset"]
    color_start = binary_start + model["bufferViews"][2]["byteOffset"]
    coordinates = [struct.unpack_from("<fff", raw, position_start+i*12) for i in range(vertices)]
    colors = [tuple(raw[color_start+i*4:color_start+i*4+3]) for i in range(vertices)]

    # Nearby intact cheek / upper-face skin supplies actual colors from the same
    # model. Avoid eyebrow, iris, lip, shadows and the contaminated forehead.
    skin = [(x, r, g, b) for (x, y, z), (r, g, b) in zip(coordinates, colors)
            if 425 < y < 475 and r > 190 and g > 125 and b > 85 and z > 165]
    assert len(skin) > 1000, "Clean reference skin not found; abort"
    anchors = []
    for x in range(530, 1081, 10):
        sw = rr = gg = bb = 0.0
        for sx, r, g, b in skin:
            distance = (sx-x)/62.0
            weight = math.exp(-0.5*distance*distance)
            sw += weight
            rr += weight*r
            gg += weight*g
            bb += weight*b
        anchors.append((rr/sw, gg/sw, bb/sw))

    changed = 0
    before = [0, 0, 0]
    after = [0, 0, 0]
    upper_count = 0
    for i, ((x, y, z), old) in enumerate(zip(coordinates, colors)):
        if y < 555:
            continue  # protect every eye, nose, cheek, lip and chin vertex
        weight = smoothstep((y-555)/47)
        if y < 585 and (old[0] < 145 or old[1] < 58):
            weight = 0  # preserve dark eyebrow/eyeshadow detail
        if weight < .001:
            continue
        at = (x-530)/10
        bi = max(0, min(len(anchors)-2, math.floor(at)))
        t = max(0.0, min(1.0, at-bi))
        ref = [anchors[bi][j]*(1-t)+anchors[bi+1][j]*t for j in range(3)]
        yshade = (y-650)*.018
        noise = math.sin(x*.179+y*.307)*1.8 + math.sin(x*.41-y*.217)*1.1
        target = (ref[0]+4+yshade+noise,
                  ref[1]+5+yshade*.7+noise*.65,
                  ref[2]+max(12, .28*(ref[0]-ref[2])-8)+yshade*.4+noise*.4)
        new = tuple(clamp(old[j]*(1-weight)+target[j]*weight) for j in range(3))
        if new != old:
            changed += 1
            raw[color_start+i*4:color_start+i*4+3] = bytes(new)
        if y >= 610:
            upper_count += 1
            for j in range(3):
                before[j] += old[j]
                after[j] += new[j]
    assert changed > 3500, f"Patch affected only {changed} vertices"
    assert all(raw[color_start+i*4:color_start+i*4+3] == bytes(c)
               for i, ((x,y,z),c) in enumerate(zip(coordinates,colors)) if y < 555)
    assert all(raw[:color_start] == bytearray(base64.b64decode(
               "".join(f.read_text().strip() for f in source), validate=True))[:color_start]
               for _ in range(1)), "Geometry or headers changed"

    encoded = base64.b64encode(raw).decode("ascii")
    assert len(encoded) == sum(original_sizes)
    offset = 0
    for path, length in zip(source, original_sizes):
        path.write_text(encoded[offset:offset+length]+"\n")
        offset += length
    assert offset == len(encoded)
    final_sha = hashlib.sha256(raw).hexdigest()
    avg = lambda values: [round(n/upper_count) for n in values]
    REPORT.write_text(
        "# Laura 2 - forehead texture cleanup, October 21, 2026\n\n"
        "## Working clone\n"
        "Viewer: https://wvlrp.com/laura-2-face-viewer.html\n"
        "Updated assets: `world-creator/assets/laura-2-face/face.part00.b64` through `face.part09.b64`.\n"
        "Preserved original and assets: https://wvlrp.com/laura-face-original-2026-10-21.html\n\n"
        "Removed photograph-baked golden hair streaks from the forehead **on the actual GLB**, "
        "not just a generated preview. Colors are embedded as per-vertex RGBA, not PNG texture. "
        "Replaced hair-contaminated vertex RGB with smoothly sampled/feathered adjacent natural skin "
        "tones, preserving all mesh vertices and triangle indices. Protected eyebrows and kept all "
        "eye and lower-face vertex colors at y < 555 untouched. Neither movable eyes nor the back "
        "of the skull are implemented by this step.\n\n"
        f"Vertices: {vertices}; recolored: {changed}; unchanged eye-region: verified.\n"
        f"Forehead mean RGB (y>=610): {avg(before)} before; {avg(after)} after.\n"
        f"Source GLB SHA-256: `{old_sha}`\n"
        f"Patched GLB SHA-256: `{final_sha}`\n"
        "Viewer supports a true 3D model with genuinely different left/right views by orbit rotation.\n"
    )
    print(f"SUCCESS: repaired {changed} Laura 2 forehead vertices; "
          f"forehead RGB {avg(before)} => {avg(after)}; output {final_sha}")

if __name__ == "__main__":
    patch()
