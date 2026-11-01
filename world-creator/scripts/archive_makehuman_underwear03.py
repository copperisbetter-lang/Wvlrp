#!/usr/bin/env python3
"""Fetch the official MakeHuman underwear03 asset pack into an isolated review branch.

Downloads only links labeled mirror1/mirror2 on the official asset-pack page.
Validates archive format; preserves original bytes; never modifies character assets.
"""
from __future__ import annotations
import hashlib
import html
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from zipfile import ZipFile, BadZipFile

PAGE_URLS = [
    "https://static.makehumancommunity.org/assets/assetpacks/underwear03.html",
    "https://download.makehumancommunity.org/assets/assetpacks/underwear03.html",
    "https://www.makehumancommunity.org/assets/assetpacks/underwear03.html",
]
DEST = Path("world-creator/assets/third-party/makehuman/underwear03/underwear03.zip")
MAX_BYTES = 90 * 1024 * 1024
UA = "Mozilla/5.0 (compatible; WVLRP-asset-archive/1.0)"
ANCHOR = re.compile(r"<a\b[^>]*href=[\\"']([^\\"']+)[\\"'][^>]*>(.*?)</a>", re.I | re.S)


def get(url, timeout=35):
    req = Request(url, headers={"User-Agent": UA})
    return urlopen(req, timeout=timeout)


def allowed_download(url):
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    return parsed.scheme == "https" and (
        host.endswith(".makehumancommunity.org")
        or host == "makehumancommunity.org"
        or host == "downloads.tuxfamily.net"
    )


def find_links():
    errors = []
    for url in PAGE_URLS:
        try:
            with get(url) as response:
                page = response.read(3 * 1024 * 1024).decode("utf-8", errors="replace")
            links = []
            for href, label in ANCHOR.findall(page):
                label = re.sub(r"<[^>]+>", " ", label)
                label = html.unescape(label).strip().lower()
                if label not in ("mirror1", "mirror2"):
                    continue
                target = urljoin(url, html.unescape(href))
                if allowed_download(target) and target not in links:
                    links.append(target)
            if links:
                print("Official download page:", url)
                print("Verified mirror URLs:", *links, sep="\n  ")
                return links, url
            errors.append(f"{url}: mirror links not found")
        except Exception as e:
            errors.append(f"{url}: {type(e).__name__}: {e}")
    raise RuntimeError("Could not retrieve the official mirror links:\n" + "\n".join(errors))


def download(link):
    DEST.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=DEST.parent, delete=False, suffix=".part") as tmp:
        temp = Path(tmp.name)
        digest = hashlib.sha256()
        n = 0
        try:
            with get(link, timeout=100) as response:
                # Never accept unrelated HTML response or excessive downloads.
                ctype = response.headers.get("Content-Type", "")
                print("Download content-type:", ctype)
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    n += len(chunk)
                    if n > MAX_BYTES:
                        raise RuntimeError("Archive exceeds 90 MB safety cap")
                    tmp.write(chunk)
                    digest.update(chunk)
            if n < 1024 or temp.open("rb").read(4) != b"PK\x03\x04":
                raise RuntimeError("Not a ZIP file")
            with ZipFile(temp) as archive:
                names = archive.namelist()
                if not any("elvs_all_tied_up_bikini" in name.lower() for name in names):
                    raise RuntimeError("Archive missing the promised tied bikini asset")
                if not any(name.startswith("packs/") for name in names):
                    raise RuntimeError("Archive does not match MPFB asset-pack layout")
                bad = archive.testzip()
                if bad:
                    raise RuntimeError("Invalid ZIP member: " + bad)
                print("ZIP members:", len(names))
            os.replace(temp, DEST)
            print("DOWNLOADED", DEST, n, digest.hexdigest())
            return digest.hexdigest(), n
        finally:
            temp.unlink(missing_ok=True)


if __name__ == "__main__":
    urls, frompage = find_links()
    errors = []
    for url in urls:
        try:
            sha, count = download(url)
            manifest = DEST.parent / "SOURCE_AND_ATTRIBUTION.md"
            manifest.write_text(
                "# Underwear 03 — MakeHuman Community\n\n"
                "Original asset pack ZIP (unaltered).\n\n"
                "- Source page: " + frompage + "\n"
                "- Actual download: " + url + "\n"
                "- License: CC-BY, per the MakeHuman Community listing.\n"
                "- Contributors include Elvaerwyn (elvs_all_tied_up_bikini); individual included assets may have additional named authors.\n"
                "- Full upstream asset list and individual attribution: " + frompage + "\n"
                "- File: underwear03.zip\n"
                "- Size: " + str(count) + " bytes\n"
                "- SHA256: " + sha + "\n\n"
                "Keep per-asset author credits when reusing or distributing in The Wild.\n"
                "Nothing here is fitted to Bev yet. Original Bev remains unchanged.\n",
                encoding="utf-8",
            )
            print("SUCCESS: source and attribution saved")
            break
        except Exception as e:
            print("Mirror failed:", url, type(e).__name__, str(e), file=sys.stderr)
            errors.append(str(e))
    else:
        raise SystemExit("All verified official mirror downloads failed: " + "; ".join(errors))
