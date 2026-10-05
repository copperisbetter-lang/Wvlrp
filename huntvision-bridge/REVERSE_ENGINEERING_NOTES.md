# Huntvision 2.1.22 interoperability notes

Source inspected: `HUNTVISION_2.1.22_APKPure (1).xapk`, package `com.huntivison.huntivison`, version 2.1.22.

## Data already present inside Huntvision

The camera model in the DEX includes fields for:

- `ip`
- `ipPort`
- `ipMediaPort`
- `username`
- `password`
- `ipcUid`
- `ddns` / `ddnsPort`
- `macId`
- `streamType`
- `connectType` / `conn_connType`
- P2P token metadata

The embedded SQLite schema persists the corresponding values. Local discovery objects expose IP, port, MAC, UID, name, version and related network values.

## Native SDK capabilities found

The arm64 split contains `libIvyIoSdkJni.so`, `libp2pJni.so`, `libIOTCAPIs.so`, `libRDTAPIs.so`, `libFosCryptJni.so` and FFmpeg-related libraries.

`libIvyIoSdkJni.so` exposes JNI/native calls for RTSP open/close/frame reads, discovery, camera connection information and camera CGI operations. Native strings include a Foscam-style `setPortInfo` request with `webPort`, `httpsPort`, `mediaPort`, `onvifPort`, and `rtspPort`.

The Java SDK classes include `PortInfo` fields for web, HTTPS, media and ONVIF ports and a `GetPortInfo` call. Native code additionally handles an RTSP port field.

## Rebuild decision

Rather than redistribute Huntvision's proprietary app code, WVLRP Bridge reimplements only the network interoperability needed by WVLRP. This avoids depending on Huntvision's UI  or cloud/P2p service and makes the camera-to-WVLRP handoff explicit.
