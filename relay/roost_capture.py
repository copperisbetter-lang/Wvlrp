#!/usr/bin/env python3
"""WVLRP Roost continuous overnight evidence recorder.

Uses ONLY the existing internal RTSP publisher at 127.0.0.1:8554/roost.
No direct camera access, cloud connection, public file server, or deletion.
"""
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time

DEST = Path("/recordings")
STREAM = "rtsp://127.0.0.1:8554/roost"
WINDOW_SEC = 12 * 60 * 60
SEGMENT_SEC = 20 * 60
MIN_FREE = 2048 * 1024 * 1024
STOP = False
child = None

def log(s):
    print("[roost-capture] " + s, flush=True)

def stop_handler(_sig, _frame):
    global STOP
    STOP = True
    if child and child.poll() is None:
        child.terminate()

signal.signal(signal.SIGTERM, stop_handler)
signal.signal(signal.SIGINT, stop_handler)

def main():
    global child
    if not DEST.is_dir():
        raise SystemExit("Persistent /recordings mount missing; refusing to capture")
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg not installed in running relay image")
    os.environ["TZ"] = "UTC"
    if hasattr(time, "tzset"):
        time.tzset()
    deadline = time.monotonic() + WINDOW_SEC
    log("12-hour night window, consecutive 20-minute MKV clips; UTC timestamps; audio if present")
    while not STOP and time.monotonic() < deadline:
        free = shutil.disk_usage(DEST).free
        if free < MIN_FREE:
            log(f"Free space {free // (1024*1024)} MB < 2048 MB threshold; paused")
            time.sleep(10)
            continue
        remaining = max(1, int(deadline - time.monotonic()))
        command = [
            "ffmpeg", "-hide_banner", "-nostdin", "-loglevel", "warning",
            "-rtsp_transport", "tcp", "-rw_timeout", "10000000",
            "-i", STREAM, "-map", "0:v:0", "-map", "0:a:0?",
            "-c", "copy", "-t", str(remaining),
            "-f", "segment", "-segment_time", str(SEGMENT_SEC),
            "-segment_atclocktime", "1", "-reset_timestamps", "1",
            "-strftime", "1", "-segment_format", "matroska",
            str(DEST / "roost_UTC_%Y-%m-%d_%H-%M-%S.mkv")
        ]
        log("Opening existing relay: " + STREAM)
        try:
            child = subprocess.Popen(command)
        except OSError as e:
            log("FFmpeg launch error: " + str(e))
            time.sleep(10)
            continue
        while not STOP and child.poll() is None:
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                if time.monotonic() >= deadline or shutil.disk_usage(DEST).free < MIN_FREE:
                    log("Closing current segment (window ended or low disk)")
                    child.terminate()
        if STOP and child.poll() is None:
            child.terminate()
        try:
            rc = child.wait(timeout=20)
        except subprocess.TimeoutExpired:
            child.kill()
            rc = child.wait()
        child = None
        log("Capture ended/reconnect: FFmpeg return " + str(rc))
        if STOP or time.monotonic() >= deadline:
            break
        time.sleep(8)
    log("Night capture ended; footage retained under /recordings")
if __name__ == "__main__":
    main()
