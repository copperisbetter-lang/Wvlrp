package com.wvlrp.huntvisionbridge;

import android.util.Base64;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import javax.xml.parsers.DocumentBuilderFactory;

final class OnvifProbe {
    private static final String SOAP = "http://www.w3.org/2003/05/soap-envelope";
    private static final String DEVICE = "http://www.onvif.org/ver10/device/wsdl";
    private static final String MEDIA = "http://www.onvif.org/ver10/media/wsdl";
    private static final SecureRandom RNG = new SecureRandom();

    static boolean probe(CameraInfo c, String user, String pass) {
        Set<String> endpoints = new LinkedHashSet<>();
        if (!c.onvifDeviceUrl.isEmpty()) endpoints.add(c.onvifDeviceUrl);
        int[] ports = c.onvifPort > 0 ? new int[]{c.onvifPort, c.webPort, 888, 80, 88} : new int[]{888, c.webPort, 80, 88};
        for (int p : ports) if (p > 0) {
            endpoints.add("http://" + c.ip + ":" + p + "/onvif/Device");
            endpoints.add("http://" + c.ip + ":" + p + "/onvif/device_service");
        }

        for (String endpoint : endpoints) {
            try {
                String services = post(endpoint,
                        "<tds:GetServices xmlns:tds=\"" + DEVICE + "\"><tds:IncludeCapability>false</tds:IncludeCapability></tds:GetServices>", user, pass);
                if (services == null || !services.toLowerCase().contains("onvif")) continue;
                c.onvifDeviceUrl = endpoint;
                try {
                    URI du = URI.create(endpoint);
                    if (du.getPort() > 0) c.onvifPort = du.getPort();
                } catch (Exception ignored) {}
                c.discovery = c.discovery.isEmpty() ? "ONVIF" : c.discovery + " + ONVIF";

                String mediaUrl = serviceXAddr(services, "http://www.onvif.org/ver10/media/wsdl");
                if (mediaUrl.isEmpty()) mediaUrl = serviceXAddr(services, "http://www.onvif.org/ver20/media/wsdl");
                if (mediaUrl.isEmpty()) mediaUrl = baseFor(endpoint) + "/onvif/Media";
                c.onvifMediaUrl = normalizeHost(mediaUrl, c.ip);

                tryDeviceInfo(c, endpoint, user, pass);
                tryStreams(c, c.onvifMediaUrl, user, pass);
                return true;
            } catch (Exception ignored) {}
        }
        return false;
    }

    private static void tryDeviceInfo(CameraInfo c, String endpoint, String user, String pass) {
        try {
            String xml = post(endpoint, "<tds:GetDeviceInformation xmlns:tds=\"" + DEVICE + "\"/>", user, pass);
            String v;
            v = first(xml, "Manufacturer"); if (!v.isEmpty()) c.manufacturer = v;
            v = first(xml, "Model"); if (!v.isEmpty()) c.model = v;
            v = first(xml, "FirmwareVersion"); if (!v.isEmpty()) c.firmware = v;
            v = first(xml, "SerialNumber"); if (!v.isEmpty()) c.serial = v;
        } catch (Exception ignored) {}
    }

    private static void tryStreams(CameraInfo c, String mediaUrl, String user, String pass) {
        try {
            String profiles = post(mediaUrl, "<trt:GetProfiles xmlns:trt=\"" + MEDIA + "\"/>", user, pass);
            List<String> tokens = profileTokens(profiles);
            for (String token : tokens) {
                String body = "<trt:GetStreamUri xmlns:trt=\"" + MEDIA + "\" xmlns:tt=\"http://www.onvif.org/ver10/schema\">" +
                        "<trt:StreamSetup><tt:Stream>RTP-Unicast</tt:Stream><tt:Transport><tt:Protocol>RTSP</tt:Protocol></tt:Transport></trt:StreamSetup>" +
                        "<trt:ProfileToken>" + NetUtil.xmlEscape(token) + "</trt:ProfileToken></trt:GetStreamUri>";
                String xml = post(mediaUrl, body, user, pass);
                String uri = first(xml, "Uri");
                if (!uri.isEmpty()) {
                    uri = normalizeHost(uri, c.ip);
                    if (!c.onvifStreamUris.contains(uri)) c.onvifStreamUris.add(uri);
                    try {
                        URI u = URI.create(uri);
                        if (u.getPort() > 0) c.rtspPort = u.getPort();
                    } catch (Exception ignored) {}
                }
                if (c.onvifStreamUris.size() >= 4) break;
            }
        } catch (Exception ignored) {}
    }

