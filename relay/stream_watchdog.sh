#!/bin/sh
# WVLRP stream watchdog: guard the exact working HLS path.
set -u
BASE="http://127.0.0.1:8891"
INTERVAL="${WATCHDOG_INTERVAL:-20}"
FAIL_LIMIT="${WATCHDOG_FAIL_LIMIT:-3}"
VERIFY_DELAY="${WATCHDOG_VERIFY_DELAY:-8}"

east_fail=0
roost_fail=0

check_stream() {
  name="$1"
  master="/tmp/$name-master.m3u8"
  media="/tmp/$name-media.m3u8"
  url="$BASE/$name/index.m3u8"

  wget -q -T 8 -O "$master" "$url" 2>/dev/null || return 1
  grep -q "#EXTM3U" "$master" || return 1

  child=$(grep -v '^#' "$master" | grep -E '\\.m3u8([?].*)?$' | head -n1 || true)
  if [ -n "$child" ]; then
    case "$child" in
      http://*|https://*) child_url="$child" ;;
      /*) child_url="http://127.0.0.1:8891$child" ;;
      *) child_url="$BASE/$name/$child" ;;
    esac
    wget -q -T 8 -O "$media" "$child_url" 2>/dev/null || return 1
  else
    cp "$master" "$media"
  fi

  grep -q "#EXTM3U" "$media" || return 1
  seg=$(grep -v '^#' "$media" | grep -E '\\.(ts|m4s)([?].*)?$' | tail -n1 || true)
  [ -n "$seg" ] || return 1
  case "$seg" in
    http://*|https://*) seg_url="$seg" ;;
    /*) seg_url="http://127.0.0.1:8891$seg" ;;
    *) seg_url="$BASE/$name/$seg" ;;
  esac
  wget -q -T 8 -O /dev/null "$seg_url" 2>/dev/null || return 1
  return 0
}

restart_publisher() {
  name="$1"
  echo "[watchdog] $name unhealthy; restarting H264 publisher" >&2
  pkill -f "rtsp://127.0.0.1:8554/$name" 2>/dev/null || true
  sleep "$VERIFY_DELAY"
  if check_stream "$name"; then
    echo "[watchdog] $name recovered: playlist + video segment healthy" >&2
  else
    echo "[watchdog] $name still unhealthy after restart; persistent pipeline fault" >&2
  fi
}

while true; do
  if check_stream eastbank; then east_fail=0; else east_fail=$((east_fail+1)); fi
  if check_stream roost; then roost_fail=0; else roost_fail=$((roost_fail+1)); fi

  if [ "$east_fail" -ge "$FAIL_LIMIT" ]; then restart_publisher eastbank; east_fail=0; fi
  if [ "$roost_fail" -ge "$FAIL_LIMIT" ]; then restart_publisher roost; roost_fail=0; fi
  sleep "$INTERVAL"
done
