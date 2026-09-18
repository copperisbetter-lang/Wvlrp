#!/bin/sh
# WVLRP stream watchdog. Checks the two active public HLS playlists and
# terminates a stuck ffmpeg publisher so the existing supervisor loop restarts it.
set -u
BASE="http://127.0.0.1:8891"
INTERVAL="${WATCHDOG_INTERVAL:-20}"
FAIL_LIMIT="${WATCHDOG_FAIL_LIMIT:-3}"

east_fail=0
roost_fail=0

check_stream() {
  name="$1"
  url="$BASE/$name/index.m3u8"
  if wget -q -T 8 -O /tmp/"$name".m3u8 "$url" 2>/dev/null &&
     grep -q "#EXTM3U" /tmp/"$name".m3u8 &&
     grep -Eq "\.ts|\.m4s" /tmp/"$name".m3u8; then
    return 0
  fi
  return 1
}

restart_publisher() {
  name="$1"
  echo "[watchdog] $name unhealthy; restarting publisher" >&2
  # Match only the local output path, not the camera source URL.
  pkill -f "rtsp://127.0.0.1:8554/$name" 2>/dev/null || true
}

while true; do
  if check_stream eastbank; then east_fail=0; else east_fail=$((east_fail+1)); fi
  if check_stream roost; then roost_fail=0; else roost_fail=$((roost_fail+1)); fi

  if [ "$east_fail" -ge "$FAIL_LIMIT" ]; then
    restart_publisher eastbank
    east_fail=0
  fi
  if [ "$roost_fail" -ge "$FAIL_LIMIT" ]; then
    restart_publisher roost
    roost_fail=0
  fi
  sleep "$INTERVAL"
done
