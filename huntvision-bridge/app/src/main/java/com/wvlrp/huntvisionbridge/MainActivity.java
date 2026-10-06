package com.wvlrp.huntvisionbridge;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.graphics.Color;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    private LinearLayout results;
    private TextView status;
    private TextView liveResult;
    private EditText username;
    private EditText password;
    private EditText host;
    private EditText ivyPort;
    private EditText uid;
    private EditText mac;
    private Button scan;
    private Button liveTest;
    private ProgressBar spinner;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(buildUi());
    }

    @Override protected void onDestroy() {
        worker.shutdownNow();
        super.onDestroy();
    }

    private View buildUi() {
        ScrollView scroll = new ScrollView(this);
        LinearLayout root = column();
        root.setPadding(dp(18), dp(22), dp(18), dp(28));
        root.setBackgroundColor(Color.rgb(7, 19, 13));
        scroll.addView(root);

        root.addView(label("WVLRP", 30, true));
        root.addView(label("HUNTVISION CAMERA ID + IVY LIVE TEST", 14, true));
        root.addView(label(
                "This build recognizes Huntvision's direct Ivy TCP service on port 8888. " +
                "It does not invent an RTSP address when the camera does not expose RTSP.",
                14, false));

        root.addView(section("Known C31W target"));
        host = input("Camera host", false);
        host.setText("192.168.1.26");
        root.addView(host);

        ivyPort = input("Ivy TCP port", false);
        ivyPort.setInputType(InputType.TYPE_CLASS_NUMBER);
        ivyPort.setText("8888");
        root.addView(ivyPort);

        uid = input("Camera UID", false);
        uid.setText("7ZF544GA8T299IRWIJZZZCJE");
        root.addView(uid);

        mac = input("Camera MAC", false);
        mac.setText("C6:36:7A:86:51:90");
        root.addView(mac);

        username = input("Camera username", false);
        username.setText("admin");
        root.addView(username);

        password = input("Camera password", true);
        password.setText("");
        root.addView(password);

        liveTest = new Button(this);
        liveTest.setText("TEST HUNTVISION IVY LIVE VIDEO");
        liveTest.setOnClickListener(v -> startLiveTest());
        root.addView(liveTest);

        Button copyTarget = new Button(this);
        copyTarget.setText("COPY C31W WVLRP CONNECTION BLOCK");
        copyTarget.setOnClickListener(v -> copy("WVLRP C31W", targetBlock()));
        root.addView(copyTarget);

        liveResult = label(
                "Ready for direct .26:8888 test. Huntvision must remain installed on this phone.",
                13, false);
        liveResult.setPadding(0, dp(10), 0, dp(10));
        root.addView(liveResult);

        root.addView(section("LAN camera discovery"));
        scan = new Button(this);
        scan.setText("SCAN FOR HUNTVISION CAMERAS");
        scan.setOnClickListener(v -> startScan());
        root.addView(scan);

        spinner = new ProgressBar(this);
        spinner.setVisibility(View.GONE);
        root.addView(spinner);

        status = label("Ready — phone and camera must be on the same LAN.", 13, false);
        root.addView(status);

        results = column();
        root.addView(results);
        return scroll;
    }

    private void startLiveTest() {
        final String h = host.getText().toString().trim();
        final String pText = ivyPort.getText().toString().trim();
        final String u = username.getText().toString().trim();
        final String p = password.getText().toString();
        final String m = mac.getText().toString().trim();

        if (h.isEmpty()) {
            toast("Enter the camera IP");
            return;
        }

        final int port;
        try {
            port = Integer.parseInt(pText);
        } catch (Exception e) {
            toast("Ivy port must be a number");
            return;
        }

        setBusy(true);
        liveResult.setText("Starting direct Ivy test…");

        worker.submit(() -> {
            HuntvisionNativeBridge.Result r = HuntvisionNativeBridge.test(
                    this,
                    h,
                    port,
                    u,
                    p,
                    m,
                    msg -> runOnUiThread(() -> liveResult.setText(msg)));

            runOnUiThread(() -> {
                setBusy(false);
                liveResult.setText(r.summary);
                if (r.ok) {
                    status.setText("Success — Huntvision's encrypted Ivy transport was decoded by its installed native SDK.");
                } else {
                    status.setText("Ivy test did not complete. The exact failure is shown above.");
                }
            });
        });
    }

    private void startScan() {
        final String u = username.getText().toString().trim();
        final String p = password.getText().toString();

        setBusy(true);
        results.removeAllViews();

        worker.submit(() -> {
            List<CameraInfo> cams = CameraScanner.scan(
                    this,
                    u,
                    p,
                    msg -> runOnUiThread(() -> status.setText(msg)));

            runOnUiThread(() -> {
                setBusy(false);
                status.setText(cams.isEmpty()
                        ? "No compatible camera answered. Confirm the camera is online on this Wi-Fi and scan again."
                        : "Found " + cams.size() + " compatible camera(s).");
                for (CameraInfo c : cams) results.addView(card(c, u, p));
            });
        });
    }

    private void setBusy(boolean busy) {
        scan.setEnabled(!busy);
        liveTest.setEnabled(!busy);
        spinner.setVisibility(busy ? View.VISIBLE : View.GONE);
    }

    private View card(CameraInfo c, String user, String pass) {
        LinearLayout box = column();
        box.setPadding(dp(12), dp(12), dp(12), dp(12));
        box.setBackgroundColor(Color.rgb(13, 37, 25));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.setMargins(0, dp(12), 0, 0);
        box.setLayoutParams(lp);

        box.addView(label(c.title(), 20, true));
        add(box, "IP", c.ip);
        add(box, "Discovery", value(c.discovery));
        add(box, "Transport", value(c.transport));
        add(box, "Ivy TCP port", port(c.ivyPort));
        add(box, "Model", value(c.model));
        add(box, "Firmware", value(c.firmware));
        add(box, "Serial / UID", !c.serial.isEmpty() ? c.serial : value(c.uid));
        add(box, "MAC", value(c.mac));
        add(box, "Web port", port(c.webPort));
        add(box, "Media port", port(c.mediaPort));
        add(box, "RTSP port", port(c.rtspPort));
        add(box, "ONVIF port", port(c.onvifPort));
        add(box, "ONVIF device", value(c.onvifDeviceUrl));

        String main = c.bestMainRtsp(user, pass);
        String sub = c.bestSubRtsp(user, pass);
        add(box, "WVLRP main RTSP", value(main));
        add(box, "Sub RTSP", value(sub));

        String verify = !c.verifiedRtspUris.isEmpty()
                ? "RTSP authenticated + DESCRIBE succeeded"
                : (!c.onvifStreamUris.isEmpty()
                    ? "Exact stream URI returned by ONVIF"
                    : value(c.note));
        add(box, "Verification", verify);

        if (!main.isEmpty()) {
            Button copyRtsp = button("COPY MAIN RTSP", () -> copy("RTSP", main));
            box.addView(copyRtsp);
        }

        Button copyAll = button(
                "COPY WVLRP CONNECTION BLOCK",
                () -> copy("WVLRP camera", block(c, user, pass)));
        box.addView(copyAll);
        return box;
    }

    private String targetBlock() {
        return "CAMERA_HOST=" + host.getText().toString().trim() + "\n" +
                "CAMERA_TRANSPORT=HUNTVISION_IVY_TCP\n" +
                "CAMERA_IVY_PORT=" + ivyPort.getText().toString().trim() + "\n" +
                "CAMERA_USERNAME=" + username.getText().toString().trim() + "\n" +
                "CAMERA_PASSWORD=" + password.getText().toString() + "\n" +
                "CAMERA_UID=" + uid.getText().toString().trim() + "\n" +
                "CAMERA_MAC=" + mac.getText().toString().trim() + "\n" +
                "CAMERA_MODEL=C31W\n" +
                "CAMERA_FIRMWARE=1.1.1.1_5.2.3.148\n" +
                "CAMERA_RTSP_MAIN=\n" +
                "CAMERA_RTSP_SUB=\n" +
                "CAMERA_RTSP_PORT=\n" +
                "CAMERA_ONVIF_HOST=" + host.getText().toString().trim() + "\n" +
                "CAMERA_ONVIF_PORT=\n" +
                "CAMERA_ONVIF_DEVICE=\n";
    }

    private String block(CameraInfo c, String user, String pass) {
        return "CAMERA_HOST=" + c.ip + "\n" +
                "CAMERA_TRANSPORT=" + valueRaw(c.transport) + "\n" +
                "CAMERA_IVY_PORT=" + port(c.ivyPort) + "\n" +
                "CAMERA_USERNAME=" + user + "\n" +
                "CAMERA_PASSWORD=" + pass + "\n" +
                "CAMERA_UID=" + valueRaw(c.uid) + "\n" +
                "CAMERA_MAC=" + valueRaw(c.mac) + "\n" +
                "CAMERA_MODEL=" + valueRaw(c.model) + "\n" +
                "CAMERA_FIRMWARE=" + valueRaw(c.firmware) + "\n" +
                "CAMERA_RTSP_MAIN=" + c.bestMainRtsp(user, pass) + "\n" +
                "CAMERA_RTSP_SUB=" + c.bestSubRtsp(user, pass) + "\n" +
                "CAMERA_RTSP_PORT=" + port(c.rtspPort) + "\n" +
                "CAMERA_ONVIF_HOST=" + c.ip + "\n" +
                "CAMERA_ONVIF_PORT=" + port(c.onvifPort) + "\n" +
                "CAMERA_ONVIF_DEVICE=" + valueRaw(c.onvifDeviceUrl) + "\n" +
                "CAMERA_WEB_PORT=" + port(c.webPort) + "\n" +
                "CAMERA_MEDIA_PORT=" + port(c.mediaPort) + "\n";
    }

    private LinearLayout column() {
        LinearLayout x = new LinearLayout(this);
        x.setOrientation(LinearLayout.VERTICAL);
        return x;
    }

    private TextView section(String s) {
        TextView t = label(s, 18, true);
        t.setPadding(0, dp(18), 0, dp(6));
        return t;
    }

    private TextView label(String s, int sp, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(Color.rgb(225, 235, 228));
        if (bold) t.setTypeface(null, 1);
        t.setPadding(0, dp(5), 0, dp(5));
        t.setTextIsSelectable(true);
        return t;
    }

    private EditText input(String hint, boolean secret) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setTextColor(Color.WHITE);
        e.setHintTextColor(Color.GRAY);
        e.setSingleLine(true);
        if (secret) {
            e.setInputType(
                    InputType.TYPE_CLASS_TEXT |
                    InputType.TYPE_TEXT_VARIATION_PASSWORD);
        }
        return e;
    }

    private void add(LinearLayout p, String k, String v) {
        p.addView(label(k + "\n" + v, 13, false));
    }

    private Button button(String text, Runnable r) {
        Button b = new Button(this);
        b.setText(text);
        b.setOnClickListener(v -> r.run());
        return b;
    }

    private void copy(String label, String text) {
        ((ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE))
                .setPrimaryClip(ClipData.newPlainText(label, text));
        toast(label + " copied");
    }

    private void toast(String s) {
        Toast.makeText(this, s, Toast.LENGTH_SHORT).show();
    }

    private String value(String s) {
        return s == null || s.isEmpty() ? "—" : s;
    }

    private String valueRaw(String s) {
        return s == null ? "" : s;
    }

    private String port(int p) {
        return p > 0 ? Integer.toString(p) : "";
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }
}
