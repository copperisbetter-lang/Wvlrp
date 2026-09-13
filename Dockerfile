FROM bluenviron/mediamtx:1 AS mediamtx

FROM nginx:alpine

COPY --from=mediamtx /mediamtx /mediamtx
COPY relay/mediamtx.yml /mediamtx.yml
COPY relay/nginx.conf /etc/nginx/nginx.conf
COPY relay/start.sh /start.sh

RUN chmod +x /start.sh

EXPOSE 8888

CMD ["/start.sh"]
