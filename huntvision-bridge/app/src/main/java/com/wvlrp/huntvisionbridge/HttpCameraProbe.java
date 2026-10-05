package com.wvlrp.huntvisionbridge;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class HttpCameraProbe {
    private static String enc(String s) {
        try { return URLEncoder.encode(s == null ? "" : s, "UTF-8"); }
        catch (Exception e) { return ""; }
    }

    static boolean probe(CameraInfo c, String user, String pass) {
        int[] candidates = c.webPort > 0 ? new int[]{c.webPort, 88, 80, 8080} : new int[]{88, 80, 8080};
        for (int port : candidates) {
            try {
                String xml = get("http://" + c.ip + ":" + port + "/cgi-bin/CGIProxy.fcgi?cmd=getPortInfo", 1300);
                if (xml != null && (xml.contains("<webPort>") || xml.contains("<mediaPort>") || xml.contains("<onvifPort>"))) {
                    c.discovery = c.discovery.isEmpty() ? "Foscam/Huntvision CGI" : c.discovery + " + CGI";
                    c.webPort = intTag(xml, "webPort", port);
                    c.httpsPort = intTag(xml, "httpsPort", c.httpsPort);
                    c.mediaPort = intTag(xml, "mediaPort", c.mediaPort);
                    c.onvifPort = intTag(xml, "onvifPort", c.onvifPort);
                    c.rtspPort = intTag(xml, "rtspPort", c.rtspPort);
                    if (c.webPort == 0) c.webPort = port;
                    if (user != null && !user.isEmpty()) probeDevInfo(c, user, pass, c.webPort);
                    return true;
                }
            } catch (Exception ignored) {}
        }
        return false;
    }

    private static void probeDevInfo(CameraInfo c, String user, String pass, int port) {
        try {
            String q = "http://" + c.ip + ":" + port + "/cgi-bin/CGIProxy.fcgi?cmd=getDevInfo&usr=" + enc(user) + "&pwd=" + enc(pass);
            String xml = get(q, 1600);
            if (xml == null) return;
            if (tag(xml, "productName").length() > 0) c.model = tag(xml, "productName");
            if (tag(xml, "devName").length() > 0) c.name = tag(xml, "devName");
            if (tag(xml, "serialNo").length() > 0) c.serial = tag(xml, "serialNo");
            if (tag(xml, "mac").length() > 0) c.mac = tag(xml, "mac");
            String fw = tag(xml, "firmwareVer");
            if (fw.isEmpty()) fw = tag(xml, "firmwareVersion");
            if (!fw.isEmpty()) c.firmware = fw;
        } catch (Exception ignored) {}
    }

    static String get(String url, int timeoutMs) throws Exception {
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        h.setConnectTimeout(timeoutMs);
        h.setReadTimeout(timeoutMs);
        h.setRequestMethod("GET");
        h.setRequestProperty("Connection", "close");
        int code = h.getResponseCode();
        InputStream in = code >= 400 ? h.getErrorStream() : h.getInputStream();
        if (in == null) return null;
        BufferedReader br = new BufferedReader(new InputStreamReader(in));
        StringBuilder out = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null && out.length() < 128000) out.append(line).append('\n');
        br.close();
        return out.toString();
    }

    static String tag(String xml, String name) {
        if (xml == null) return "";
        Matcher m = Pattern.compile("<" + Pattern.quote(name) + ">(.*?)</" + Pattern.quote(name) + ">", Pattern.CASE_INSENSITIVE | Pattern.DOTALL).matcher(xml);
        return m.find() ? m.group(1).trim() : "";
    }

    static int intTag(String xml, String name, int fallback) {
        try {
            String s = tag(xml, name);
            return s.isEmpty() ? fallback : Integer.parseInt(s.trim());
        } catch (Exception e) { return fallback; }
    }
}
