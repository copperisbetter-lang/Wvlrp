#!/usr/bin/env python3
"""WVLRP stream watchdog with conservative recovery and restart-loop protection."""

import os
import signal
import time
import urllib.request


CAMERA = os.environ.get("WVLRP_WATCHDOG_CAMERA", "roost").strip().lower()
if CAMERA not in {"roost", "eastbank"}:
    CAMERA = "roost"

MASTER = f"http://127.0.0.1:8891/{CAMERA}/index.m3u8"
CHECK_SECONDS = int(os.environ.get("WVLRP_WATCHDOG_CHECK_SECONDS", "20"))
FAIL_LIMIT = int(os.environ.get("WVLRP_WATCHDOG_FAIL_LIMIT", "4"))
STARTUP_GRACE = int(os.environ.get("WVLRP_WATCHDOG_STARTUP_GRACE", "150"))
RECOVERY_GRACE = int(os.environ.get("WVLRP_WATCHDOG_RECOVERY_GRACE", "180"))
RESTART_COOLDOWN = int(os.environ.get("WVLRP_WATCHDOG_RESTART_COOLDOWN", "600"))
STABLE_CHECKS_REQUIRED = int(os.environ.get("WVLRP_WATCHDOG_STABLE_CHECKS", "3"))
FETCH_TIMEOUT = int(os.environ.get("WVLRP_WATCHDOG_FETCH_TIMEOUT", "8"))


def log(message):
    print(f"[{CAMERA}-watchdog] {message}", flush=True)


def fetch(url):
    request = urllib.request.Request(
        url, headers={"User-Agent": "WVLRP-Stream-Watchdog/2.0"}
    )
    with urllib.request.urlopen(request, timeout=FETCH_TIMEOUT) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status} from {url}")
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
    if variant.startswith(("http://", "https://")):
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
    if not sequence:
        raise RuntimeError("media playlist has no sequence number")
    if not segments:
        raise RuntimeError("media playlist has no segments")
    return sequence + "|" + "|".join(segments[-2:])


def matching_ffmpeg_pids():
    pids = []
    output_path = f"rtsp://127.0.0.1:8554/{CAMERA}"
    for name in os.listdir("/proc"):
        if not name.isdigit():
            continue
        try:
            with open(f"/proc/{name}/comm", encoding="utf-8", errors="replace") as handle:
                if handle.read().strip() != "ffmpeg":
                    continue
            with open(f"/proc/{name}/cmdline", "rb") as handle:
                command = handle.read().replace(b"\x00", b" ").decode("utf-8", "replace")
            if output_path in command:
                pids.append(int(name))
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
    return pids


def terminate_camera(reason):
    pids = matching_ffmpeg_pids()
    for pid in pids:
        try:
            os.kill(pid, signal.SIGTERM)
        except (ProcessLookupError, PermissionError):
            pass
    log(f"{reason}; requested restart of {len(pids)} ffmpeg process(es)")
    return len(pids)


def main():
    log(
        "started: "
        f"startup={STARTUP_GRACE}s, failures={FAIL_LIMIT}, "
        f"recovery={RECOVERY_GRACE}s, cooldown={RESTART_COOLDOWN}s"
    )
    time.sleep(STARTUP_GRACE)

    last_marker = None
    failures = 0
    stable_checks = 0
    last_restart = 0.0
    recovering = False

    while True:
        try:
            marker = playlist_marker(media_playlist())
            if marker == last_marker:
                raise RuntimeError("playlist stopped advancing")
            last_marker = marker
            failures = 0
            stable_checks += 1
            if recovering and stable_checks >= STABLE_CHECKS_REQUIRED:
                log(f"stream stable for {stable_checks} consecutive checks; recovery confirmed")
                recovering = False
        except Exception as exc:
            failures += 1
            stable_checks = 0
            log(f"failed check {failures}/{FAIL_LIMIT}: {exc}")

            if failures >= FAIL_LIMIT:
                now = time.monotonic()
                cooldown_left = RESTART_COOLDOWN - (now - last_restart)
                if last_restart and cooldown_left > 0:
                    log(f"restart suppressed for {int(cooldown_left)}s to prevent a restart loop")
                    failures = FAIL_LIMIT - 1
                else:
                    terminate_camera(
                        f"stream unhealthy for {FAIL_LIMIT} consecutive checks"
                    )
                    last_restart = time.monotonic()
                    recovering = True
                    failures = 0
                    stable_checks = 0
                    last_marker = None
                    log(f"allowing {RECOVERY_GRACE}s for FFmpeg and HLS to rebuild")
                    time.sleep(RECOVERY_GRACE)

        time.sleep(CHECK_SECONDS)


if __name__ == "__main__":
    main()
