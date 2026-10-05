package com.wvlrp.huntvisionbridge;

import android.net.Uri;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public final class CameraInfo {
    public String ip = "";
    public String name = "";
    public String manufacturer = "";
    public String model = "";
    public String firmware = "";
    public String serial = "";
    public String mac = "";
    public String uid = "";
    public int webPort = 0;
    public int httpsPort = 0;
    public int mediaPort = 0;
    public int rtspPort = 0;
    public int onvifPort = 0;
    public String onvifDeviceUrl = "";
    public String onvifMediaUrl = "";
    public final List<String> onvifStreamUris = new ArrayList<>();
    public final List<String> verifiedRtspUris = new ArrayList<>();
    public final Set<Integer> openPorts = new LinkedHashSet<>();
    public String discovery = "";
    public String note = "";

    public String bestMainRtsp(String username, String password) {
        if (!onvifStreamUris.isEmpty()) return withCredentials(onvifStreamUris.get(0), username, password);
        if (!verifiedRtspUris.isEmpty()) return withCredentials(verifiedRtspUris.get(0), username, password);
        int port = rtspPort > 0 ? rtspPort : (mediaPort > 0 ? mediaPort : (webPort > 0 ? webPort : 554));
        return rtspUrl(ip, port, "videoMain", username, password);
    }

    public String bestSubRtsp(String username, String password) {
        if (onvifStreamUris.size() > 1) return withCredentials(onvifStreamUris.get(1), username, password);
        for (String u : verifiedRtspUris) if (u.toLowerCase().contains("videosub")) return withCredentials(u, username, password);
        int port = rtspPort > 0 ? rtspPort : (mediaPort > 0 ? mediaPort : (webPort > 0 ? webPort : 554));
        return rtspUrl(ip, port, "videoSub", username, password);
    }

    public static String rtspUrl(String host, int port, String path, String username, String password) {
        String auth = "";
        if (username != null && !username.isEmpty()) {
            auth = Uri.encode(username, "-._~") + ":" + Uri.encode(password == null ? "" : password, "-._~") + "@";
        }
        return "rtsp://" + auth + host + ":" + port + "/" + path;
    }

    public static String withCredentials(String raw, String username, String password) {
        if (raw == null || raw.isEmpty() || username == null || username.isEmpty()) return raw;
        try {
            Uri u = Uri.parse(raw);
            String host = u.getHost();
            if (host == null) return raw;
            int p = u.getPort();
            String port = p > 0 ? ":" + p : "";
            String path = u.getEncodedPath() == null ? "" : u.getEncodedPath();
            String query = u.getEncodedQuery() == null ? "" : "?" + u.getEncodedQuery();
            return "rtsp://" + Uri.encode(username, "-._~") + ":" + Uri.encode(password == null ? "" : password, "-._~") + "@" + host + port + path + query;
        } catch (Exception e) {
            return raw;
        }
    }

    public String title() {
        if (!name.isEmpty()) return name;
        if (!model.isEmpty()) return model;
        return "Camera " + ip;
    }
}
