# WVLRP East Bank Live Relay

This folder runs a lightweight MediaMTX relay that pulls one RTSP stream from the East Bank camera and exposes browser-safe HLS/WebRTC outputs for the WVLRP website.

## What it does

- Input: RTSP camera stream (kept in a host-only environment variable)
- HLS output: `http://RELAY_HOST:8888/eastbank/index.m3u8`
- WebRTC page/API: `http://RELAY_HOST:8889/eastbank`
- The website's custom East Bank player can consume the HLS `.m3u8` URL directly.

## Start it

1. Copy `.env.example` to `.env` on the relay server.
2. Put the real East Bank RTSP address in `WVLRP_RTSP_SOURCE`.
3. Run:

```bash
docker compose up -d
```

The real camera address should never be committed to the public repository.

## Website hookup

Once the relay has a public HTTPS hostname, set `window.WVLRP_STREAM_URL` in `east-bank.html` to the relay's HLS endpoint, for example:

```text
https://relay.example.com/eastbank/index.m3u8
```

For production HTTPS, place a reverse proxy such as Caddy or an equivalent TLS proxy in front of ports 8888/8889.
