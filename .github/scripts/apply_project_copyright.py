#!/usr/bin/env python3
# Copyright © 2026 WVLRP / The Wild. All rights reserved in original project-authored content.
# Third-party materials remain subject to their respective licenses.
"""Safely attach a rights NOTICE to tracked public repo files without corrupting them.

Usage: python3 .github/scripts/apply_project_copyright.py [--check|--write]
Default is --check. --write stamps supported textual originals, creates
per-file rights sidecars for non-text & license-sensitive files, and produces
a reproducible manifest. All original bytes of binary files stay unchanged.
This NEVER fetches or exposes private repository material.
"""
import argparse
import csv
import io
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
NOTICE = ("Copyright © 2026 WVLRP / The Wild. All rights reserved in original "
          "project-created material only. Third-party assets and prior rights "
          "remain subject to their respective licenses. See /COPYRIGHT.md.")
SIDECAR_SUFFIX = ".copyright.txt"
MANIFEST = "COPYRIGHT_FILE_MANIFEST.tsv"
# Only source/document types that support real syntax-safe nonexecutable comments.
PYTHON = {".py"}
HASH_COMMENT = {".yml", ".yaml", ".sh", ".bash", ".toml"}
SLASH_COMMENT = {".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".kt", ".kts"}
BLOCK_COMMENT = {".css", ".scss"}
HTML_COMMENT = {".html", ".htm", ".md", ".markdown"}
TEXTABLE = PYTHON | HASH_COMMENT | SLASH_COMMENT | BLOCK_COMMENT | HTML_COMMENT
TEXT_BYTES_LIMIT = 650_000
EXCLUDED_DIRS = {".git", "node_modules", "vendor", "third_party", "third-party"}
ALREADY_GENERATED = {MANIFEST, "COPYRIGHT.md"}
MARKER = "Copyright © 2026 WVLRP / The Wild"
SIDECAR_TEMPLATE = """Copyright file notice for: {path}

{notice}

IMPORTANT: This is a project-wide rights/attribution notice, NOT an assertion
that WVLRP owns all elements or has exclusive rights to this file. If this
file contains a third-party model, texture, photo, library, font, character
base, or other licensed component, that creator's rights and actual license
control the underlying work. Any original WVLRP modifications remain subject
to their own copyright. Do not remove existing license or attribution files.
Original file bytes have not been changed by this sidecar.
"""

def tracked():
    proc = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT,
                          capture_output=True, check=True)
    return sorted(s.decode("utf-8", errors="surrogateescape")
                  for s in proc.stdout.split(b"\0") if s)

def should_skip(path):
    if path in ALREADY_GENERATED or path.endswith(SIDECAR_SUFFIX):
        return True
    if any(p in EXCLUDED_DIRS for p in Path(path).parts):
        return True
    return False

def license_sensitive(path):
    # Do not modify existing explicit third-party attribution or licenses.
    return bool(re.search(r"(?:^|/)(?:licen[sc]e|third[-_ ]party|attribution|credits)(?:[./_-]|$)",
                          path, flags=re.IGNORECASE))

def plan(path):
    src = ROOT / path
    if not src.is_file() or src.is_symlink():
        return "sidecar", None
    ext = src.suffix.lower()
    if license_sensitive(path) or ext not in TEXTABLE or src.stat().st_size > TEXT_BYTES_LIMIT:
        return "sidecar", None
    try:
        contents = src.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return "sidecar", None
    if "\0" in contents:
        return "sidecar", None
    return "inline", contents

def stamp(path, data):
    if MARKER in data:
        return data
    ext = Path(path).suffix.lower()
    prefix = ""
    if ext in HASH_COMMENT or ext in PYTHON or Path(path).name in {"Dockerfile", "Makefile"}:
        prefix = "# " + NOTICE + "\n"
        # Keep shebang and encoding cookie above comments where applicable.
        lines = data.splitlines(keepends=True)
        n = 0
        if lines and lines[0].startswith("#!"):
            n = 1
        if len(lines) > n and re.match(r"#.*coding[:=]", lines[n]):
            n += 1
        return "".join(lines[:n]) + prefix + "".join(lines[n:])
    if ext in SLASH_COMMENT:
        prefix = "// " + NOTICE + "\n"
    elif ext in BLOCK_COMMENT:
        prefix = "/* " + NOTICE + " */\n"
    elif ext in HTML_COMMENT:
        prefix = "<!-- " + NOTICE + " -->\n"
        if ext in {".html", ".htm"}:
            # Keep HTML5 DOCTYPE first to avoid quirks-mode changes.
            m = re.match(r"(\ufeff?\s*<!doctype\s+html[^>]*>\s*)",
                         data, re.IGNORECASE)
            if m:
                return data[:m.end()] + prefix + data[m.end():]
        if ext in {".md", ".markdown"} and data.startswith("---\n"):
            # Keep YAML front matter as first document item.
            m = re.search(r"\n---\s*\n", data[4:])
            if m:
                end = 4 + m.end()
                return data[:end] + prefix + data[end:]
    else:
        raise AssertionError(f"unsupported inline type: {path}")
    return prefix + data

def write_if_changed(path, value):
    if path.exists():
        try:
            if path.read_text(encoding="utf-8") == value:
                return False
        except (OSError, UnicodeDecodeError):
            pass
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8")
    return True

def execute(write):
    files = tracked()
    # Staged new files are not in git ls-files until the next run. Always add
    # them to index if present in the working tree.
    extra = [x for x in ("COPYRIGHT.md", ".github/scripts/apply_project_copyright.py")
             if (ROOT / x).is_file() and x not in files]
    paths = sorted(set(files + extra))
    rows = []
    changed = 0
    for path in paths:
        if should_skip(path):
            continue
        method, raw = plan(path)
        notice_path = path if method == "inline" else path + SIDECAR_SUFFIX
        if method == "inline":
            wanted = stamp(path, raw)
            if write and wanted != raw and write_if_changed(ROOT / path, wanted):
                changed += 1
        else:
            expected = SIDECAR_TEMPLATE.format(path=path, notice=NOTICE)
            if write and write_if_changed(ROOT / notice_path, expected):
                changed += 1
        rows.append((path, method, notice_path,
                     "Existing asset licenses control third-party content"))
    output = io.StringIO()
    writer = csv.writer(output, delimiter="\t", lineterminator="\n")
    writer.writerow(("file_path", "notice_type", "notice_location", "rights_boundary"))
    writer.writerows(rows)
    manifest = ROOT / MANIFEST
    if write and write_if_changed(manifest, output.getvalue()):
        changed += 1
    # The generated manifest also covers every original binary/structured file
    # by name; it must not treat index files or the sidecars as original assets.
    report = {"tracked_public_original_files":len(rows),
              "inline":sum(r[1]=="inline" for r in rows),
              "sidecars":sum(r[1]=="sidecar" for r in rows),
              "modified_or_created_file_count":changed,
              "manifest":MANIFEST,
              "excluded":len(paths)-len(rows),
              "private_assets_copied":0}
    print("WVLRP_COPYRIGHT_NOTICE_AUDIT", report, flush=True)
    if not write:
        missing = [r for r in rows if not (ROOT / r[2]).is_file() or
                   (r[1] == "inline" and MARKER not in (ROOT / r[2]).read_text("utf-8"))]
        if missing:
            print("UNCOVERED_FILES", len(missing), [r[0] for r in missing[:15]], flush=True)
            raise SystemExit(2)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = ap.parse_args()
    execute(write=args.write)
