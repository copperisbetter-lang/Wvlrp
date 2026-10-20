#!/usr/bin/env python3
"""Download one approved public 3D asset as a GitHub Actions artifact."""
import ipaddress
import json
import os
import pathlib
import re
import socket
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path("wild-assets/requests")
OUTPUT = pathlib.Path("wild-assets/staged")
EXTENSIONS = {".glb", ".gltf", ".fbx", ".obj", ".blend", ".zip"}
MAX_BYTES = 95 * 1024 * 1024


def safe_host(host):
    if not host or host.lower() in {"localhost", "localhost.localdomain"}:
        raise ValueError("Missing or local hostname")
    addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ValueError("Download host is not publicly routable")


def validate_url(raw, hosts):
    parts = urllib.parse.urlsplit(raw)
    if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
        raise ValueError("Only HTTPS URLs without embedded credentials are allowed")
    if parts.port not in (None, 443):
        raise ValueError("Non-standard HTTPS ports are not permitted")
    if parts.hostname.lower() not in hosts:
        raise ValueError("Host not in the request's reviewed allowed_hosts list")
    safe_host(parts.hostname)
    return raw


class CheckedRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, hosts):
        super().__init__()
        self.hosts = hosts

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl, self.hosts)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def main():
    request_name = os.environ.get("WILD_REQUEST", "")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,63}", request_name):
        raise ValueError("Invalid request identifier")
    request_path = ROOT / (request_name + ".json")
    data = json.loads(request_path.read_text(encoding="utf-8"))
    name = data.get("filename", "")
    if pathlib.PurePath(name).name != name or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,100}", name):
        raise ValueError("Invalid output filename")
    if pathlib.Path(name).suffix.lower() not in EXTENSIONS:
        raise ValueError("Unsupported model file type")
    if not data.get("license") or not data.get("source_page", "").startswith("https://"):
        raise ValueError("Source page and license must be documented")
    hosts = {s.lower() for s in data.get("allowed_hosts", [])}
    if not hosts or len(hosts) > 8 or any(not re.fullmatch(r"[a-z0-9.-]+", h) for h in hosts):
        raise ValueError("Provide up to eight reviewed download hostnames")
    url = validate_url(data["url"], hosts)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    opener = urllib.request.build_opener(CheckedRedirect(hosts))
    req = urllib.request.Request(url, headers={"User-Agent": "WVLRP-Asset-Fetch/1.0"})
    with opener.open(req, timeout=45) as response:
        if int(response.headers.get("Content-Length", "0")) > MAX_BYTES:
            raise ValueError("Asset exceeds 95 MiB limit")
        total = 0
        with (OUTPUT / name).open("wb") as f:
            while chunk := response.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_BYTES:
                    raise ValueError("Asset exceeds 95 MiB limit")
                f.write(chunk)
    (OUTPUT / "SOURCE.json").write_text(json.dumps({
        "request": request_name, "filename": name,
        "source_page": data["source_page"], "license": data["license"],
        "download_url": url, "bytes": total,
        "note": "License is user-supplied; independently verify before use."
    }, indent=2) + "\n")
    print(f"Staged {name} ({total} bytes) for review; not installed into The Wild")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Asset fetch failed: {exc}", file=sys.stderr)
        sys.exit(1)
