#!/usr/bin/env python3
"""Download official MakeHuman packs and stage licensed candidate clothing.
Run in CI; each archive comes from a hyperlink on the official pack page.
Do not silently invent URLs or mark an asset fitted to any character.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
import json
import os
import subprocess
import sys
import urllib.request
import zipfile

HERE = Path(__file__).resolve().parent
CATALOG = json.loads((HERE / "age-fit-wardrobe.json").read_text())
CACHE = Path(os.getenv("WVLRP_PACK_CACHE", "/tmp/wvlrp-wardrobe-packs"))
OUT = Path(os.getenv("WVLRP_PACK_ASSETS", "/tmp/wvlrp-wardrobe-assets"))
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            url = dict(attrs).get("href")
            if url:
                self.urls.append(url)

results = []
for pack in CATALOG["packs"]:
    page = pack["site"]
    with urllib.request.urlopen(urllib.request.Request(page, headers={"User-Agent":"WVLRP-Asset-Downloader/1.0"}), timeout=50) as response:
        html = response.read().decode("utf-8")
    parser = Links()
    parser.feed(html)
    mirrors = []
    for link in parser.urls:
        url = urljoin(page, link)
        parts = urlparse(url)
        if parts.scheme != "https":
            continue
        if parts.hostname not in ("files2.makehumancommunity.org", "files.makehumancommunity.org"):
            continue
        if url.lower().endswith(".zip") and url not in mirrors:
            mirrors.append(url)
    if not mirrors:
        raise RuntimeError("Official page did not list ZIP download mirrors for " + pack["id"])
    output = CACHE / (pack["id"] + ".zip")
    valid = output.exists() and zipfile.is_zipfile(output)
    if not valid:
        for mirror in mirrors:
            print("WVLRP_PACK_TRY", pack["id"], mirror, flush=True)
            temp = output.with_suffix(".part")
            temp.unlink(missing_ok=True)
            proc = subprocess.run(["curl", "-fLsS", "--retry", "2", "--connect-timeout", "30", "--max-time", "480", mirror, "-o", str(temp)])
            if proc.returncode == 0 and zipfile.is_zipfile(temp):
                temp.replace(output)
                valid = True
                break
        if not valid:
            raise RuntimeError("All official mirrors failed for " + pack["id"])
    wanted = {piece for candidate in CATALOG["candidates"] for piece in candidate["pieces"]}
    installed = []
    with zipfile.ZipFile(output) as z:
        corrupt = z.testzip()
        if corrupt:
            raise RuntimeError("Corrupt asset ZIP: " + corrupt)
        for member in z.infolist():
            if member.is_dir():
                continue
            name = Path(member.filename).name.lower()
            path_parts = [p.lower() for p in Path(member.filename).parts]
            # Keep companion meshes, material maps, and metadata for selected items.
            if not any(piece.lower() in member.filename.lower() for piece in wanted):
                continue
            if ".." in Path(member.filename).parts or Path(member.filename).is_absolute():
                continue
            # Each original asset folder is retained to keep its material paths valid.
            target = OUT / pack["id"] / Path(member.filename)
            target.parent.mkdir(parents=True, exist_ok=True)
            with z.open(member) as reader, target.open("wb") as writer:
                import shutil
                shutil.copyfileobj(reader, writer)
            installed.append(member.filename)
    print("WVLRP_PACK_VERIFIED", pack["id"], output.stat().st_size, "candidate_files", len(installed), flush=True)
    results.append({"pack": pack["id"], "license": pack["license"], "archive": str(output), "candidateFiles": installed, "origin": page})

(OUT / "download-manifest.json").write_text(json.dumps(results, indent=2))
print("WVLRP_WARDROBE_DOWNLOAD_SUCCESS", len(results), flush=True)
