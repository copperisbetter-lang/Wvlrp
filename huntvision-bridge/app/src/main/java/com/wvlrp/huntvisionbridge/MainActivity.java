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
    private EditText username, password;
    private Button scan;
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
        root.addView(label("HUNTVISION CAMERA BRIDGE", 14, true));
        root.addView(label("Find a Huntvision camera on this Wi-Fi and show the exact local connection information WVLRP needs.", 14, false));

        username = input("Camera username", false); username.setText("admin");
        password = input("Camera password", true);
        root.addView(username); root.addView(password);

        scan = new Button(this); scan.setText("SCAN FOR HUNTVISION CAMERAS");
        scan.setOnClickListener(v -> startScan()); root.addView(scan);
        spinner = new ProgressBar(this); spinner.setVisibility(View.GONE); root.addView(spinner);
        status = label("Ready — phone and camera must be on the same LAN.", 13, false); root.addView(status);
        results = column(); root.addView(results);
        return scroll;
    }

    private void startScan() {
        final String u = username.getText().toString().trim();
        final String p = password.getText().toString();
        scan.setEnabled(false); spinner.setVisibility(View.VISIBLE); results.removeAllViews();
        worker.submit(() -> {
            List<CameraInfo> cams = CameraScanner.scan(this, u, p, msg -> runOnUiThread(() -> status.setText(msg)));
            runOnUiThread(() -> {
                spinner.setVisibility(View.GONE); scan.setEnabled(true);
                status.setText(cams.isEmpty() ? "No compatible camera answered. Confirm the camera is online on this Wi-Fi and scan again." : "Found " + cams.size() + " compatible camera(s)." );
                for (CameraInfo c : cams) results.addView(card(c, u, p));
            });
        });
    }

    private View card(CameraInfo c, String user, String pass) {
        LinearLayout box = column();
        box.setPadding(dp(12), dp(12), dp(12), dp(12));
        box.setBackgroundColor(Color.rgb(13, 37, 25));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2); lp.setMargins(0, dp(12), 0, 0); box.setLayoutParams(lp);
        box.addView(label(c.title(), 20, true));
        add(box, "IP", c.ip); add(box, "Discovery", value(c.discovery));
        add(box, "Model", value(c.model)); add(box, "Firmware", value(c.firmware));
        add(box, "Serial / UID", !c.serial.isEmpty() ? c.serial : value(c.uid)); add(box, "MAC", value(c.mac));
        add(box, "Web port", port(c.webPort)); add(box, "Media port", port(c.mediaPort));
        add(box, "RTSP port", port(c.rtspPort)); add(box, "ONVIF port", port(c.onvifPort));
        add(box, "ONVIF device", value(c.onvifDeviceUrl));
        String main = c.bestMainRtsp(user, pass), sub = c.bestSubRtsp(user, pass);
        add(box, "WVLRP main RTSP", main); add(box, "Sub RTSP", sub);
        add(box, "Verification", !c.verifiedRtspUris.isEmpty() ? "RTSP authenticated + DESCRIBE succeeded" : (!c.onvifStreamUris.isEmpty() ? "Exact stream URI returned by ONVIF" : value(c.note)));
        Button copyRtsp = button("COPY MAIN RTSP", () -> copy("RTSP", main)); box.addView(copyRtsp);
        Button copyAll = button("COPY WVLRP CONNECTION BLOCK", () -> copy("WVLRP camera", block(c, user, pass))); box.addView(copyAll);
        return box;
    }

    private String block(CameraInfo c, String user, String pass) {
        return "CAMERA_HOST=" + c.ip + "\n" +
                "CAMERA_USERNAME=" + user + "\n" +
                "CAMERA_PASSWORD=" + pass + "\n" +
                "CAMERA_RTSP_MAIN=" + c.bestMainRtsp(user, pass) + "\n" +
                "CAMERA_RTSP_SUB=" + c.bestSubRtsp(user, pass) + "\n" +
                "CAMERA_RTSP_PORT=" + port(c.rtspPort) + "\n" +
                "CAMERA_ONVIF_HOST=" + c.ip + "\n" +
                "CAMERA_ONVIF_PORT=" + port(c.onvifPort) + "\n" +
                "CAMERA_ONVIF_DEVICE=" + c.onvifDeviceUrl + "\n" +
                "CAMERA_WEB_PORT=" + port(c.webPort) + "\n" +
                "CAMERA_MEDIA_PORT=" + port(c.mediaPort) + "\n" +
                "CAMERA_MODEL=" + c.model + "\nCAMERA_FIRMWARE=" + c.firmware + "\nCAMERA_MAC=" + c.mac + "\nCAMERA_SERIAL=" + c.serial + "\n";
    }

    private LinearLayout column() { LinearLayout x = new LinearLayout(this); x.setOrientation(LinearLayout.VERTICAL); return x; }
    private TextView label(String s, int sp, boolean bold) { TextView t = new TextView(this); t.setText(s); t.setTextSize(sp); t.setTextColor(Color.rgb(225,235,228)); if (bold) t.setTypeface(null, 1); t.setPadding(0, dp(5), 0, dp(5)); t.setTextIsSelectable(true); return t; }
    private EditText input(String hint, boolean secret) { EditText e = new EditText(this); e.setHint(hint); e.setTextColor(Color.WHITE); e.setHintTextColor(Color.GRAY); e.setSingleLine(true); if (secret) e.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD); return e; }
    private void add(LinearLayout p, String k, String v) { p.addView(label(k + "\n" + v, 13, false)); }
    private Button button(String text, Runnable r) { Button b = new Button(this); b.setText(text); b.setOnClickListener(v -> r.run()); return b; }
    private void copy(String label, String text) { ((ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText(label, text)); Toast.makeText(this, label + " copied", Toast.LENGTH_SHORT).show(); }
    private String value(String s) { return s == null || s.isEmpty() ? "—" : s; }
    private String port(int p) { return p > 0 ? Integer.toString(p) : ""; }
    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }
}
