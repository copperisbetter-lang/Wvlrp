package com.wvlrp.huntvisionbridge;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class RtspProbe {
    static final class Result {
        final boolean endpoint;
        final boolean authenticated;
        final int code;
        Result(boolean endpoint, boolean authenticated, int code) {
            this.endpoint = endpoint; this.authenticated = authenticated; this.code = code;
        }
    }

    static Result probe(String host, int port, String path, String username, String password) {
        try {
            Response first = request(host, port, path, null);
            if (first.code == 200) return new Result(true, true, 200);
            if (first.code != 401) return new Result(first.code > 0, false, first.code);
            if (username == null || username.isEmpty()) return new Result(true, false, 401);
            String challenge = first.headers.get("www-authenticate");
            if (challenge == null) return new Result(true, false, 401);
            String requestUri = "rtsp://" + host + ":" + port + "/" + path;
            String auth = challenge.toLowerCase(Locale.US).startsWith("basic ")
                    ? basic(username, password)
                    : digest(challenge, username, password, "DESCRIBE", requestUri);
            if (auth == null) return new Result(true, false, 401);
            Response second = request(host, port, path, auth);
            return new Result(second.code > 0, second.code == 200, second.code);
        } catch (Exception e) {
            return new Result(false, false, 0);
        }
    }

    private static final class Response {
        int code;
        final Map<String,String> headers = new HashMap<>();
    }

    private static Response request(String host, int port, String path, String authorization) throws Exception {
        Socket s = new Socket();
        s.connect(new InetSocketAddress(host, port), 1000);
        s.setSoTimeout(1400);
        BufferedWriter w = new BufferedWriter(new OutputStreamWriter(s.getOutputStream(), StandardCharsets.US_ASCII));
        String uri = "rtsp://" + host + ":" + port + "/" + path;
        w.write("DESCRIBE " + uri + " RTSP/1.0\r\n");
        w.write("CSeq: 1\r\n");
        w.write("Accept: application/sdp\r\n");
        w.write("User-Agent: WVLRP-Huntvision-Bridge/0.1\r\n");
        if (authorization != null) w.write("Authorization: " + authorization + "\r\n");
        w.write("\r\n");
        w.flush();

        BufferedReader r = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.US_ASCII));
        Response out = new Response();
        String line = r.readLine();
        if (line != null) {
            Matcher m = Pattern.compile("RTSP/\\d\\.\\d\\s+(\\d+)").matcher(line);
            if (m.find()) out.code = Integer.parseInt(m.group(1));
        }
        while ((line = r.readLine()) != null && !line.isEmpty()) {
            int p = line.indexOf(':');
            if (p > 0) out.headers.put(line.substring(0,p).trim().toLowerCase(Locale.US), line.substring(p+1).trim());
        }
        s.close();
        return out;
    }

    private static String basic(String user, String pass) {
        String raw = user + ":" + (pass == null ? "" : pass);
        return "Basic " + android.util.Base64.encodeToString(raw.getBytes(StandardCharsets.UTF_8), android.util.Base64.NO_WRAP);
    }

    private static String digest(String challenge, String user, String pass, String method, String uri) {
        try {
            Map<String,String> p = new HashMap<>();
            Matcher m = Pattern.compile("(\\w+)=\"([^\"]*)\"|(\\w+)=([^,\\s]+)").matcher(challenge);
            while (m.find()) {
                String k = m.group(1) != null ? m.group(1) : m.group(3);
                String v = m.group(2) != null ? m.group(2) : m.group(4);
                p.put(k.toLowerCase(Locale.US), v);
            }
            String realm = p.get("realm"), nonce = p.get("nonce");
            if (realm == null || nonce == null) return null;
            String qopRaw = p.get("qop");
            String qop = qopRaw != null && qopRaw.toLowerCase(Locale.US).contains("auth") ? "auth" : null;
            String ha1 = NetUtil.md5(user + ":" + realm + ":" + (pass == null ? "" : pass));
            String ha2 = NetUtil.md5(method + ":" + uri);
            String cnonce = UUID.randomUUID().toString().replace("-", "").substring(0,16);
            String nc = "00000001";
            String response = qop == null ? NetUtil.md5(ha1 + ":" + nonce + ":" + ha2)
                    : NetUtil.md5(ha1 + ":" + nonce + ":" + nc + ":" + cnonce + ":" + qop + ":" + ha2);
            StringBuilder a = new StringBuilder("Digest username=\"").append(user.replace("\"", "")).append("\"")
                    .append(", realm=\"").append(realm).append("\"")
                    .append(", nonce=\"").append(nonce).append("\"")
                    .append(", uri=\"").append(uri).append("\"")
                    .append(", response=\"").append(response).append("\"");
            if (qop != null) a.append(", qop=").append(qop).append(", nc=").append(nc).append(", cnonce=\"").append(cnonce).append("\"");
            if (p.get("opaque") != null) a.append(", opaque=\"").append(p.get("opaque")).append("\"");
            return a.toString();
        } catch (Exception e) { return null; }
    }
}
