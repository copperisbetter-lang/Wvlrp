FROM bluenviron/mediamtx:1 AS mediamtx

FROM alpine:3.22

# build-refresh: 2026-09-21 watchdog-v2

RUN apk add --no-cache nginx ffmpeg python3

COPY --from=mediamtx /mediamtx /mediamtx
COPY relay/mediamtx.yml /mediamtx.yml
COPY relay/viewer_count.py /viewer_count.py
COPY relay/roost_watchdog.py /roost_watchdog.py

RUN mkdir -p /run/nginx && printf '%s\n' \
'worker_processes 1;' \
'events { worker_connections 1024; }' \
'http {' \
'  access_log /dev/stdout;' \
'  error_log /dev/stderr info;' \
'  server {' \
'    listen 8888;' \
'    server_name _;' \
'    location = / {' \
'      default_type text/plain;' \
'      return 200 "WVLRP multi-camera relay\\n";' \
'    }' \
'    location /presence/ {' \
'      proxy_pass http://127.0.0.1:8894;' \
'      proxy_http_version 1.1;' \
'      proxy_set_header Host $host;' \
'      proxy_set_header X-Real-IP $remote_addr;' \
'      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
'      proxy_set_header X-Forwarded-Proto $scheme;' \
'      proxy_buffering off;' \
'    }' \
'    location /webrtc/ {' \
'      rewrite ^/webrtc/(.*)$ /$1 break;' \
'      proxy_pass http://127.0.0.1:8889;' \
'      proxy_http_version 1.1;' \
'      proxy_set_header Host $host;' \
'      proxy_set_header X-Forwarded-Proto $scheme;' \
'      proxy_buffering off;' \
'      proxy_request_buffering off;' \
'      proxy_read_timeout 3600s;' \
'    }' \
'    location / {' \
'      proxy_pass http://127.0.0.1:8891;' \
'      proxy_http_version 1.1;' \
'      proxy_set_header Host $host;' \
'      proxy_set_header X-Real-IP $remote_addr;' \
'      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
'      proxy_set_header X-Forwarded-Proto $scheme;' \
'      proxy_buffering off;' \
'      proxy_request_buffering off;' \
'      proxy_read_timeout 3600s;' \
'      proxy_send_timeout 3600s;' \
'    }' \
'  }' \
'}' > /etc/nginx/nginx.conf

EXPOSE 8888

CMD ["/bin/sh", "-c", "python3 /viewer_count.py & WVLRP_WATCHDOG_CAMERA=roost python3 /roost_watchdog.py & WVLRP_WATCHDOG_CAMERA=eastbank python3 /roost_watchdog.py & EAST_SOURCE=\"${MTX_PATHS_EASTBANK_SOURCE:-$WVLRP_RTSP_SOURCE}\"; ROOST_SOURCE=\"${MTX_PATHS_ROOST_SOURCE:-$WVLRP_ROOST_RTSP_SOURCE}\"; env -u MTX_PATHS_EASTBANK_SOURCE -u MTX_PATHS_ROOST_SOURCE /mediamtx /mediamtx.yml & sleep 2; if [ -n \"$EAST_SOURCE\" ]; then (while true; do ffmpeg -hide_banner -loglevel warning -rtsp_transport tcp -threads 1 -probesize 256k -analyzeduration 500000 -fflags +discardcorrupt+nobuffer -rtbufsize 2M -i \"$EAST_SOURCE\" -map 0:v:0 -an -vf 'scale=-2:480,fps=10' -c:v libx264 -preset ultrafast -tune zerolatency -profile:v baseline -pix_fmt yuv420p -threads 1 -g 10 -keyint_min 10 -sc_threshold 0 -max_muxing_queue_size 96 -f rtsp -rtsp_transport tcp rtsp://127.0.0.1:8554/eastbank; rc=$?; echo \"[eastbank] ffmpeg exited rc=$rc; recovery grace 20s\" >&2; sleep 20; done) & fi; if [ -n \"$ROOST_SOURCE\" ]; then (while true; do ffmpeg -hide_banner -loglevel warning -rtsp_transport tcp -threads 1 -probesize 256k -analyzeduration 500000 -fflags +discardcorrupt+nobuffer -rtbufsize 2M -i \"$ROOST_SOURCE\" -map 0:v:0 -map 0:a:0? -vf 'scale=-2:480,fps=10' -c:v libx264 -preset ultrafast -tune zerolatency -profile:v baseline -pix_fmt yuv420p -threads 1 -g 10 -keyint_min 10 -sc_threshold 0 -af 'aresample=async=1000:first_pts=0,asetpts=N/SR/TB' -c:a aac -b:a 48k -ar 32000 -ac 1 -max_muxing_queue_size 96 -muxdelay 0 -f rtsp -rtsp_transport tcp rtsp://127.0.0.1:8554/roost; rc=$?; echo \"[roost] ffmpeg exited rc=$rc; recovery grace 20s\" >&2; sleep 20; done) & fi; exec nginx -g 'daemon off;'"]
