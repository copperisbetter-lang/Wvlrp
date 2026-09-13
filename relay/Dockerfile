FROM bluenviron/mediamtx:1 AS mediamtx

FROM nginx:alpine

COPY --from=mediamtx /mediamtx /mediamtx
COPY mediamtx.yml /mediamtx.yml

RUN printf '%s\n' \
'worker_processes 1;' \
'events { worker_connections 1024; }' \
'http {' \
'  server {' \
'    listen 8888;' \
'    location = / { return 200 "WVLRP relay online\\n"; }' \
'    location / {' \
'      proxy_pass http://127.0.0.1:8891;' \
'      proxy_buffering off;' \
'      proxy_read_timeout 3600s;' \
'    }' \
'  }' \
'}' > /etc/nginx/nginx.conf

EXPOSE 8888

CMD ["/bin/sh", "-c", "/mediamtx /mediamtx.yml & exec nginx -g 'daemon off;'"]