    private static String baseFor(String endpoint) {
        try {
            URI u = URI.create(endpoint);
            return u.getScheme() + "://" + u.getHost() + (u.getPort() > 0 ? ":" + u.getPort() : "");
        } catch (Exception e) { return endpoint; }
    }

    private static String normalizeHost(String url, String host) {
        if (url == null) return "";
        return url.replace("0.0.0.0", host).replace("127.0.0.1", host).replace("localhost", host);
    }

    private static String serviceXAddr(String xml, String wantedNs) throws Exception {
        Document d = parse(xml);
        NodeList services = d.getElementsByTagNameNS("*", "Service");
        for (int i = 0; i < services.getLength(); i++) {
            Element e = (Element) services.item(i);
            String ns = childText(e, "Namespace");
            String xa = childText(e, "XAddr");
            if (wantedNs.equals(ns) && !xa.isEmpty()) return xa;
        }
        return "";
    }

    private static List<String> profileTokens(String xml) throws Exception {
        List<String> out = new ArrayList<>();
        Document d = parse(xml);
        NodeList all = d.getElementsByTagNameNS("*", "Profiles");
        for (int i = 0; i < all.getLength(); i++) {
            Element e = (Element) all.item(i);
            String token = e.getAttribute("token");
            if (token.isEmpty()) token = e.getAttribute("Token");
            if (!token.isEmpty()) out.add(token);
        }
        return out;
    }

    private static String first(String xml, String local) throws Exception {
        if (xml == null) return "";
        Document d = parse(xml);
        NodeList n = d.getElementsByTagNameNS("*", local);
        return n.getLength() == 0 ? "" : n.item(0).getTextContent().trim();
    }

    private static String childText(Element e, String local) {
        NodeList n = e.getElementsByTagNameNS("*", local);
        return n.getLength() == 0 ? "" : n.item(0).getTextContent().trim();
    }

    private static Document parse(String xml) throws Exception {
        DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
        f.setNamespaceAware(true);
        try { f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true); } catch (Exception ignored) {}
        return f.newDocumentBuilder().parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
    }

    private static String post(String endpoint, String body, String user, String pass) throws Exception {
        HttpURLConnection h = (HttpURLConnection) new URL(endpoint).openConnection();
        h.setConnectTimeout(1400);
        h.setReadTimeout(2200);
        h.setRequestMethod("POST");
        h.setDoOutput(true);
        h.setRequestProperty("Content-Type", "application/soap+xml; charset=utf-8");
        h.setRequestProperty("Connection", "close");
        String sec = security(user, pass);
        String envelope = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><s:Envelope xmlns:s=\"" + SOAP + "\"><s:Header>" + sec + "</s:Header><s:Body>" + body + "</s:Body></s:Envelope>";
        h.getOutputStream().write(envelope.getBytes(StandardCharsets.UTF_8));
        int code = h.getResponseCode();
        InputStream in = code >= 400 ? h.getErrorStream() : h.getInputStream();
        if (in == null) throw new IllegalStateException("ONVIF HTTP " + code);
        String xml = read(in);
        if (code >= 400) throw new IllegalStateException("ONVIF HTTP " + code);
        return xml;
    }

    private static String security(String user, String pass) throws Exception {
        if (user == null || user.isEmpty()) return "";
        byte[] nonce = new byte[16]; RNG.nextBytes(nonce);
        String created = NetUtil.utcNow();
        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        raw.write(nonce);
        raw.write(created.getBytes(StandardCharsets.UTF_8));
        raw.write((pass == null ? "" : pass).getBytes(StandardCharsets.UTF_8));
        byte[] digest = MessageDigest.getInstance("SHA-1").digest(raw.toByteArray());
        String b64Digest = Base64.encodeToString(digest, Base64.NO_WRAP);
        String b64Nonce = Base64.encodeToString(nonce, Base64.NO_WRAP);
        return "<wsse:Security s:mustUnderstand=\"1\" xmlns:wsse=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd\" xmlns:wsu=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd\">" +
                "<wsse:UsernameToken><wsse:Username>" + NetUtil.xmlEscape(user) + "</wsse:Username>" +
                "<wsse:Password Type=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest\">" + b64Digest + "</wsse:Password>" +
                "<wsse:Nonce EncodingType=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary\">" + b64Nonce + "</wsse:Nonce>" +
                "<wsu:Created>" + created + "</wsu:Created></wsse:UsernameToken></wsse:Security>";
    }

    private static String read(InputStream in) throws Exception {
        byte[] buf = new byte[4096];
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        int n;
        while ((n = in.read(buf)) > 0 && out.size() < 512000) out.write(buf, 0, n);
        in.close();
        return out.toString("UTF-8");
    }
}
