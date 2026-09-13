FROM bluenviron/mediamtx:1 AS mediamtx

FROM nginx:alpine

COPY --from=mediamtx /mediamtx /mediamtx
COPY mediamtx.yml /mediamtx.yml
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /start.sh

RUN chmod +x /start.sh

EXPOSE 8888

CMD ["/start.sh"]
