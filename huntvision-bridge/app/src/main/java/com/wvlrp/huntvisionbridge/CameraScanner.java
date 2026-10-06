package com.wvlrp.huntvisionbridge;

import android.content.Context;
import android.net.wifi.WifiManager;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class CameraScanner {
    interface Progress { void onProgress(String message); }

    static List<CameraInfo> scan(Context context, String user, String pass, Progress progress) {
        Map<String, CameraInfo> found = new ConcurrentHashMap<>();
        progress.onProgress("Listening for ONVIF / camera discovery…");
        wsDiscovery(context, found);

        String local = NetUtil.localIpv4();
        String prefix = NetUtil.subnetPrefix(local);
        if (!prefix.isEmpty()) {
            progress.onProgress("Scanning " + prefix + "0/24 for Huntvision/Foscam-compatible cameras…");
            subnetScan(prefix, local, found);
        } else {
            progress.onProgress("Could not identify the Wi-Fi subnet; using discovery responses only.");
        }

        List<CameraInfo> candidates = new ArrayList<>(found.values());
        Collections.sort(candidates, (a,b) -> a.ip.compareTo(b.ip));
        List<CameraInfo> cameras = new ArrayList<>();
        int i = 0;
        for (CameraInfo c : candidates) {
            i++;
            progress.onProgress("Checking " + c.ip + " (" + i + "/" + candidates.size() + ")…");
            boolean ivy = c.openPorts.contains(8888);
            if (ivy) {
                c.ivyPort = 8888;
                c.transport = "HUNTVISION_IVY_TCP";
                if (c.discovery == null || c.discovery.isEmpty()) c.discovery = "LAN scan";
                c.note = "Huntvision Ivy TCP service answered on port 8888. RTSP/ONVIF may be absent.";
            }

            boolean cgi = HttpCameraProbe.probe(c, user, pass);
            boolean onvif = OnvifProbe.probe(c, user, pass);
            if (!cgi && !onvif && !ivy && !c.discovery.contains("WS-Discovery")) continue;

            verifyRtsp(c, user, pass);
            cameras.add(c);
        }
        return cameras;
    }

    private static void subnetScan(String prefix, String local, Map<String, CameraInfo> found) {
        ExecutorService pool = Executors.newFixedThreadPool(48);
        for (int n = 1; n <= 254; n++) {
            final String ip = prefix + n;
            if (ip.equals(local)) continue;
            pool.submit(() -> {
                int[] ports = {80, 88, 443, 554, 888, 8080, 8888};
                CameraInfo c = null;
                for (int p : ports) {
                    if (open(ip, p, 180)) {
                        if (c == null) {
                            c = found.computeIfAbsent(ip, k -> { CameraInfo x = new CameraInfo(); x.ip = k; x.discovery = "LAN scan"; return x; });
                        }
                        c.openPorts.add(p);
                    }
                }
            });
        }
        pool.shutdown();
        try { pool.awaitTermination(12, TimeUnit.SECONDS); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    private static boolean open(String ip, int port, int timeout) {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(ip, port), timeout);
            return true;
        } catch (Exception e) { return false; }
    }

    private static void wsDiscovery(Context context, Map<String, CameraInfo> found) {
        WifiManager.MulticastLock lock = null;
        DatagramSocket socket = null;
        try {
            WifiManager wifi = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifi != null) {
                lock = wifi.createMulticastLock("wvlrp-huntvision-discovery");
                lock.setReferenceCounted(false);
                lock.acquire();
            }
            socket = new DatagramSocket();
            socket.setSoTimeout(450);
            String id = "uuid:" + UUID.randomUUID();
            String probe = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                    "<e:Envelope xmlns:e=\"http://www.w3.org/2003/05/soap-envelope\" xmlns:w=\"http://schemas.xmlsoap.org/ws/2004/08/addressing\" xmlns:d=\"http://schemas.xmlsoap.org/ws/2005/04/discovery\" xmlns:dn=\"http://www.onvif.org/ver10/network/wsdl\">" +
                    "<e:Header><w:MessageID>" + id + "</w:MessageID><w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To><w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header>" +
                    "<e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>";
            byte[] data = probe.getBytes(StandardCharsets.UTF_8);
            DatagramPacket p = new DatagramPacket(data, data.length, InetAddress.getByName("239.255.255.250"), 3702);
            for (int k = 0; k < 2; k++) socket.send(p);

            long until = System.currentTimeMillis() + 2200;
            while (System.currentTimeMillis() < until) {
                try {
                    byte[] buf = new byte[16384];
                    DatagramPacket r = new DatagramPacket(buf, buf.length);
                    socket.receive(r);
                    String xml = new String(r.getData(), 0, r.getLength(), StandardCharsets.UTF_8);
                    String ip = r.getAddress().getHostAddress();
                    if (!NetUtil.isPrivateIpv4(ip)) continue;
                    CameraInfo c = found.computeIfAbsent(ip, key -> { CameraInfo x = new CameraInfo(); x.ip = key; return x; });
                    c.discovery = "WS-Discovery";
                    String xaddr = elementText(xml, "XAddrs");
                    if (!xaddr.isEmpty()) {
                        for (String u : xaddr.split("\\s+")) {
                            if (u.toLowerCase().contains("onvif")) {
                                c.onvifDeviceUrl = replaceHost(u, ip);
                                try {
                                    URI uri = URI.create(c.onvifDeviceUrl);
                                    if (uri.getPort() > 0) c.onvifPort = uri.getPort();
                                } catch (Exception ignored) {}
                                break;
                            }
                        }
                    }
                    String scopes = elementText(xml, "Scopes");
                    if (!scopes.isEmpty()) {
                        String n = scopeValue(scopes, "name");
                        if (!n.isEmpty()) c.name = n;
                        String hw = scopeValue(scopes, "hardware");
                        if (!hw.isEmpty()) c.model = hw;
                    }
                } catch (java.net.SocketTimeoutException timeout) {
                    // keep listening until overall deadline
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (socket != null) socket.close();
            if (lock != null && lock.isHeld()) lock.release();
        }
    }

    private static String replaceHost(String url, String ip) {
        try {
            URI u = URI.create(url);
            String port = u.getPort() > 0 ? ":" + u.getPort() : "";
            return u.getScheme() + "://" + ip + port + (u.getRawPath() == null ? "" : u.getRawPath());
        } catch (Exception e) { return url; }
    }

    private static String elementText(String xml, String local) {
        Matcher m = Pattern.compile("<(?:\\w+:)?" + local + "(?:\\s[^>]*)?>(.*?)</(?:\\w+:)?" + local + ">", Pattern.CASE_INSENSITIVE | Pattern.DOTALL).matcher(xml);
        return m.find() ? m.group(1).replace("&amp;", "&").trim() : "";
    }

    private static String scopeValue(String scopes, String key) {
        Matcher m = Pattern.compile("onvif://www\\.onvif\\.org/" + key + "/([^\\s]+)", Pattern.CASE_INSENSITIVE).matcher(scopes);
        if (!m.find()) return "";
        try { return java.net.URLDecoder.decode(m.group(1), "UTF-8"); }
        catch (Exception e) { return m.group(1); }
    }

    private static void verifyRtsp(CameraInfo c, String user, String pass) {
        Set<Integer> ports = new LinkedHashSet<>();
        if (c.rtspPort > 0) ports.add(c.rtspPort);
        if (c.mediaPort > 0) ports.add(c.mediaPort);
        if (c.webPort > 0) ports.add(c.webPort);
        if (c.openPorts.contains(554)) ports.add(554);
        ports.add(554);
        if (c.onvifStreamUris.isEmpty()) {
            outer:
            for (int p : ports) {
                for (String path : new String[]{"videoMain", "videoSub"}) {
                    RtspProbe.Result r = RtspProbe.probe(c.ip, p, path, user, pass);
                    if (r.endpoint) {
                        if (c.rtspPort == 0) c.rtspPort = p;
                        String raw = "rtsp://" + c.ip + ":" + p + "/" + path;
                        if (r.authenticated && !c.verifiedRtspUris.contains(raw)) c.verifiedRtspUris.add(raw);
                        if (r.code == 401 && (user == null || user.isEmpty())) c.note = "RTSP endpoint found; enter camera login to verify the stream.";
                    }
                    if (c.verifiedRtspUris.size() >= 2) break outer;
                }
            }
        } else {
            for (String raw : c.onvifStreamUris) {
                try {
                    URI u = URI.create(raw);
                    int p = u.getPort() > 0 ? u.getPort() : 554;
                    String path = u.getRawPath();
                    if (path != null && path.startsWith("/")) path = path.substring(1);
                    if (u.getRawQuery() != null) path += "?" + u.getRawQuery();
                    RtspProbe.Result r = RtspProbe.probe(c.ip, p, path, user, pass);
                    if (r.authenticated && !c.verifiedRtspUris.contains(raw)) c.verifiedRtspUris.add(raw);
                } catch (Exception ignored) {}
            }
        }
    }
}
