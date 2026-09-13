FROM bluenviron/mediamtx:1

COPY relay/mediamtx.yml /mediamtx.yml

EXPOSE 8888

CMD ["/mediamtx.yml"]
