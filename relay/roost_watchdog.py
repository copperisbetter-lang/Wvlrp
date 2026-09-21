#!/usr/bin/env python3
import os
import signal
import time
import urllib.request

CAMERA = os.environ.get("WVLRP_WATCHDOG_CAMERA", "roost").strip().lower()
if CAMERA not in {"roost", "eastbank"}:
    CAMERA = "roost"
MASTER = f"http://127.0.0.1:8891/{CAMERA}/index.m3u8"
CHECK_SECONDS = 20
FAIL_LIMIT = 4
STARTUP_GRACE = 90
RECOVERY_GRACE = 120


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "WVLRP-Roost-Watchdog/1.0"})
    with urllib.request.urlopen(req, timeout=8) as response:
        return response.read().decode("utf-8", "replace")


def media_playlist():
    master = fetch(MASTER)
    variants = [
        line.strip()
        for line in master.splitlines()
        if line.strip() and not line.startswith("#")
    ]
    if not variants:
        raise RuntimeError("master playlist has no media variant")
    variant = variants[-1]
    if variant.startswith("http://") or variant.startswith("https://"):
        return fetch(variant)
    return fetch(f"http://127.0.0.1:8891/{CAMERA}/" + variant)


def playlist_marker(text):
    sequence = ""
    segments = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("#EXT-X-MEDIA-SEQUENCE:"):
            sequence = line
        elif line and not line.startswith("#"):
            segments.append(line)
    if not segments:
        raise RuntimeError("media playlist has no segments")
    return sequence + "|" + "|".join(segments[-2:])


def restart_camera(reason):
    killed = 0
    for name in os.listdir("/proc"):
        if not name.isdigit():
            continue
        try:
            with open(f"/proc/{name}/comm", "r", encoding="utf-8", errors="replace") as handle:
                comm = handle.read().strip()
            if comm != "ffmpeg":
                continue
            with open(f"/proc/{name}/cmdline", "rb") as handle:
                command = handle.read().replace(b"\x00", b" ").decode("utf-8", "replace")
            if f"rtsp://127.0.0.1:8554/{CAMERA}" in command:
                os.kill(int(name), signal.SIGTERM)
                killed += 1
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
    print(f"[{CAMERA}-watchdog] {reason}; terminated {killed} {CAMERA} ffmpeg process(es)", flush=True)


time.sleep(STARTUP_GRACE)
last_marker = None
failures = 0

while True:
    try:
        marker = playlist_marker(media_playlist())
        if marker == last_marker:
            raise RuntimeError("playlist stopped advancing")
        last_marker = marker
        failures = 0
    except Exception as exc:
        failures += 1
        print(f"[{CAMERA}-watchdog] failed check {failures}/{FAIL_LIMIT}: {exc}", flush=True)
        if failures >= FAIL_LIMIT:
            restart_camera("stream unhealthy for four consecutive checks")
            failures = 0
            last_marker = None
            time.sleep(RECOVERY_GRACE)
    time.sleep(CHECK_SECONDS)
