#!/usr/bin/env python3
"""Download verified CC0 Poly Haven 2K PBR material sets for The Wild.

Uses the official API rather than guessing CDN URLs. This script is safe to
rerun, verifies checksums/contents, and keeps 8K masters OFF the phone runtime.
Run: python world-creator/scripts/download_hd_building_materials.py
"""
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import re
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1] / "assets" / "building"
ROOT.mkdir(parents=True, exist_ok=True)
UA = "WVLRP-TheWild-FreeBuildingAssetImporter/1.0 (GitHub Actions)"
PICKS = [
    ("wood_trunk_wall", "round log walls and bark-sided cabins"),
    ("raw_plank_wall", "rough-cut timber and cabin interiors"),
    ("weathered_planks", "weathered siding and older village buildings"),
    ("wood_planks", "wooden floors, porch decking and beams"),
    ("stacked_stone_wall", "fireplace masonry and chimneys"),
    ("mossy_stone_wall", "aged foundation stone and rustic exterior masonry"),
    ("rough_pine_door", "hand-hewn pine door and furniture"),
    ("roof_slates_03", "old Appalachian slate roofs"),
    ("corrugated_iron", "weathered metal roofs and awnings"),
    ("pine_bark", "individual log grain and rustic posts"),
]
KINDS = [("diffuse","diffuse"),("nor_gl","normal"),("arm","arm")]
MAX_SIZE = 35 * 1024 * 1024

def fetch(url: str, retries: int = 4) -> bytes:
    if not (url.startswith("https://api.polyhaven.com/") or url.startswith("https://dl.polyhaven.org/")
            or url.startswith("https://dl.polyhaven.com/")):
        raise ValueError("Non-Poly Haven URL rejected: " + url[:120])
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json,*/*"})
            with urllib.request.urlopen(req, timeout=50) as resp:
                length = resp.headers.get("Content-Length")
                if length and int(length) > MAX_SIZE:
                    raise ValueError("Too large to commit to browser assets: " + length)
                data = resp.read(MAX_SIZE + 1)
                if len(data) > MAX_SIZE:
                    raise ValueError("Asset exceeds configured 35 MB limit")
                return data
        except (urllib.error.URLError, TimeoutError) as e:
            last=e
            time.sleep(1.5*(attempt+1))
    raise RuntimeError(f"Could not download {url}: {last}")

def select_file(tree: dict, key: str, resolution: str = "2k") -> dict:
    data=tree.get(key) or tree.get(key.upper()) or tree.get(key.title())
    if not isinstance(data,dict):
        raise ValueError(f"Missing {key} map: available map names={list(tree)}")
    at_res=data.get(resolution)
    if not isinstance(at_res,dict):
        raise ValueError(f"No {resolution} variant for {key}; available resolutions={list(data)}")
    candidate=at_res.get("jpg") or at_res.get("jpeg")
    if not isinstance(candidate,dict) or not candidate.get("url"):
        raise ValueError(f"No {resolution} JPEG {key}: formats={list(at_res)}")
    return candidate

def main():
    summary=[]
    for asset, usage in PICKS:
        print(f"== {asset} ==", flush=True)
        meta=json.loads(fetch("https://api.polyhaven.com/files/"+asset))
        outputs={}
        for api_kind,local_kind in KINDS:
            src=select_file(meta,api_kind)
            name=f"{asset}_{local_kind}_2k.jpg"
            dest=ROOT/name
            want=src.get("md5","")
            if dest.exists() and dest.stat().st_size>1024:
                have=hashlib.md5(dest.read_bytes()).hexdigest()
                if have==want:
                    print("  verified existing",name,flush=True)
                    outputs[local_kind]={"file":name,"bytes":dest.stat().st_size,"md5":have,"download":"official-api"}
                    continue
            data=fetch(src["url"])
            actual=hashlib.md5(data).hexdigest()
            if want and actual!=want:
                raise ValueError(f"Checksum mismatch: {name} expected {want} got {actual}")
            if not data.startswith(bytes.fromhex("ffd8ff")):
                raise ValueError(f"Not a JPEG file: {name}")
            if len(data)<1024:
                raise ValueError(f"Unreasonably small JPEG: {name}")
            temp=dest.with_suffix(".jpg.part")
            temp.write_bytes(data)
            temp.replace(dest)
            print(f"  downloaded and checked {name} ({len(data):,} bytes)",flush=True)
            outputs[local_kind]={"file":name,"bytes":len(data),"md5":actual,"download":"official-api"}
        summary.append({
            "id":asset, "use":usage, "license":"CC0",
            "source":"https://polyhaven.com/a/"+asset, "provider":"Poly Haven",
            "resolution":"2k", "maps":outputs
        })
    manifest=ROOT/"hd-building-downloads.json"
    manifest.write_text(json.dumps({
        "title":"The Wild: verified photorealistic architectural PBR textures",
        "provider":"Poly Haven", "license":"CC0",
        "license_url":"https://creativecommons.org/publicdomain/zero/1.0/",
        "source_api":"https://api.polyhaven.com/files/{id}",
        "resolution":"2k",
        "note":"Real asset files; 2K is runtime master, 1K legacy/mobile variants kept separately.",
        "materials":summary},indent=2)+"\n",encoding="utf-8")
    print(f"SUCCESS: verified {len(summary)*len(KINDS)} texture maps for {len(summary)} materials",flush=True)

if __name__ == "__main__":
    main()
