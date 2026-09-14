FROM bluenviron/mediamtx:1 AS mediamtx

FROM alpine:3.22

RUN apk add --no-cache nginx ffmpeg

COPY --from=mediamtx /mediamtx /mediamtx
COPY relay/mediamtx.yml /mediamtx.yml

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
'      return 200 "WVLRP East Bank relay video-restore-20260914\\n";' \
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

CMD ["/bin/sh", "-c", "if [ -n \"$WVLRP_RTSP_SOURCE\" ] && [ -z \"$MTX_PATHS_EASTBANK_SOURCE\" ]; then export MTX_PATHS_EASTBANK_SOURCE=\"$WVLRP_RTSP_SOURCE\"; fi; env -u MTX_PATHS_EASTBANK_SOURCE /mediamtx /mediamtx.yml & sleep 2; ffmpeg -hide_banner -loglevel warning -rtsp_transport tcp -i \"$MTX_PATHS_EASTBANK_SOURCE\" -map 0:v:0 -an -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -g 30 -keyint_min 30 -sc_threshold 0 -f rtsp -rtsp_transport tcp rtsp://127.0.0.1:8554/eastbank & exec nginx -g 'daemon off;'"]
