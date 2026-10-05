# WVLRP Huntvision Bridge

A clean-room Android utility built from interoperability findings in the user-supplied Huntvision 2.1.22 XAPK. It does **not** contain or redistribute Huntvision application code.

## Goal

After a Huntvision camera has been placed on the same LAN as the Android phone, the app:

1. sends ONVIF WS-Discovery probes;
2. scans the local /24 for common camera ports;
3. probes Foscam/Huntvision-compatible `getPortInfo` CGI endpoints;
4. queries ONVIF services, device information, media profiles, and exact `GetStreamUri` results when the camera login is provided;
5. probes RTSP with Basic or Digest authentication;
6. shows IP, web/media/RTSP/ONVIF ports, model, firmware, serial/MAC when available, main/sub RTSP URLs, and the ONVIF device URL;
7. copies a WVLRP-ready connection block.

Camera credentials are used only for direct LAN requests from the phone. This project has no cloud API, analytics, or Internet upload code.

## Why these probes

The analyzed Huntvision package stores local camera fields including IP, web port, media port, username/password, UID, MAC, stream type, and connection type. Its native camera SDK exposes RTSP open/read functions and a Foscam-derived port configuration with web/media/HTTPS/ONVIF/RTSP values. Huntvision also identifies its platform history with IVYIOT/Foscam.

Foscam's documented HD-camera RTSP convention is `rtsp://USER:PASSWORD@IP:PORT/videoMain` and `/videoSub`; however the app prefers the exact URI returned by ONVIF and only falls back to that convention when needed.

## WVLRP mapping

The existing WVLRP relay consumes a private RTSP source. East Bank currently uses `WVLRP_RTSP_SOURCE`; ONVIF PTZ uses separate host/port/username/password variables. The bridge's copied connection block exposes the same raw pieces so a Huntvision camera can be assigned to a WVLRP camera slot without exposing the private camera URL in the public website repository.

## Build

Open this folder in Android Studio, or run the GitHub Actions build workflow included on the WVLRP feature branch used for this prototype.
