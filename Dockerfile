FROM bluenviron/mediamtx:1 AS mediamtx

FROM alpine:3.22

RUN apk add --no-cache nginx ffmpeg python3

COPY --from=mediamtx /mediamtx /mediamtx
COPY relay/mediamtx.yml /mediamtx.yml
COPY relay/viewer_count.py /viewer_count.py

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
'      proxy_pass http://127.0.0.1:8892;' \
'      proxy_http_version 1.1;' \
'      proxy_set_header Host $host;' \
'      proxy_set_header X-Real-IP $remote_addr;' \
'      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
'      proxy_set_header X-Forwarded-Proto $scheme;' \
'      proxy_buffering off;' \
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

CMD ["/bin/sh", "-c", "EAST_SOURCE=\"${MTX_PATHS_EASTBANK_SOURCE:-$WVLRP_RTSP_SOURCE}\"; ROOST_SOURCE=\"${MTX_PATHS_ROOST_SOURCE:-$WVLRP_ROOST_RTSP_SOURCE}\"; env -u MTX_PATHS_EASTBANK_SOURCE -u MTX_PATHS_ROOST_SOURCE /mediamtx /mediamtx.yml & sleep 2; if [ -n \"$EAST_SOURCE\" ]; then (while true; do ffmpeg -hide_banner -loglevel warning -rtsp_transport tcp -i \"$EAST_SOURCE\" -map 0:v:0 -an -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -g 30 -keyint_min 30 -sc_threshold 0 -f rtsp -rtsp_transport tcp rtsp://127.0.0.1:8554/eastbank; rc=$?; echo \"[eastbank] ffmpeg exited rc=$rc; retrying in 5s\" >&2; sleep 5; done) & fi; if [ -n \"$ROOST_SOURCE\" ]; then (while true; do ffmpeg -hide_banner -loglevel warning -rtsp_transport tcp -i \"$ROOST_SOURCE\" -map 0:v:0 -an -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -g 30 -keyint_min 30 -sc_threshold 0 -f rtsp -rtsp_transport tcp rtsp://127.0.0.1:8554/roost; rc=$?; echo \"[roost] ffmpeg exited rc=$rc; retrying in 5s\" >&2; sleep 5; done) & fi; exec nginx -g 'daemon off;'"]
