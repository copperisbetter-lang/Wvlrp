package com.wvlrp.mobilelive

import android.Manifest
import android.app.Activity
import android.content.*
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.TextView

class MainActivity : Activity() {
    companion object {
        private const val PERMISSION_CODE = 41
        private const val OVERLAY_CODE = 42
        private const val PROJECTION_CODE = 43
    }

    private lateinit var status: TextView
    private lateinit var saveButton: Button

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val s = intent?.getStringExtra("status") ?: return
            status.text = s
            saveButton.isEnabled =
                !s.startsWith("OFFLINE") &&
                !s.startsWith("ERROR") &&
                !s.startsWith("NOT LIVE")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        status = findViewById(R.id.status)
        saveButton = findViewById(R.id.saveButton)

        findViewById<Button>(R.id.liveButton).setOnClickListener { requestAndStart() }

        findViewById<Button>(R.id.stopButton).setOnClickListener {
            stopService(Intent(this, LiveService::class.java))
            status.text = "OFFLINE"
            saveButton.isEnabled = false
        }

        saveButton.setOnClickListener {
            startService(
                Intent(this, LiveService::class.java)
                    .setAction(LiveService.ACTION_SAVE_LAST_HOUR)
            )
            status.text = "PROTECTING ROLLING VIDEO…"
        }
    }

    override fun onStart() {
        super.onStart()
        val f = IntentFilter(LiveService.ACTION_STATUS)
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(receiver, f, RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(receiver, f)
        }
    }

    override fun onStop() {
        try { unregisterReceiver(receiver) } catch (_: Exception) {}
        super.onStop()
    }

    private fun requestAndStart() {
        val p = mutableListOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= 33) p.add(Manifest.permission.POST_NOTIFICATIONS)

        val missing = p.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) {
            requestPermissions(missing.toTypedArray(), PERMISSION_CODE)
        } else {
            requestOverlayThenProjection()
        }
    }

    override fun onRequestPermissionsResult(
        code: Int,
        permissions: Array<out String>,
        results: IntArray
    ) {
        super.onRequestPermissionsResult(code, permissions, results)
        if (
            code == PERMISSION_CODE &&
            results.isNotEmpty() &&
            results.all { it == PackageManager.PERMISSION_GRANTED }
        ) {
            requestOverlayThenProjection()
        } else {
            status.text = "Camera + microphone permission required"
        }
    }

    private fun requestOverlayThenProjection() {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) {
            status.text = "Allow Display over other apps so the SNAP button can stay over DoorDash/Maps."
            val i = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + packageName)
            )
            startActivityForResult(i, OVERLAY_CODE)
            return
        }
        requestProjection()
    }

    private fun requestProjection() {
        status.text = "Approve screen capture once for this live session. It is used only for SNAP stills."
        val manager = getSystemService(MediaProjectionManager::class.java)
        startActivityForResult(manager.createScreenCaptureIntent(), PROJECTION_CODE)
    }

    @Deprecated("Activity result API retained for the small beta app")
    override fun onActivityResult(code: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(code, resultCode, data)

        when (code) {
            OVERLAY_CODE -> {
                if (Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(this)) {
                    requestProjection()
                } else {
                    status.text = "Display-over-apps permission is required for the floating SNAP button."
                }
            }

            PROJECTION_CODE -> {
                if (resultCode == RESULT_OK && data != null) {
                    startLive(resultCode, data)
                } else {
                    status.text = "Screen-capture permission is required for SNAP. Live was not started."
                }
            }
        }
    }

    private fun startLive(projectionResultCode: Int, projectionData: Intent) {
        val i = Intent(this, LiveService::class.java)
            .putExtra(LiveService.EXTRA_PROJECTION_RESULT_CODE, projectionResultCode)
            .putExtra(LiveService.EXTRA_PROJECTION_DATA, projectionData)

        if (Build.VERSION.SDK_INT >= 26) startForegroundService(i) else startService(i)
        status.text = "CONNECTING"
        saveButton.isEnabled = true
    }
}
