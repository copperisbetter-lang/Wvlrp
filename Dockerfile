# Back4App redeploy trigger: 2026-09-12
FROM bluenviron/mediamtx:1 AS mediamtx

FROM nginx:alpine

COPY --from=mediamtx /mediamtx /mediamtx
COPY relay/mediamtx.yml /mediamtx.yml

RUN printf '%s\n' \
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
'      return 200 "WVLRP relay online\\n";' \
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

CMD ["/bin/sh", "-c", "/mediamtx /mediamtx.yml & exec nginx -g 'daemon off;'"]
